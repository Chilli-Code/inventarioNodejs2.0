const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { isAuthenticated } = require('../middleware/auth');
const Venta = require('../models/Sell'); // Asegúrate que la ruta al modelo esté bien
const { getDashboardData } = require('../controllers/dashboardController');
const SubUser = require('../models/subUsuers'); 
const User = require('../models/User');
const { getUserDashboardData } = require('../controllers/userDashboardController');
const Gasto = require('../models/expenses');

// Ruta protegida /home
router.get('/home', isAuthenticated, async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  console.log('Usuario en sesión:', req.session.user);

  const hasSeenWelcomeAnimation = req.session.hasSeenWelcomeAnimation || false;
  req.session.hasSeenWelcomeAnimation = true;

  try {
    let allUsers = [];
    let allReceipts = [];

    if (req.session.user && req.session.user.role === 'admin') {
      // Para admin: obtén todos los recibos de todos los usuarios (como tenías)
      allUsers = await User.find({ role: 'user' }).lean();

      allReceipts = await Venta.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $limit: 50 } // traer solo los últimos 50 para no cargar mucho
      ]);

      // Orden manual en JS (porque fechaa es string)
      function parseFecha(fechaStr) {
        if (!fechaStr) return new Date(0);
        const [fecha, hora] = fechaStr.split(' - ');
        const [dia, mes, anio] = fecha.split('/');
        return new Date(`${anio}-${mes}-${dia}T${hora}`);
      }

      allReceipts.sort((a, b) => parseFecha(b.fechaa) - parseFecha(a.fechaa));
    }

    // Para usuarios normales: traer todos sus recibos ordenados por fecha DESC
    const userId = req.session.user.id;

    let ventas = await Venta.find({ user: userId })
      .populate('productos.productoVenta')
      .lean();

    // Función para convertir la fecha string a Date
    function parseFecha(fechaStr) {
      if (!fechaStr) return new Date(0);
      const [fecha, hora] = fechaStr.split(' - ');
      const [dia, mes, anio] = fecha.split('/');
      return new Date(`${anio}-${mes}-${dia}T${hora}`);
    }

    // Ordenar ventas manualmente por fecha descendente
    ventas.sort((a, b) => parseFecha(b.fechaa) - parseFecha(a.fechaa));

    // Ya tienes *todos* los recibos del usuario ordenados

    req.session.save((err) => {
      if (err) console.error('Error saving session:', err);

      res.render('home', {
        title: 'Keku Inventory || Inicio',
        currentOption: "/home",
        imageUrl: null,
        titleMain: "Inicio",
        user: req.session.user,
        username: req.session.user.nombre,
        allUsers,
        allReceipts,
        hasSeenWelcomeAnimation,
        ventas // TODOS los recibos del usuario ordenados
      });
    });
  } catch (err) {
    console.error('Error cargando datos:', err);
    res.status(500).send('Error al cargar la página');
  }
});


// GET /products
router.get('/products', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const orderBy = req.query.orderBy || 'producto';
    const order = req.query.order === 'desc' ? -1 : 1;
    const perPage = 15;
    const page = parseInt(req.query.page) || 1;

    const totalProducts = await Product.countDocuments({ user: userId });
    const products = await Product.find({ user: userId })
      .sort({ [orderBy]: order })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean();

    const totalPages = Math.ceil(totalProducts / perPage);
    const success = req.flash("success");
    const error = req.flash("error");

    res.render('products', {
      title: 'Keku Inventory || Productos',
      data: products,
      orderBy,
      order: req.query.order || 'asc',
      titleMain: "Lista De Productos",
      success: success.length ? success[0] : null,
      error: error.length ? error[0] : null,
      currentOption: "/products",
      imageUrl: null,
      user: req.session.user,
      currentPage: page,
      totalProducts,
      totalPages
    });
  } catch (err) {
    console.error('Error cargando productos:', err);
    res.status(500).send('Error interno del servidor');
  }
});


router.get('/sell', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const products = await Product.find({ user: userId }).lean();

        // Buscar vendedores (subusuarios)
    let vendedores = await SubUser.find({ parentUser: userId, tipo: 'vendedor' }).lean();

    // Si no hay vendedores, usar el usuario normal como vendedor
if (vendedores.length === 0) {
  // Si no hay subusuarios, agregamos el usuario global como "vendedor"
  vendedores = [{ _id: userId, nombre: req.session.user.nombre }];
}

    const success = req.flash("success");
    res.render('sell', {
      title: 'Keku Inventory || Venta',
      products,
      titleMain: "Formulario de Venta",
      success: success.length ? success[0] : null,
      currentOption: "/sell",
      imageUrl: null,
      user: req.session.user,
      vendedores 
    });
  } catch (err) {
    console.error('Error cargando productos en /sell:', err);
    res.status(500).send('Error interno del servidor');
  }
});


// POST: Guardar venta y redirigir al recibo con el id de la venta
router.post('/receipt_page', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { items, medio, nombrecliente, identificacionCliente, fechaa, codigo, vendedor } = req.body;


    const productos = [];
    const itemsParsed = JSON.parse(items);

    for (const item of itemsParsed) {
      const producto = await Product.findOne({ _id: item.productoVenta, user: userId });

      productos.push({
        productoVenta: producto ? producto._id : null, // opcional
        nombreProducto: producto ? producto.producto : item.nombreProducto,
        precioVenta: producto ? producto.precio : item.precioVenta,
        cantidadVenta: item.cantidadVenta
      });

      if (producto) {
        producto.cantidad -= item.cantidadVenta;
        producto.ventas += item.cantidadVenta;
        if (producto.cantidad <= 0) {
          producto.estado = 'Agotado';
          producto.cantidad = 0;
        }
        await producto.save();
      }
    }

    const total = productos.reduce((sum, item) => sum + item.precioVenta * item.cantidadVenta, 0);

    // Aquí buscamos el nombre del vendedor:
    let nombreVendedor;

    if (vendedor === userId) {
      // El vendedor es el usuario global
      nombreVendedor = req.session.user.nombre;
    } else {
      // Buscamos en SubUser
      const subUser = await SubUser.findById(vendedor).lean();
      nombreVendedor = subUser ? subUser.nombre : 'Vendedor desconocido';
    }

    const venta = await Venta.create({
      productos,
      total,
      medio,
      nombrecliente,
      identificacionCliente,
      fechaa,
      codigo,
      vendedor: nombreVendedor, // guardamos el nombre directamente
      user: userId
    });

    res.redirect(`/receipt_page/${venta._id}`);
  } catch (err) {
    console.error('Error al guardar venta múltiple:', err);
    res.status(500).send('Error interno al guardar la venta');
  }
});



// GET: Mostrar la página de recibo con el id de la venta
router.get('/receipt_page/:idVenta', isAuthenticated, async (req, res) => {
  try {
    const sessionUser = req.session.user;
    const userId = sessionUser.id || sessionUser._id;
    const isAdmin = sessionUser.role === 'admin';

    const query = isAdmin
      ? { _id: req.params.idVenta }
      : { _id: req.params.idVenta, user: userId };

    const ventaConProducto = await Venta.findOne(query)
      .populate('productos.productoVenta')
      .populate('vendedor')
      .populate('user') // 🔥 importante
      .lean();

    if (!ventaConProducto) return res.status(404).send('Recibo no encontrado');

    // 🔥 Aquí usamos el user dueño de la venta
    const userDueño = ventaConProducto.user;

    res.render('receipt_page', {
      title: 'Recibo || Pago',
      venta: ventaConProducto,
      currentOption: '/sell',
      imageUrl: null,
      user: userDueño, // ✅ usuario correcto
      titleMain: 'Recibo Pago',
      success: null
    });
  } catch (err) {
    console.error('Error cargando recibo:', err);
    res.status(500).send('Error interno al cargar el recibo');
  }
});

// GET productos activos por nombre
router.get('/api/productos/activos', isAuthenticated, async (req, res) => {
  const { q } = req.query;
  const userId = req.session.user.id; // Obtén el ID del usuario autenticado

  try {
    const productos = await Product.find({
      estado: 'Activo',
      user: userId,  // Filtra por el ID del usuario
      producto: { $regex: q || '', $options: 'i' }
    }).limit(10).lean();

    res.json(productos);
  } catch (err) {
    console.error('Error buscando productos activos:', err);
    res.status(500).json({ error: 'Error buscando productos' });
  }
});


// DELETE /user/receipts/:id -> solo el dueño puede eliminar
router.delete('/user/receipts/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Venta.findById(id);
    if (!receipt) return res.status(404).json({ message: 'Recibo no encontrado' });

    // Solo el dueño puede borrar
    if (receipt.user.toString() !== req.session.user.id) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar este recibo' });
    }

    // 🔹 Revertir las ventas de cada producto
    for (const item of receipt.productos) {
      if (item.productoVenta) {
        await Product.findByIdAndUpdate(
          item.productoVenta,
          {
            $inc: {
              ventas: -item.cantidadVenta, // restar ventas
              cantidad: +item.cantidadVenta // devolver stock si quieres
            }
          }
        );
      }
    }

    await receipt.deleteOne();

    res.json({ message: 'Recibo eliminado y ventas actualizadas correctamente' });

  } catch (err) {
    console.error('Error al eliminar recibo:', err);
    res.status(500).json({ message: 'Error interno al eliminar el recibo' });
  }
});



router.get('/notifications', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const success = req.flash("success"); // Asegúrate de declarar success

    res.render('notifications', {
      title: 'Keku Inventory || Notificaciones',
      titleMain: "Notificaciones",
      success: success.length ? success[0] : null,
      currentOption: "/notifications",
      imageUrl: null,
      user: req.session.user,
    });
  } catch (err) {
    console.error('Error obteniendo notificaciones:', err);
    res.status(500).json({ error: 'Error obteniendo notificaciones' });
  }
});


// Ruta que decide qué controlador usar según el rol del usuario
// router.get('/statistics', isAuthenticated, getDashboardData);

router.get('/statistics', isAuthenticated, (req, res) => {
  const user = req.session.user;
  
  if (user.role === 'admin') {
    return getDashboardData(req, res);
  } else if (user.role === 'user') {
    return getUserDashboardData(req, res);
  } else {
    return res.status(403).send('Acceso denegado');
  }
});

// Perfil del usuario normal (solo lectura)
router.get('/my-profile', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    
    if (user.role !== 'user') {
      return res.redirect('/statistics');
    }

    const mongoose = require('mongoose');
    const userId = new mongoose.Types.ObjectId(user.id);


    // Información del usuario
    const usuario = await User.findById(user.id);
    // Total de gastos
    const totalGastos = await Gasto.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$monto' } } }
    ]);
    // Estadísticas
    const totalProductos = await Product.countDocuments({ user: userId });
    const productosActivos = await Product.countDocuments({ user: userId, estado: 'Activo' });
    const productosAgotados = await Product.countDocuments({ user: userId, estado: 'Agotado' });

    const totalVentas = await Venta.countDocuments({ user: userId });
    
    const ingresosTotales = await Venta.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalIngresos = ingresosTotales.length > 0 ? ingresosTotales[0].total : 0;

    const clientesUnicos = await Venta.distinct('identificacionCliente', {
      user: userId,
      identificacionCliente: { $ne: null, $ne: '', $exists: true }
    });

    const categorias = await Product.distinct('categoria', { user: userId });

    // Valor del inventario
    const valorInventario = await Product.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          valorTotal: { $sum: { $multiply: ['$cantidad', '$precio'] } },
          totalUnidades: { $sum: '$cantidad' }
        }
      }
    ]);

    const inventarioTotal = valorInventario.length > 0 ? valorInventario[0].valorTotal : 0;
    const unidadesTotales = valorInventario.length > 0 ? valorInventario[0].totalUnidades : 0;

    // Subusuarios
    const subUsuarios = await SubUser.find({ parentUser: userId });

    // Top 5 productos
    const topProductos = await Venta.aggregate([
      { $match: { user: userId } },
      { $unwind: '$productos' },
      {
        $lookup: {
          from: 'products',
          localField: 'productos.productoVenta',
          foreignField: '_id',
          as: 'productoInfo'
        }
      },
      { $unwind: '$productoInfo' },
      {
        $group: {
          _id: '$productoInfo.producto',
          totalVendido: { $sum: '$productos.cantidadVenta' },
          ingresos: { $sum: { $multiply: ['$productos.cantidadVenta', '$productos.precioVenta'] } }
        }
      },
      { $sort: { totalVendido: -1 } },
      { $limit: 5 }
    ]);
    
    // Subusuarios con estadísticas
function parseFecha(fechaStr) {
  // Convierte "23/09/2025 - 20:30:45" a un objeto Date
  const [fecha, hora] = fechaStr.split(' - ');
  const [dia, mes, anio] = fecha.split('/');

  // Crear string ISO válido: "2025-09-23T20:30:45"
  const fechaIso = `${anio}-${mes}-${dia}T${hora}`;

  return new Date(fechaIso);
}

// Obtener estadísticas de ventas para cada subusuario
const subUsuariosConStats = await Promise.all(
  subUsuarios.map(async (sub) => {
    const ventasSub = await Venta.find({ vendedor: sub.nombre }).lean();

    const ventasOrdenadas = ventasSub
      .filter(v => v.fechaa) // Asegurarse que tiene fecha
      .map(v => ({
        ...v,
        fechaParsed: parseFecha(v.fechaa)
      }))
      .filter(v => v.fechaParsed instanceof Date && !isNaN(v.fechaParsed)) // Validar que sea fecha válida
      .sort((a, b) => b.fechaParsed - a.fechaParsed); // Ordenar descendente

    const ultimaVenta = ventasOrdenadas[0];

    return {
      ...sub.toObject(),
      totalVentas: ventasSub.length,
      ultimaVenta: ultimaVenta ? ultimaVenta.fechaa : null
    };
  })
);

    // Últimas ventas
function parseFecha(fechaStr) {
  if (!fechaStr) return new Date(0); // fallback para fechas inválidas
  const [fecha, hora] = fechaStr.split(' - ');
  const [dia, mes, anio] = fecha.split('/');
  return new Date(`${anio}-${mes}-${dia}T${hora}`);
}

let ultimasVentas = await Venta.find({ user: userId })
  .select('fechaa nombrecliente total medio codigo')
  .lean();

ultimasVentas = ultimasVentas
  .map(v => ({
    ...v,
    fechaParsed: parseFecha(v.fechaa)
  }))
  .filter(v => !isNaN(v.fechaParsed)) // quitar fechas inválidas
  .sort((a, b) => b.fechaParsed - a.fechaParsed) // descendente
  .slice(0, 10); // tomar solo 10


    res.render('my-profile', {
      title: 'Mi Perfil',
      titleMain: 'Mi Perfil',
      currentOption: '/my-profile',
      user,
      imageUrl: null,
      usuario,
      totalProductos,
      productosActivos,
      productosAgotados,
      totalVentas,
      totalIngresos,
      clientesUnicos: clientesUnicos.length,
      categorias,
      inventarioTotal,
      unidadesTotales,
      subUsuarios,
      topProductos,
      ultimasVentas,
      totalGastos: totalGastos[0]?.total || 0,
      subUsuarios: subUsuariosConStats
    });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Error al cargar perfil');
  }
});
module.exports = router;

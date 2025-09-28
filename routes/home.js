const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { isAuthenticated } = require('../middleware/auth');
const Venta = require('../models/Sell'); // Asegúrate que la ruta al modelo esté bien
const { getDashboardData } = require('../controllers/dashboardController');
const SubUser = require('../models/subUsuers'); 
const User = require('../models/User');


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
    let allReceipts = []; // AGREGAR ESTA LÍNEA
    
    if (req.session.user && req.session.user.role === 'admin') {
      // Obtener usuarios
      allUsers = await User.find({ role: 'user' }).lean();
      
      // AGREGAR: Obtener TODOS los recibos para admin
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
        { $sort: { fechaa: -1 } }
      ]);
    }

    // Obtener las últimas ventas del usuario actual (para usuarios no-admin)
    const ventas = await Venta.find({ user: req.session.user.id })
      .sort({ fechaa: -1 })
      .populate('productos.productoVenta')
      .lean();

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
        allReceipts, // AGREGAR ESTA LÍNEA
        hasSeenWelcomeAnimation: hasSeenWelcomeAnimation,
        ventas
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
    const { items, medio, nombrecliente, fechaa, codigo, vendedor } = req.body;

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

router.get('/statistics', isAuthenticated, getDashboardData);


module.exports = router;

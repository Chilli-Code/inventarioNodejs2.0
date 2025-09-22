const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { isAuthenticated } = require('../middleware/auth');
const Venta = require('../models/Sell'); // Asegúrate que la ruta al modelo esté bien
const { getDashboardData } = require('../controllers/dashboardController');
const SubUser = require('../models/subUsuers'); 



// Ruta protegida /home
router.get('/home', isAuthenticated, async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  console.log('Usuario en sesión:', req.session.user);

  const hasSeenWelcomeAnimation = req.session.hasSeenWelcomeAnimation || false;
  req.session.hasSeenWelcomeAnimation = true;

  try {
    // 🔹 Obtener las últimas 4 ventas del usuario actual
    const ventas = await Venta.find({ user: req.session.user.id })
      .sort({ fechaa: -1 })
      // .limit(4)
      .populate('productos.productoVenta') // trae info del producto
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
        hasSeenWelcomeAnimation: hasSeenWelcomeAnimation,
        ventas // 👈 pasamos ventas a la vista
      });
    });
  } catch (err) {
    console.error('Error cargando ventas:', err);
    res.status(500).send('Error al cargar ventas');
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
    const userId = req.session.user.id;
const ventaConProducto = await Venta.findOne({ _id: req.params.idVenta, user: userId })
  .populate('productos.productoVenta')
  .populate('vendedor')  // <-- esto trae el subusuario vendedor completo
  .lean();

    if (!ventaConProducto) return res.status(404).send('Recibo no encontrado');
    res.render('receipt_page', {
      title: 'Recibo || Pago',
      venta: ventaConProducto,
      currentOption: '/sell',
      imageUrl: null,
      user: req.session.user,
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






router.get('/statistics', isAuthenticated, getDashboardData);


module.exports = router;

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { isAuthenticated } = require('../middleware/auth');
const Venta = require('../models/Sell'); // Asegúrate que la ruta al modelo esté bien
const { getDashboardData } = require('../controllers/dashboardController');



// Ruta protegida /home
router.get('/home', isAuthenticated, (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  console.log('Usuario en sesión:', req.session.user);
  const hasSeenWelcomeAnimation = req.session.hasSeenWelcomeAnimation || false;
  req.session.hasSeenWelcomeAnimation = true;
  req.session.save((err) => {
    if (err) {
      console.error('Error saving session:', err);
    }
  res.render('home', {
    title: 'Inicio',
    currentOption: "/home",
    imageUrl: null,
    titleMain: "Inicio",
    user: req.session.user,
    username: req.session.user.nombre,
    hasSeenWelcomeAnimation: hasSeenWelcomeAnimation
    });
  });
});




router.get('/products', isAuthenticated, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // 1. Obtener productos de MongoDB
    const products = await Product.find().lean(); // `lean()` para pasar objetos planos a EJS

    // 2. Ordenar (si se proporciona por query)
    const orderBy = req.query.orderBy || 'producto';
    const order = req.query.order === 'desc' ? -1 : 1;

    products.sort((a, b) => {
      if (a[orderBy] < b[orderBy]) return -1 * order;
      if (a[orderBy] > b[orderBy]) return 1 * order;
      return 0;
    });

    // 3. Flash message
    const success = req.flash("success");

    // 4. Renderizar la vista con productos reales
    res.render('products', {
      title: 'Inventario || Producto',
      data: products,
      orderBy,
      order: req.query.order || 'asc',
      titleMain: "Lista De Productos",
      success: success.length ? success[0] : null,
      currentOption: "/products",
      imageUrl: null,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error cargando productos:', err);
    res.status(500).send('Error interno del servidor');
  }
});


router.get('/sell', isAuthenticated, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const products = await Product.find().lean(); // <- aquí obtienes productos

    const success = req.flash("success");

    res.render('sell', {
      title: 'Inventario || Producto',
      products, // 👈 aquí le pasas como "products"
      titleMain: "Formulario de Venta",
      success: success.length ? success[0] : null,
      currentOption: "/sell",
      imageUrl: null,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error cargando productos en /sell:', err);
    res.status(500).send('Error interno del servidor');
  }
});


// POST: Guardar venta y redirigir al recibo con el id de la venta
router.post('/receipt_page', isAuthenticated, async (req, res) => {
  try {
    const {
      items,
      medio,
      nombrecliente,
      fechaa,
      codigo,
      vendedor
    } = req.body;

    const productos = JSON.parse(items);
    const total = productos.reduce((sum, item) => sum + item.precioVenta * item.cantidadVenta, 0);

    // Crear la venta
    const venta = await Venta.create({
      productos,
      total,
      medio,
      nombrecliente,
      fechaa,
      codigo,
      vendedor
    });

    // 🔄 Actualizar productos vendidos
    for (const item of productos) {
      const producto = await Product.findById(item.productoVenta);

      if (producto) {
        // Restar cantidad vendida
        producto.cantidad -= item.cantidadVenta;

        // Aumentar ventas
        producto.ventas += item.cantidadVenta;

        // Cambiar estado si cantidad <= 0
        if (producto.cantidad <= 0) {
          producto.estado = 'Agotado';
          producto.cantidad = 0; // Evitar números negativos
        }

        await producto.save();
      }
    }

    res.redirect(`/receipt_page/${venta._id}`);
  } catch (err) {
    console.error('Error al guardar venta múltiple:', err);
    res.status(500).send('Error interno al guardar la venta');
  }
});



// GET: Mostrar la página de recibo con el id de la venta
router.get('/receipt_page/:idVenta', isAuthenticated, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const { idVenta } = req.params;

    // Buscar la venta por id y popular el producto
    const ventaConProducto = await Venta.findById(idVenta)
      .populate('productos.productoVenta')
      .lean();

    if (!ventaConProducto) {
      return res.status(404).send('Recibo no encontrado');
    }

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
  try {
    const productos = await Product.find({
      estado: 'Activo',
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

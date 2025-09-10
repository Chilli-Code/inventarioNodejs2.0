const Venta = require('../models/Sell');
const Product = require('../models/Product');

async function getDashboardData(req, res) {
  try {
    // Prevenir caché
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // 1. Total de productos
    const totalProductos = await Product.countDocuments();

    // 2. Total de categorías
    const categorias = await Product.distinct('categoria');
    const totalCategorias = categorias.length;

    // 3. Total de clientes únicos
    const clientesUnicos = await Venta.distinct('nombrecliente', {
      nombrecliente: { $ne: null, $ne: '' }
    });
    const totalClientes = clientesUnicos.length;

    // 4. Top 5 productos más vendidos
    const topVentas = await Venta.aggregate([
      { $unwind: '$productos' },
      {
        $group: {
          _id: '$productos.productoVenta',
          totalCantidad: { $sum: '$productos.cantidadVenta' }
        }
      },
      { $sort: { totalCantidad: -1 } },
      { $limit: 5 }
    ]);

    const productosConNombre = await Product.find({
      _id: { $in: topVentas.map(p => p._id) }
    });

    const topProductos = topVentas.map(venta => {
      const producto = productosConNombre.find(p => p._id.toString() === venta._id.toString());
      return {
        nombre: producto ? producto.producto : 'Desconocido',
        cantidad: venta.totalCantidad
      };
    });

    const topProductosNombres = topProductos.map(p => p.nombre);
    const topProductosCantidades = topProductos.map(p => p.cantidad);

    // 5. Gráfica de categorías
    const categoriaVentas = await Venta.aggregate([
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
          _id: '$productoInfo.categoria',
          totalVendidos: { $sum: '$productos.cantidadVenta' }
        }
      },
      { $sort: { totalVendidos: -1 } }
    ]);

    const catLabels = categoriaVentas.map(c => c._id || 'Sin Categoría');
    const catData = categoriaVentas.map(c => c.totalVendidos);

    // 6. Gráfica de clientes
    const clienteVentas = await Venta.aggregate([
      {
        $match: {
          nombrecliente: { $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$nombrecliente',
          totalComprado: { $sum: '$total' }
        }
      },
      { $sort: { totalComprado: -1 } },
      { $limit: 5 }
    ]);

    const clientLabels = clienteVentas.map(c => c._id || 'Sin Nombre');
    const clientData = clienteVentas.map(c => c.totalComprado);

    // Animación de bienvenida
    const hasSeenWelcomeAnimation = req.session.hasSeenWelcomeAnimation || false;
    req.session.hasSeenWelcomeAnimation = true;
const categoriasDisponibles = await Product.distinct('categoria');
    // Renderizar vista
    req.session.save(err => {
      if (err) console.error('Error saving session:', err);

      res.render('statistics', {
        title: "Inventario || Estadísticas",
        currentOption: "/statistics",
        titleMain: "Estadísticas",
        imageUrl: null,
        user: req.session.user,
        username: req.session.user?.nombre || "Usuario",
        hasSeenWelcomeAnimation,

        // Estadísticas generales
        totalProductos,
        totalCategorias,
        totalClientes,

        // Gráficas
        topProductosNombres,
        topProductosCantidades,
        catLabels,
        catData,
        clientLabels,
        clientData,
        categoriasDisponibles
      });
    });

  } catch (err) {
    console.error('Error al obtener datos del dashboard:', err);
    res.status(500).send('Error al cargar el dashboard');
  }
}

module.exports = {
  getDashboardData
};

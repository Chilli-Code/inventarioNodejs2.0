// controllers/userDashboardController.js
const Venta = require('../models/Sell');
const Product = require('../models/Product');

async function getUserDashboardData(req, res) {
  try {
    const user = req.session.user;
    if (!user) return res.redirect('/signin');

    // filtro de ventas solo para ese user
    const ventaFilter = { user: user.id };

    // Ventas por categoría
    const categoriaVentas = await Venta.aggregate([
      { $match: ventaFilter },
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
      { $match: { 'productoInfo.user': user.id } },
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

    // Render vista ejs
    res.render('../views/partials/statistics/charts/categorias', {
      title: "Mis Estadísticas",
      user,
      catLabels,
      catData
    });

  } catch (err) {
    console.error('Error al obtener dashboard de usuario:', err);
    res.status(500).send('Error al cargar tus estadísticas');
  }
}

module.exports = { getUserDashboardData };

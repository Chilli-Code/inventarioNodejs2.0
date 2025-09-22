const Venta = require('../models/Sell');
const Product = require('../models/Product');
const User = require('../models/User');
const SubUser = require('../models/subUsuers');

async function getDashboardData(req, res) {
  try {
    const user = req.session.user;
    const isAdmin = user.role === 'admin';

    // filtros
    const ventaFilter = isAdmin ? {} : { user: user.id };
    const productoFilter = isAdmin ? {} : { user: user.id };

    // 1. Total de productos
    const totalProductos = await Product.countDocuments(productoFilter);

    // 2. Total de categorías
    const categorias = await Product.distinct('categoria', productoFilter);
    const totalCategorias = categorias.length;

    // 3. Total de clientes únicos
    const clientesUnicos = await Venta.distinct('nombrecliente', {
      ...ventaFilter,
      nombrecliente: { $ne: null, $ne: '' }
    });
    const totalClientes = clientesUnicos.length;

    // 4. Total de subusuarios
    const subUserFilter = isAdmin ? {} : { parentUser: user.id };
    const totalSubUsuarios = await SubUser.countDocuments(subUserFilter);

    // 5. Top productos
    const topVentas = await Venta.aggregate([
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
      { $match: isAdmin ? {} : { 'productoInfo.user': user.id } },
      {
        $group: {
          _id: '$productos.productoVenta',
          totalCantidad: { $sum: '$productos.cantidadVenta' }
        }
      },
      { $sort: { totalCantidad: -1 } },
      { $limit: 5 }
    ]);

    // Obtener los nombres de los productos
    const productosConNombre = await Product.find({
      _id: { $in: topVentas.map(p => p._id) },
      ...productoFilter
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

    // 6. Gráfico por categorías
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
      { $match: isAdmin ? {} : { 'productoInfo.user': user.id } },
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

    // 7. Gráfico de clientes
    const clienteVentas = await Venta.aggregate([
      {
        $match: {
          ...ventaFilter,
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

    // 8. Ventas por usuario (solo admin) - *** CORREGIDO ***
    let salesByUser = [];
    if (isAdmin) {
      salesByUser = await Venta.aggregate([
        {
          $group: {
            _id: '$user', // campo de referencia al usuario que hizo la venta
            totalVentas: { $sum: '$total' },
            cantidadVentas: { $sum: 1 },
             cantidadRecibos: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'users', // nombre de la colección de usuarios
            localField: '_id',
            foreignField: '_id',
            as: 'user' // *** CAMBIO: usar 'user' en lugar de 'userInfo' ***
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } } // *** CAMBIO: usar 'user' ***
      ]);
    }

    // 9. Lista de usuarios (para admin)
    const usuarios = await User.find({ role: 'user' }).lean();

    // Animación de bienvenida
    const hasSeenWelcomeAnimation = req.session.hasSeenWelcomeAnimation || false;
    req.session.hasSeenWelcomeAnimation = true;

    const categoriasDisponibles = await Product.distinct('categoria', productoFilter);
    const allUsers = await User.find({ role: 'user' }).lean();
    
    req.session.save(err => {
      if (err) console.error('Error saving session:', err);

      res.render('statistics', {
        title: "Inventario || Estadísticas",
        currentOption: "/statistics",
        titleMain: "Estadísticas",
        imageUrl: null,
        user,
        username: user.nombre || "Usuario",
        hasSeenWelcomeAnimation,
        totalProductos,
        totalCategorias,
        totalClientes,
        topProductosNombres,
        topProductosCantidades,
        catLabels,
        catData,
        clientLabels,
        clientData,
        categoriasDisponibles,
        usuarios,
        totalSubUsuarios,
        salesByUser,
        allUsers,
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
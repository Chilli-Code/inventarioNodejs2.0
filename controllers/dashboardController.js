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
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }, // *** CAMBIO: usar 'user' ***
            {
      $addFields: {
        'active': '$user.active',
        businessName: '$user.businessName',
      }
    }
      ]);
    }

    // 9. Lista de usuarios (para admin)
    const usuarios = await User.find({ role: 'user' }).lean();


    
    // Animación de bienvenida
    const hasSeenWelcomeAnimation = req.session.hasSeenWelcomeAnimation || false;
    req.session.hasSeenWelcomeAnimation = true;

    
    const categoriasDisponibles = await Product.distinct('categoria', productoFilter);
    const allUsers = await User.find({ role: 'user' }).lean();
  const isMobile = /mobile|android|iphone|ipad/i.test(req.headers['user-agent']);
    

    //obtner el total de productos
    // 9. Usuarios con más productos (solo admin)
let productsByUser = [];
if (isAdmin) {
  
// En dashboardController.js
productsByUser = await Product.aggregate([
  {
    $lookup: {
      from: 'users',
      localField: 'user',
      foreignField: '_id',
      as: 'user'
    }
  },
  { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
  // AGREGAR: Filtrar solo usuarios con rol 'user'
  {
    $match: {
      'user.role': 'user'
    }
  },
  {
    $group: {
      _id: '$user._id',
      user: { $first: '$user' },
      totalProductos: { $sum: 1 },
      productosActivos: { 
        $sum: { $cond: [{ $eq: ['$estado', 'Activo'] }, 1, 0] } 
      },
      productosAgotados: { 
        $sum: { $cond: [{ $eq: ['$estado', 'Agotado'] }, 1, 0] } 
      },
      totalVentas: { $sum: '$ventas' },
      valorInventario: { $sum: { $multiply: ['$cantidad', '$precio'] } }
    }
  },
  { $sort: { totalProductos: -1 } }
]);
}


let clientSalesData = [];
if (isAdmin) {
// En dashboardController.js - Datos de clientes por tiempo
clientSalesData = await Venta.aggregate([
  {
    $lookup: {
      from: 'users',
      localField: 'user',
      foreignField: '_id',
      as: 'user'
    }
  },
  {
    $unwind: {
      path: '$user',
      preserveNullAndEmptyArrays: false
    }
  },
  {
    $match: {
      'user.role': 'user'
    }
  },
  {
    $addFields: {
      fechaParsed: {
        $dateFromParts: {
          year: { $toInt: { $substr: [{ $arrayElemAt: [{ $split: ["$fechaa", "/"] }, 2] }, 0, 4] } },
          month: { $toInt: { $substr: [{ $arrayElemAt: [{ $split: ["$fechaa", "/"] }, 1] }, 0, 2] } },
          day: { $toInt: { $substr: [{ $arrayElemAt: [{ $split: ["$fechaa", "/"] }, 0] }, 0, 2] } },
          hour: 12,
          minute: 0,
          second: 0
        }
      }
    }
  },
  {
    $group: {
      _id: {
        clienteId: "$user._id",
        nombre: "$user.nombre",
        businessName: "$user.businessName",
        fecha: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$fechaParsed"
          }
        },
        semana: {
          $dateToString: {
            format: "%Y-W%U",
            date: "$fechaParsed"
          }
        },
        mes: {
          $dateToString: {
            format: "%Y-%m",
            date: "$fechaParsed"
          }
        }
      },
      totalVentas: { $sum: "$total" },
      cantidadCompras: { $sum: 1 },
      fechaCompleta: { $first: "$fechaParsed" }
    }
  },
  {
    $group: {
      _id: {
        id: "$_id.clienteId"  // solo el ID en _id
      },
      nombre: { $first: "$_id.nombre" },            // 🔸 nombre fuera de _id
      businessName: { $first: "$_id.businessName" },// 🔸 businessName fuera de _id
      ventasPorDia: {
        $push: {
          fecha: "$_id.fecha",
          semana: "$_id.semana",
          mes: "$_id.mes",
          total: "$totalVentas",
          compras: "$cantidadCompras",
          fechaCompleta: "$fechaCompleta"
        }
      },
      totalCliente: { $sum: "$totalVentas" },
      totalCompras: { $sum: "$cantidadCompras" }
    }
  },
  { $sort: { totalCliente: -1 } },
  { $limit: 50 }
]);


}


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
        catLabels,
        catData,
        clientLabels,
        clientData,
        categoriasDisponibles,
        usuarios,
        totalSubUsuarios,
        salesByUser,
        allUsers,
        isMobile,
        productsByUser,
        clientSalesData
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
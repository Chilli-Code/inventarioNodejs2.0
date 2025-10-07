// controllers/userDashboardController.js
const Venta = require('../models/Sell');
const Product = require('../models/Product');
const SubUser = require('../models/subUsuers');
async function getUserDashboardData(req, res) {
  try {
    const user = req.session.user;

    // Verificar que el usuario sea de tipo 'user'
    if (user.role !== 'user') {
      return res.status(403).send('Acceso denegado');
    }

    // IMPORTANTE: Convertir el ID a ObjectId si es necesario
    const mongoose = require('mongoose');
    const userId = mongoose.Types.ObjectId.isValid(user.id) 
      ? new mongoose.Types.ObjectId(user.id) 
      : user.id;

    // console.log('👤 Usuario ID (original):', user.id);
    // console.log('👤 Usuario ID (convertido):', userId);
    // console.log('👤 Tipo de userId:', typeof userId);

    // Filtros específicos del usuario
    const ventaFilter = { user: userId };
    const productoFilter = { user: userId };
const subUserFilter = { parentUser: userId };
    // 1. Total de productos del usuario
    const totalProductos = await Product.countDocuments(productoFilter);

    // 2. Categorías del usuario
    const categorias = await Product.distinct('categoria', productoFilter);
    const totalCategorias = categorias.length;

    // 2.b Clientes únicos (asumo que el campo 'cliente' existe en Venta)
const clientesUnicos = await Venta.distinct('identificacionCliente', {
  ...ventaFilter,
  identificacionCliente: { $ne: null, $ne: '', $exists: true }
});
const totalClientes = clientesUnicos.length;

    // 3. Total de ventas del usuario
    const totalVentas = await Venta.countDocuments(ventaFilter);

    // 4. Ingresos totales del usuario
    const ingresosTotales = await Venta.aggregate([
      { $match: ventaFilter },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalIngresos = ingresosTotales.length > 0 ? ingresosTotales[0].total : 0;

    // 5. Ventas por categoría - CORREGIDO PARA CONTAR RECIBOS ÚNICOS
   // console.log('🔍 Obteniendo ventas por categoría para usuario:', user.id);
    
    // DEBUG: Verificar datos básicos primero
    const ventasDelUsuario = await Venta.find(ventaFilter).limit(5);
    //console.log('📦 Ventas encontradas para el usuario:', ventasDelUsuario.length);
    if (ventasDelUsuario.length > 0) {
      //console.log('📋 Ejemplo de venta:', JSON.stringify(ventasDelUsuario[0], null, 2));
    }
    
    const productosDelUsuario = await Product.find(productoFilter).limit(5);
    //console.log('📦 Productos encontrados para el usuario:', productosDelUsuario.length);
    if (productosDelUsuario.length > 0) {
      //console.log('📋 Ejemplo de producto:', JSON.stringify(productosDelUsuario[0], null, 2));
    }
    
    const ventasPorCategoria = await Venta.aggregate([
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
      { 
        $match: { 
          'productoInfo.user': userId  // Usar userId convertido
        } 
      },
      {
        $group: {
          _id: '$productoInfo.categoria',
          totalVentas: { $sum: '$productos.cantidadVenta' },
          totalIngresos: {
            $sum: {
              $multiply: ['$productos.cantidadVenta', '$productos.precioVenta']
            }
          },
          // CORREGIDO: Usar $addToSet para contar recibos únicos
          recibosUnicos: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          _id: 1,
          totalVentas: 1,
          totalIngresos: 1,
          // Contar el tamaño del array de recibos únicos
          cantidadRecibos: { $size: '$recibosUnicos' }
        }
      },
      { $sort: { totalIngresos: -1 } }
    ]);

    //console.log('📊 Ventas por categoría encontradas:', ventasPorCategoria.length);
    //console.log('📊 Datos:', JSON.stringify(ventasPorCategoria, null, 2));

    // 6. Top 5 productos más vendidos del usuario
    const topProductos = await Venta.aggregate([
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
      { 
        $match: { 
          'productoInfo.user': userId  // Usar userId convertido
        } 
      },
      {
        $group: {
          _id: {
            productoId: '$productos.productoVenta',
            nombre: '$productoInfo.producto',
            categoria: '$productoInfo.categoria'
          },
          totalVendido: { $sum: '$productos.cantidadVenta' },
          ingresoTotal: {
            $sum: {
              $multiply: ['$productos.cantidadVenta', '$productos.precioVenta']
            }
          }
        }
      },
      { $sort: { totalVendido: -1 } },
      { $limit: 5 }
    ]);

    // 7. Ventas por mes (últimos 12 meses)
    const ventasPorMes = await Venta.aggregate([
      { $match: ventaFilter },
      {
        $addFields: {
          fechaParsed: {
            $dateFromString: {
              dateString: {
                $concat: [
                  { $substr: [{ $arrayElemAt: [{ $split: ["$fechaa", "/"] }, 2] }, 0, 4] },
                  "-",
                  { $substr: [{ $arrayElemAt: [{ $split: ["$fechaa", "/"] }, 1] }, 0, 2] },
                  "-",
                  { $substr: [{ $arrayElemAt: [{ $split: ["$fechaa", "/"] }, 0] }, 0, 2] }
                ]
              },
              onError: new Date()
            }
          }
        }
      },
      {
        $group: {
          _id: {
            año: { $year: '$fechaParsed' },
            mes: { $month: '$fechaParsed' }
          },
          totalVentas: { $sum: '$total' },
          cantidadVentas: { $sum: 1 }
        }
      },
      { $sort: { '_id.año': 1, '_id.mes': 1 } },
      { $limit: 12 }
    ]);

    // 8. Estado del inventario
    const estadoInventario = await Product.aggregate([
      { $match: productoFilter },
      {
        $group: {
          _id: '$estado',
          cantidad: { $sum: 1 },
          valorTotal: { $sum: { $multiply: ['$cantidad', '$precio'] } }
        }
      }
    ]);


    // Obtener ventas individuales para la gráfica de timeline
const ventasIndividuales = await Venta.find(ventaFilter)
  .select('total fechaa medio nombrecliente')
  .sort({ _id: -1 })
  .limit(1000) // Últimas 1000 ventas
  .lean();

console.log('📊 Ventas individuales para timeline:', ventasIndividuales.length);
    // Contar subusuarios del usuario
const totalSubUsuarios = await SubUser.countDocuments(subUserFilter);
    
    res.render('statistics', {
      title: "Mi Dashboard - Estadísticas",
      currentOption: "/statistics",
      titleMain: "Mis Datos",
      user,
      imageUrl: null,
      username: user.nombre || "Usuario",
      businessName: user.businessName || "Mi Negocio",
      totalClientes,
      totalProductos,
      totalCategorias,
      totalVentas,
      totalIngresos,
      ventasPorCategoria,
      topProductos,
      ventasPorMes,
      estadoInventario,
      totalSubUsuarios,
      ventasIndividuales,
      categoriasDisponibles: categorias
    });

  } catch (err) {
    console.error('❌ Error al obtener datos del dashboard del usuario:', err);
    res.status(500).send('Error al cargar el dashboard');
  }
}

module.exports = {
  getUserDashboardData
};
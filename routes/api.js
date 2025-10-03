// routes/api.js
const express = require('express');
const router = express.Router();
const Venta = require('../models/Sell');
const Product = require('../models/Product');

// Middleware para verificar autenticación (asegúrate de tenerlo)
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ error: 'No autenticado' });
};

// ========== RUTA EXISTENTE: Gráfica de productos ==========
router.get('/grafica-productos', async (req, res) => {
  try {
    const { desde, hasta, categoria, top } = req.query;
    const match = {};

    if (desde || hasta) {
      match.fecha = {};
      if (desde) match.fecha.$gte = new Date(desde);
      if (hasta) match.fecha.$lte = new Date(hasta);
    }

    if (categoria) {
      const productosCategoria = await Product.find({ categoria }, '_id');
      const ids = productosCategoria.map(p => p._id.toString());
      match['productos.productoVenta'] = { $in: ids };
    }

    const topLimit = parseInt(top) || 5;

    const ventas = await Venta.aggregate([
      { $match: match },
      { $unwind: "$productos" },
      {
        $group: {
          _id: "$productos.productoVenta",
          cantidad: { $sum: "$productos.cantidadVenta" }
        }
      },
      { $sort: { cantidad: -1 } },
      { $limit: topLimit }
    ]);

    const productos = await Product.find({ _id: { $in: ventas.map(v => v._id) } });

    const response = ventas.map(v => {
      const producto = productos.find(p => p._id.toString() === v._id.toString());
      return {
        nombre: producto?.producto || "Desconocido",
        cantidad: v.cantidad
      };
    });

    res.json({
      labels: response.map(r => r.nombre),
      data: response.map(r => r.cantidad)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al generar datos de la gráfica" });
  }
});

// ========== RUTA EXISTENTE: Gráfica de categorías ==========
// Agrega esta ruta en tu archivo de rutas (o modifica la existente)
// Esta es la versión SIMPLE sin filtros de fecha

router.get('/user/categorias-simple', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    
    if (user.role !== 'user') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    console.log('👤 Obteniendo categorías para usuario:', user.id);
    
    // Pipeline SIMPLE: todas las ventas del usuario, agrupadas por categoría
    const pipeline = [
      // 1. Filtrar solo ventas del usuario
      { $match: { user: user.id } },
      
      // 2. Descomponer array de productos
      { $unwind: '$productos' },
      
      // 3. Hacer lookup con la colección de productos
      {
        $lookup: {
          from: 'products',
          localField: 'productos.productoVenta',
          foreignField: '_id',
          as: 'productoInfo'
        }
      },
      
      // 4. Descomponer el array de productoInfo
      { $unwind: '$productoInfo' },
      
      // 5. Filtrar solo productos del usuario
      { $match: { 'productoInfo.user': user.id } },
      
      // 6. Agrupar por categoría
      {
        $group: {
          _id: '$productoInfo.categoria',
          totalVentas: { $sum: '$productos.cantidadVenta' },
          totalIngresos: { 
            $sum: { 
              $multiply: [
                '$productos.cantidadVenta', 
                { $ifNull: ['$productos.precioVenta', '$productoInfo.precio'] }
              ] 
            } 
          },
          cantidadRecibos: { $addToSet: '$_id' }
        }
      },
      
      // 7. Proyectar para contar recibos
      {
        $project: {
          _id: 1,
          totalVentas: 1,
          totalIngresos: 1,
          cantidadRecibos: { $size: '$cantidadRecibos' }
        }
      },
      
      // 8. Ordenar por ingresos (mayor a menor)
      { $sort: { totalIngresos: -1 } }
    ];

    console.log('🔍 Ejecutando pipeline de agregación...');
    const ventasPorCategoria = await Venta.aggregate(pipeline);
    
    console.log('✅ Categorías encontradas:', ventasPorCategoria.length);
    console.log('📊 Datos:', JSON.stringify(ventasPorCategoria, null, 2));
    
    res.json({ ventasPorCategoria });
    
  } catch (error) {
    console.error('❌ Error al obtener categorías:', error);
    res.status(500).json({ 
      error: 'Error al obtener categorías',
      details: error.message 
    });
  }
});;

// ========== RUTA CORREGIDA: Filtrar categorías para USUARIOS NORMALES ==========
router.get('/user/categorias-filtradas', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    
    if (user.role !== 'user') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { fechaInicio, fechaFin, categoria } = req.query;
    
    console.log('📊 Filtros recibidos:', { fechaInicio, fechaFin, categoria });
    console.log('👤 Usuario ID:', user.id);
    
    // Función para convertir "DD/MM/YYYY - HH:MM:SS" a Date
    function parseFechaVenta(fechaStr) {
      try {
        // Separar fecha y hora: "26/09/2025 - 01:55:59"
        const [fechaPart] = fechaStr.split(' - ');
        const [day, month, year] = fechaPart.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } catch (e) {
        console.error('Error parseando fecha:', fechaStr, e);
        return null;
      }
    }
    
    // Obtener TODAS las ventas del usuario
    const todasLasVentas = await Venta.find({ user: user.id })
      .populate('productos.productoVenta')
      .lean();
    
    console.log('📦 Total ventas encontradas:', todasLasVentas.length);
    
    if (todasLasVentas.length === 0) {
      return res.json({ ventasPorCategoria: [] });
    }
    
    // Preparar rango de fechas si se proporcionan
    let fechaInicioDate = null;
    let fechaFinDate = null;
    
    if (fechaInicio && fechaFin) {
      fechaInicioDate = new Date(fechaInicio);
      fechaInicioDate.setHours(0, 0, 0, 0);
      
      fechaFinDate = new Date(fechaFin);
      fechaFinDate.setHours(23, 59, 59, 999);
      
      console.log('📅 Rango de fechas:', {
        inicio: fechaInicioDate.toISOString(),
        fin: fechaFinDate.toISOString()
      });
    }
    
    // Mapa para agrupar por categoría
    const categoriaMap = {};
    
    // Procesar cada venta
    todasLasVentas.forEach(venta => {
      // Parsear fecha de la venta
      const ventaDate = parseFechaVenta(venta.fechaa);
      
      if (!ventaDate) {
        console.warn('⚠️ Fecha inválida en venta:', venta._id, venta.fechaa);
        return;
      }
      
      // Filtrar por rango de fechas si se especifica
      if (fechaInicioDate && fechaFinDate) {
        if (ventaDate < fechaInicioDate || ventaDate > fechaFinDate) {
          return; // Saltar esta venta
        }
      }
      
      // Procesar cada producto en la venta
      venta.productos.forEach(prodVenta => {
        const producto = prodVenta.productoVenta;
        
        // Verificar que el producto existe y pertenece al usuario
        if (!producto || producto.user.toString() !== user.id) {
          return;
        }
        
        // Filtrar por categoría específica si se seleccionó
        if (categoria && categoria !== 'todas' && producto.categoria !== categoria) {
          return;
        }
        
        const cat = producto.categoria || 'Sin categoría';
        
        // Inicializar categoría si no existe
        if (!categoriaMap[cat]) {
          categoriaMap[cat] = {
            _id: cat,
            totalVentas: 0,
            totalIngresos: 0,
            cantidadRecibos: 0,
            recibosUnicos: new Set()
          };
        }
        
        // Acumular valores
        categoriaMap[cat].totalVentas += prodVenta.cantidadVenta || 0;
        categoriaMap[cat].totalIngresos += (prodVenta.cantidadVenta || 0) * (prodVenta.precioVenta || producto.precio || 0);
        
        // Contar recibos únicos por categoría
        const ventaId = venta._id.toString();
        if (!categoriaMap[cat].recibosUnicos.has(ventaId)) {
          categoriaMap[cat].recibosUnicos.add(ventaId);
          categoriaMap[cat].cantidadRecibos += 1;
        }
      });
    });
    
    // Convertir mapa a array y limpiar Sets
    const ventasPorCategoria = Object.values(categoriaMap)
      .map(({ recibosUnicos, ...rest }) => rest)
      .sort((a, b) => b.totalIngresos - a.totalIngresos);
    
    console.log('✅ Categorías procesadas:', ventasPorCategoria);
    
    res.json({ ventasPorCategoria });
    
  } catch (error) {
    console.error('❌ Error al filtrar categorías:', error);
    res.status(500).json({ 
      error: 'Error al filtrar categorías',
      details: error.message 
    });
  }
});


// Ruta para obtener productos vendidos con filtros
router.get('/user/productos-vendidos', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    
    if (user.role !== 'user') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const mongoose = require('mongoose');
    const userId = mongoose.Types.ObjectId.isValid(user.id) 
      ? new mongoose.Types.ObjectId(user.id) 
      : user.id;

    const { fechaInicio, fechaFin, categoria } = req.query;
    
    let ventaFilter = { user: userId };
    
    // Filtro de fechas (si aplica)
    if (fechaInicio && fechaFin) {
      // Aquí necesitarías convertir las fechas del formato DD/MM/YYYY
      // Por simplicidad, puedes hacer el filtro después de obtener los datos
    }

    // Pipeline de agregación
    let pipeline = [
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
      { $match: { 'productoInfo.user': userId } }
    ];

    // Filtro por categoría
    if (categoria) {
      pipeline.push({ 
        $match: { 'productoInfo.categoria': categoria } 
      });
    }

    // Agrupar por producto
    pipeline.push(
      {
        $group: {
          _id: '$productos.productoVenta',
          nombre: { $first: '$productoInfo.producto' },
          categoria: { $first: '$productoInfo.categoria' },
          cantidadVendida: { $sum: '$productos.cantidadVenta' },
          ingresoTotal: { 
            $sum: { 
              $multiply: ['$productos.cantidadVenta', '$productos.precioVenta'] 
            } 
          }
        }
      },
      { $sort: { cantidadVendida: -1 } }
    );

    const productos = await Venta.aggregate(pipeline);
    
    // Filtrar por fechas en JavaScript si se proporcionan
    let productosFiltrados = productos;
    if (fechaInicio && fechaFin) {
      // Aquí puedes agregar lógica adicional de filtrado por fechas
      // si es necesario procesar las fechas del formato DD/MM/YYYY
    }
    
    res.json({ productos: productosFiltrados });
    
  } catch (error) {
    console.error('Error al obtener productos vendidos:', error);
    res.status(500).json({ 
      error: 'Error al obtener productos',
      details: error.message 
    });
  }
});

module.exports = router;
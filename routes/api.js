// routes/api.js o en tu controlador de productos
const express = require('express');
const router = express.Router();
const Venta = require('../models/Sell');
const Product = require('../models/Product');

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


// routes/api.js
router.get('/grafica-categorias', async (req, res) => {
  try {
    const { desde, hasta, categoria } = req.query;

    const matchStage = {};

    // 🗓 Filtro por fecha
    if (desde || hasta) {
      matchStage.fechaa = {};

      if (desde) {
        matchStage.fechaa.$gte = new Date(desde);
      }

      if (hasta) {
        // Sumar 1 día para incluir el final del día
        const hastaDate = new Date(hasta);
        hastaDate.setDate(hastaDate.getDate() + 1);
        matchStage.fechaa.$lt = hastaDate;
      }
    }

    // 🏷 Filtro por categoría (si no es "todas")
    if (categoria && categoria !== "todas") {
      const productosCategoria = await Product.find({ categoria }, '_id');
      const ids = productosCategoria.map(p => p._id);

      if (!ids.length) {
        return res.json({ labels: [], data: [] });
      }

      matchStage['productos.productoVenta'] = { $in: ids };
    }

    const pipeline = [
      { $match: matchStage },
      { $unwind: "$productos" },
      {
        $lookup: {
          from: "products",
          localField: "productos.productoVenta",
          foreignField: "_id",
          as: "producto"
        }
      },
      { $unwind: "$producto" },
      {
        $group: {
          _id: "$producto.categoria",
          totalCantidad: { $sum: "$productos.cantidadVenta" }
        }
      },
      { $sort: { totalCantidad: -1 } }
    ];

    const ventasPorCategoria = await Venta.aggregate(pipeline);

    if (!ventasPorCategoria.length) {
      return res.json({ labels: [], data: [] });
    }

    const response = ventasPorCategoria.map(item => ({
      nombre: item._id || "Sin Categoría",
      cantidad: item.totalCantidad
    }));

    res.json({
      labels: response.map(r => r.nombre),
      data: response.map(r => r.cantidad)
    });

  } catch (err) {
    console.error("Error en /api/grafica-categorias:", err);
    res.status(500).json({ error: "Error al obtener ventas por categoría" });
  }
});


module.exports = router;

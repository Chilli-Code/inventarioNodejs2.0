// routes/adminReceipts.js
const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth');
const Venta = require('../models/Sell');
const Product = require('../models/Product'); // <--- FALTA ESTA LÍNEA


// Actualizar recibo (PUT /admin/receipts/:id)
router.put('/receipts/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { total, medio, nombrecliente } = req.body;

    const updatedReceipt = await Venta.findByIdAndUpdate(
      id,
      {
        total: parseFloat(total),
        medio,
        nombrecliente
      },
      { new: true }
    );

    if (!updatedReceipt) {
      return res.status(404).json({ error: 'Recibo no encontrado' });
    }

    res.json({
      success: true,
      message: 'Recibo actualizado correctamente',
      receipt: updatedReceipt
    });
  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(500).json({ error: 'Error al actualizar el recibo' });
  }
});

// DELETE /admin/receipts/delete/:id
router.delete('/receipts/delete/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Venta.findById(id);
    if (!receipt) return res.status(404).json({ message: 'Recibo no encontrado' });

    // 🔹 Revertir las ventas de cada producto (igual que en usuario)
    for (const item of receipt.productos) {
      if (item.productoVenta) {
        await Product.findByIdAndUpdate(
          item.productoVenta,
          {
            $inc: {
              ventas: -item.cantidadVenta, // restar ventas
              cantidad: +item.cantidadVenta // devolver stock
            }
          }
        );
      }
    }

    // 🔹 Borrar recibo
    await receipt.deleteOne();

    res.json({ message: 'Recibo eliminado y ventas actualizadas correctamente' });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({ message: 'Error al eliminar el recibo' });
  }
});



module.exports = router;

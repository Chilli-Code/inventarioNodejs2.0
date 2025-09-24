// routes/adminReceipts.js
const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth');
const Venta = require('../models/Sell');


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

    const deletedReceipt = await Venta.findByIdAndDelete(id);

    if (!deletedReceipt) {
      return res.status(404).json({ message: 'Recibo no encontrado' });
    }

    // Responder con JSON
    res.json({ message: 'Recibo eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({ message: 'Error al eliminar el recibo' });
  }
});

module.exports = router;

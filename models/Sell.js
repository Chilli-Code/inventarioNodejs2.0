// models/Venta.js (was sell.js)
const mongoose = require('mongoose');

const ventaSchema = new mongoose.Schema({
  productos: [{
    productoVenta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    cantidadVenta: { type: Number, required: true },
    precioVenta: { type: Number, required: true }
  }],
  total: { type: Number, required: true },
  medio: { type: String, required: true },
  nombrecliente: { type: String },
  identificacionCliente: { type: String },
  fechaa: { type: String, required: true },
  codigo: { type: String },
  vendedor: { type: String, required: true },

  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true }
});

module.exports = mongoose.model('Venta', ventaSchema);

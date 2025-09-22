// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  producto: { type: String, required: true },
  categoria: { type: String, required: true },
  estado: { type: String, enum: ['Activo', 'Agotado'], required: true },
  ventas: { type: Number, default: 0 },
  cantidad: { type: Number, required: true },
  precio: { type: Number, required: true },
  hora: { type: String },
  // owner del producto (usuario)
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true }
});

module.exports = mongoose.model('Product', productSchema);

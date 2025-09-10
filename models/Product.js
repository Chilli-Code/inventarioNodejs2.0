const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  producto: { type: String, required: true },
  categoria: { type: String, required: true },
  estado: { type: String, enum: ['Activo', 'Agotado'], required: true },
  ventas: { type: Number, default: 0 },
  cantidad: { type: Number, required: true },
  precio: { type: Number, required: true },
  hora: { type: String } // o usa Date si lo deseas
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;

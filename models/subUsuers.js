// models/SubUser.js
const mongoose = require('mongoose');

const subUserSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  tipo: { type: String, default: 'vendedor' }, // siempre vendedor por ahora
  parentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('SubUser', subUserSchema);

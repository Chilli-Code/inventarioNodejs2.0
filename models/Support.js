// models/Support.js
const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tipo: {
    type: String,
    enum: ['bug', 'feature', 'question', 'other'],
    required: true
  },
  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta', 'urgente'],
    default: 'media'
  },
  estado: {
    type: String,
    enum: ['abierto', 'en_proceso', 'resuelto', 'cerrado'],
    default: 'abierto'
  },
  asunto: {
    type: String,
    required: true,
    maxlength: 200
  },
  descripcion: {
    type: String,
    required: true
  },
  respuestas: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    mensaje: String,
    fecha: {
      type: Date,
      default: Date.now
    },
    esAdmin: Boolean
  }],
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Support', supportSchema);
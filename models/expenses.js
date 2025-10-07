// models/Gasto.js
const mongoose = require('mongoose');

const expensesSchema = new mongoose.Schema({
  concepto: { 
    type: String, 
    required: true 
  },
  categoria: { 
    type: String, 
    required: true,
    enum: [
      'Compra de Inventario',
      'Servicios Públicos',
      'Arriendo',
      'Nómina',
      'Transporte',
      'Marketing',
      'Mantenimiento',
      'Impuestos',
      'Otros'
    ]
  },
  monto: { 
    type: Number, 
    required: true 
  },
  fecha: { 
    type: String, 
    required: true 
  },
  descripcion: { 
    type: String 
  },
  metodoPago: { 
    type: String,
    enum: ['Efectivo', 'Transferencia', 'Tarjeta', 'Otro'],
    default: 'Efectivo'
  },
  comprobante: { 
    type: String // URL o número de comprobante
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  registradoPor: {
    type: String // Nombre del usuario o subusuario que registró
  }
}, { 
  timestamps: true 
});

// Índice para búsquedas más rápidas
expensesSchema.index({ user: 1, fecha: -1 });
expensesSchema.index({ user: 1, categoria: 1 });

module.exports = mongoose.model('Expenses', expensesSchema);
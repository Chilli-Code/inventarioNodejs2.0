const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const registerUserSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  correo: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin','user'], default: 'user' },
  status: { type: String, enum: ['pendiente','aprobado','rechazado'], default: 'pendiente' },
  codigoUser: { type: String, unique: true } // ✅ código único
});

// Generar código único antes de guardar
registerUserSchema.pre('save', async function(next) {
  // Solo si no tiene código aún
  if (!this.codigoUser) {
    let unique = false;
    while (!unique) {
      // generar código aleatorio de 6 dígitos
      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      const exists = await mongoose.models.RegisterUser.findOne({ codigoUser: codigo });
      if (!exists) {
        this.codigoUser = codigo;
        unique = true;
      }
    }
  }

  // Hashear contraseña
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

module.exports = mongoose.model('RegisterUser', registerUserSchema);

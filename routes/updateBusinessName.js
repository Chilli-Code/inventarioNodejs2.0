const mongoose = require('mongoose');
const User = require('../models/User'); // Ajusta la ruta según tu estructura

async function updateUsers() {
  try {
    await mongoose.connect('mongodb+srv://jorgexc42_db_user:vJLp0bA5f0B8qJaT@cluster0.v8oue4q.mongodb.net/miappinventario?retryWrites=true&w=majority&appName=Cluster0', { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });

    const result = await User.updateMany(
      { businessName: { $exists: false } },
      { $set: { businessName: 'keku Inventory' } }
    );

    console.log('Usuarios actualizados:', result.modifiedCount);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error actualizando usuarios:', error);
  }
}

updateUsers();

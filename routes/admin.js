// routes/admin.js
const express = require('express');
const bcrypt = require('bcryptjs'); // ✅ para hashear aquí
const router = express.Router();
const { isAdmin } = require('../middleware/auth');
const RegisterUser = require('../models/RegisterUser');
const User = require('../models/User');
const Product = require('../models/Product');
const { deleteUserController } = require('../controllers/userController'); 
const Sale = require('../models/Sell');

// Listado de usuarios pendientes
router.get('/pending', isAdmin, async (req, res) => {
  try {
    const pendingUsers = await RegisterUser.find();
    res.render('admin/admin-pending', { 
      titleMain: 'Usuarios Pendientes',
      user: req.session.user,
      pendingUsers 
    });
  } catch (error) {
    console.error('Error obteniendo pendientes:', error);
    res.status(500).send('Error interno');
  }
});

// Panel admin principal
router.get('/', isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;

    const loggedUser = req.session.user;

    const users = await User.find({
      role: { $ne: 'admin' },
      _id: { $ne: loggedUser.id || loggedUser._id }
    }).sort({ nombre: 1 });

    // 👇 PRIMERO obtienes totalUsers
    const totalUsers = users.length;

    // 👇 Luego calculas activos y deshabilitados
    const activeUsers = users.filter(u => u.active).length;
    const disabledUsers = totalUsers - activeUsers;

    const counts = await Product.aggregate([
      { $match: { user: { $exists: true, $ne: null } } },
      { $group: { _id: "$user", total: { $sum: 1 } } }
    ]);

    const productCounts = {};
    counts.forEach(c => {
      productCounts[c._id.toString()] = c.total;
    });

    const totalPages = Math.ceil(totalUsers / limit);

    const pendingUsers = await RegisterUser.find()
      .skip(skip)
      .limit(limit)
      .sort({ nombre: 1 });

    res.render('admin/admin', {
      titleMain: 'Panel De Usuarios',
      user: loggedUser,
      title: 'Keku Inventory || Admin',
      currentOption: "/usuarios",
      imageUrl: null,
      pendingUsers,
      page,
      users,
      totalPages,
      productCounts,
      totalUsers,   // 👈 pásalo también al EJS
      activeUsers,
      disabledUsers
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).send('Error interno');
  }
});



// Mostrar formulario para editar usuario
router.get('/edit/:id', isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send('Usuario no encontrado');
    }
    res.render('admin/admin-edit-user', { 
      user, 
      title: 'Keku Inventory || Editar Usuario',
      userSession: req.session.user, 
      currentOption: "/usuarios",
      imageUrl: user.profile_picture || '/img/user.webp',
      titleMain :'Editar Usuario',

    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar usuario');
  }
});



// Aprobar o rechazar usuario
router.post('/update/:id', isAdmin, async (req, res) => {
  try {
    const { status, nombre, correo, password } = req.body;
    const userId = req.params.id;

    // 🔹 Primero revisamos si es un usuario pendiente
    const userPending = await RegisterUser.findById(userId);
    if (userPending) {
      if (status === 'aprobado') {
        await User.collection.insertOne({
          nombre: userPending.nombre,
          correo: userPending.correo,
          password: userPending.password,
          role: 'user',
          active: true
        });
        await RegisterUser.findByIdAndDelete(userId);
        console.log('✅ Usuario aprobado con contraseña correcta');
      } else {
        userPending.status = status;
        await userPending.save();
      }
      req.flash('success_msg', 'Estado del usuario actualizado');
      return res.redirect('/listUsers');
    }

    // 🔹 Usuarios activos
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('Usuario no encontrado');

    if (nombre) user.nombre = nombre;
    if (correo) user.correo = correo;
    if (password) user.password = password;

    if (status) {
      const wasActive = user.active;
      user.active = status === 'activo';

      if (wasActive && !user.active && req.sessionStore && typeof req.sessionStore.all === 'function') {
        req.sessionStore.all((err, sessions) => {
          if (err) return console.error(err);
          for (const sid in sessions) {
            if (sessions[sid].user && sessions[sid].user.id === userId) {
              req.sessionStore.destroy(sid, () =>
                console.log(`Sesión del usuario ${userId} destruida por admin`)
              );
            }
          }
        });
      }
    }

    await user.save();
    console.log(`✅ Usuario ${userId} actualizado`);
    req.flash('success_msg', 'Usuario actualizado correctamente');
    res.redirect('/listUsers');

  } catch (err) {
    console.error(err);
    res.status(500).send('Error al actualizar usuario');
  }
});


router.get('/statistics-admin', isAdmin, async (req, res) => {
  try {
    const salesByUser = await Sale.aggregate([
      {
        $group: {
          _id: '$user',
          totalVentas: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ]);

    const allUsers = await User.find().lean();

    res.render('admin/statistics/chartProduct', {
      title: 'Dashboard Ventas',
      salesByUser,
      allUsers,
      currentOption: '/stadistics'
    });
  } catch (err) {
    console.error('Error al cargar dashboard:', err);
    res.status(500).send('Error al cargar dashboard');
  }
});

router.delete('/users/:userId', isAdmin, deleteUserController);

module.exports = router;

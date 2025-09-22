// routes/subusers.js
const express = require('express');
const router = express.Router();
const SubUser = require('../models/subUsuers');
const User = require('../models/User');

// Middleware para verificar si es admin
function isAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('Acceso denegado');
  }
  next();
}

// Listar todos los subusuarios con su dueño
router.get('/', isAdmin, async (req, res) => {
  try {
    const subusers = await SubUser.find()
      .populate('parentUser', 'nombre correo') // nombre y correo del padre
      .lean();

    // Agrupar por usuario padre
    const grouped = {};
    subusers.forEach(sub => {
      const parentId = sub.parentUser?._id;
      if (!grouped[parentId]) {
        grouped[parentId] = {
          parent: sub.parentUser,
          subusers: []
        };
      }
      grouped[parentId].subusers.push(sub);
    });

    // Pasar un array para recorrerlo fácilmente
    const groupedArray = Object.values(grouped);

    res.render('admin/subusers/subusers', {
      title: 'Keku Inventory || Sub Usuarios',
      user: req.session.user,
      groupedArray, // 👈 esto lo usaremos en EJS
      currentOption: '/subusers',
      imageUrl: null,
      titleMain: 'Sub Usuarios'
    });
  } catch (err) {
    console.error('Error al cargar subusuarios:', err);
    res.status(500).send('Error al cargar subusuarios');
  }
});

module.exports = router;

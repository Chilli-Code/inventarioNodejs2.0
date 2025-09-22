const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth'); // tu middleware
const Product = require('../models/Product');
const bcrypt = require('bcrypt');
const User = require('../models/User'); // tu modelo
const SubUser = require('../models/subUsuers'); 


router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user.id || user._id;

    const products = await Product.find({ user: userId }).lean();
const subusers = await SubUser.find({ parentUser: userId }).lean();
    res.render('settings', {
      title: 'Keku Inventory || Perfil',
      titleMain: 'Configuración',
      products,
      user,
      subusers,
      imageUrl: user.profile_picture || null,
      currentOption: '/settings',
      successMessage: req.flash('success_msg'),
      errorMessage: req.flash('error_msg')
    });
  } catch (err) {
    console.error('Error cargando perfil:', err);
    res.status(500).send('Error interno del servidor');
  }
});


// routes/settings.js
router.post('/update', async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user?.id;

    if (!userId) {
      req.flash('error_msg', 'No se encontró sesión de usuario.');
      return res.redirect('/settings');
    }

    const { email, usuario, currentPassword, newPassword } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      req.flash('error_msg', 'Usuario no encontrado.');
      return res.redirect('/settings');
    }

    let updated = false;

    // Verificar cambio de correo
    if (email && email !== user.correo) {
      user.correo = email;
      updated = true;
    }

    // Verificar cambio de usuario
    if (usuario && usuario.trim() !== '' && usuario.trim() !== user.nombre) {
      user.nombre = usuario.trim();
      updated = true;
    }

    // Cambio de contraseña (requiere ambas)
    if (currentPassword || newPassword) {
      // Validación básica
      if (!currentPassword || !newPassword) {
        req.flash('error_msg', 'Debe ingresar la contraseña actual y la nueva para cambiarla.');
        return res.redirect('/settings');
      }

      if (newPassword.length < 6) {
        req.flash('error_msg', 'La nueva contraseña debe tener al menos 6 caracteres.');
        return res.redirect('/settings');
      }

      // Verificar contraseña actual
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        req.flash('error_msg', 'La contraseña actual es incorrecta.');
        return res.redirect('/settings');
      }

      // Hashear nueva contraseña
      user.password = newPassword; 
      updated = true;
    }

    if (!updated) {
      req.flash('error_msg', 'No se realizaron cambios.');
      return res.redirect('/settings');
    }

    await user.save();

    // Actualizar sesión sin exponer la contraseña
    const updatedUser = user.toObject();
    delete updatedUser.password;
    req.session.user = updatedUser;

    req.flash('success_msg', 'Datos actualizados correctamente.');
    return res.redirect('/settings');

  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Hubo un error al actualizar los datos.');
    return res.redirect('/settings');
  }
});



router.post('/subusuarios/add', isAuthenticated, async (req, res) => {
  try {
    const parentUserId = req.session.user?._id || req.session.user?.id;
    const { subuser_name } = req.body; // 👈 usar el name del input

    if (!subuser_name || subuser_name.trim() === '') {
      req.flash('error_msg', 'El nombre del subusuario es obligatorio.');
      return res.redirect('/settings');
    }

    const subUser = new SubUser({
      nombre: subuser_name.trim(),
      tipo: 'vendedor',
      parentUser: parentUserId
    });

    await subUser.save();

    req.flash('success_msg', 'Subusuario agregado correctamente.');
    res.redirect('/settings');
  } catch (err) {
    console.error('Error al agregar subusuario:', err);
    req.flash('error_msg', 'Error al agregar subusuario.');
    res.redirect('/settings');
  }
});




router.post('/subusuarios/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const parentUserId = req.session.user?._id || req.session.user?.id;

    await SubUser.deleteOne({ _id: req.params.id, parentUser: parentUserId });

    req.flash('success_msg', 'Subusuario eliminado correctamente.');
    return res.redirect('/settings');
  } catch (err) {
    console.error('Error al eliminar subusuario:', err);
    req.flash('error_msg', 'Hubo un error al eliminar el subusuario.');
    return res.redirect('/settings');
  }
});


module.exports = router;

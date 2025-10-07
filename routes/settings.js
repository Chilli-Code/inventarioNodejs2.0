const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth'); // tu middleware
const Product = require('../models/Product');
const bcrypt = require('bcrypt');
const User = require('../models/User'); // tu modelo
const SubUser = require('../models/subUsuers'); 
const Venta = require('../models/Sell');

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;

    // ❌ NO uses req.session.user directamente
    // ✅ Consulta el usuario actualizado desde la BD
    const user = await User.findById(userId).lean();

    const products = await Product.find({ user: userId }).lean();
    const subusers = await SubUser.find({ parentUser: userId }).lean();

const subUsuariosConStats = await Promise.all(
  subusers.map(async (sub) => {
    const ventasSub = await Venta.find({ vendedor: sub.nombre }).lean();

    // ✅ Sumar el campo 'total' de cada venta
    const totalEnPrecio = ventasSub.reduce((suma, venta) => {
      return suma + (venta.total || 0); // si no hay total, suma 0
    }, 0);

    // Procesar fechas para última venta
    const ventasOrdenadas = ventasSub
      .filter(v => v.fechaa)
      .map(v => ({
        ...v,
        fechaParsed: parseFecha(v.fechaa)
      }))
      .filter(v => v.fechaParsed instanceof Date && !isNaN(v.fechaParsed))
      .sort((a, b) => b.fechaParsed - a.fechaParsed);

    const ultimaVenta = ventasOrdenadas[0];

    return {
      ...sub,
      totalVentas: ventasSub.length,
      totalEnPrecio: parseFloat(totalEnPrecio.toFixed(2)), // Ej: 40000 → 40000.00
      ultimaVenta: ultimaVenta ? ultimaVenta.fechaa : null
    };
  })
);

// Función que debes tener definida en tu archivo para convertir el string a Date
function parseFecha(fechaStr) {
  const [fecha, hora] = fechaStr.split(' - ');
  const [dia, mes, anio] = fecha.split('/');
  return new Date(`${anio}-${mes}-${dia}T${hora}`);
}

    res.render('settings', {
      title: 'Keku Inventory || Perfil',
      titleMain: 'Configuración',
      products,
      user, // ✅ ahora este "user" sí tiene businessName
      subusers,
      subusers: subUsuariosConStats,
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
router.put('/update', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'No se encontró sesión de usuario.' });
    }

    const { businessName, email, usuario, currentPassword, newPassword } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    let updated = false;

    if (businessName && businessName.trim() !== '') {
      if (user.businessName === 'keku Inventory') {
        user.businessName = businessName.trim();
        updated = true;
      } else if (businessName.trim() !== user.businessName) {
        return res.status(400).json({ message: 'Solo se puede cambiar una vez el nombre del negocio.' });
      }
    }

    if (email && email !== user.correo) {
      user.correo = email;
      updated = true;
    }

    if (usuario && usuario.trim() !== '' && usuario.trim() !== user.nombre) {
      user.nombre = usuario.trim();
      updated = true;
    }

    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Debe ingresar la contraseña actual y la nueva para cambiarla.' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      }

      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return res.status(400).json({ message: 'La contraseña actual es incorrecta.' });
      }

      user.password = newPassword;
      updated = true;
    }

    if (!updated) {
      return res.status(400).json({ message: 'No se realizaron cambios.' });
    }

    await user.save();

    // Actualizar sesión sin exponer la contraseña
const updatedUser = user.toObject();
delete updatedUser.password;

// ✅ Asegúrate que la sesión tenga `.id`
updatedUser.id = updatedUser._id.toString();

req.session.user = updatedUser;

    return res.json({ message: 'Datos actualizados correctamente.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Hubo un error al actualizar los datos.' });
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




router.delete('/subusuarios/:id', isAuthenticated, async (req, res) => {
  try {
    const parentUserId = req.session.user?._id || req.session.user?.id;

    const result = await SubUser.deleteOne({ _id: req.params.id, parentUser: parentUserId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Subusuario no encontrado o no autorizado.' });
    }

    return res.status(200).json({ message: 'Subusuario eliminado correctamente.' });
  } catch (err) {
    console.error('Error al eliminar subusuario:', err);
    return res.status(500).json({ message: 'Error interno al eliminar el subusuario.' });
  }
});



module.exports = router;

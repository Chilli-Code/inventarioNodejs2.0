// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { isNotAuthenticated } = require('../middleware/auth');
const RegisterUser = require('../models/RegisterUser');


// Mostrar formulario signup
router.get('/signup', isNotAuthenticated, (req, res) => {
  const successMessage = req.flash('success'); // esto lo limpia después de leerlo
  res.render('auth/signup', {
    title: 'Registro | InventarioApp',
    titulo: 'Registro',
    message: successMessage.length > 0 ? successMessage[0] : null
  });
});


// Procesar formulario signup
// Procesar formulario signup
router.post('/signup', isNotAuthenticated, async (req, res) => {
  const { nombre, correo, password } = req.body;

  try {
    const existingUser = await RegisterUser.findOne({ correo });
    if (existingUser) {
      return res.render('auth/signup', {
        title: 'Registro | InventarioApp',
        titulo: 'Registro',
        message: 'Ya existe un registro pendiente para este correo'
      });
    }

    const existingUserActive = await User.findOne({ correo });
    if (existingUserActive) {
      return res.render('auth/signup', {
        title: 'Registro | InventarioApp',
        titulo: 'Registro',
        message: 'El usuario ya está activo'
      });
    }

    const regUser = new RegisterUser({ nombre, correo, password });
    await regUser.save();

    // Renderizar la misma página con SweetAlert
    return res.render('auth/signup', {
      title: 'Registro | InventarioApp',
      titulo: 'Registro',
      message: 'Tu registro está en revisión. Espera la aprobación.'
    });

  } catch (error) {
    console.error(error);
    return res.render('auth/signup', {
      title: 'Registro | InventarioApp',
      titulo: 'Registro',
      message: 'Error en el registro'
    });
  }
});



// Mostrar formulario signin
router.get('/signin', isNotAuthenticated, (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  const message = req.flash('message');
    res.render('auth/signin', {
    title: 'Iniciar sesión | InventarioApp', // ✅ AÑADIDO
    message: message.length > 0 ? message[0] : null
  });
});

// Procesar formulario signin
router.post('/signin', isNotAuthenticated, async (req, res) => {
  const { correo, password } = req.body;

  try {
    const user = await User.findOne({ correo });
    if (!user) {
      const pending = await RegisterUser.findOne({ correo });
      if (pending) {
        req.flash('message', 'Tu cuenta está en revisión. Espera la aprobación.');
        return res.redirect('/signin');
      }
      req.flash('message', 'Usuario no encontrado');
      return res.redirect('/signin');
    }

    
    console.log('--- LOGIN ---');
    console.log('Correo:', correo);
    console.log('Password ingresado:', password);
    console.log('Password en DB:', user.password);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Resultado compare:', isMatch);

    if (!isMatch) {
      req.flash('message', 'Contraseña incorrecta');
      return res.redirect('/signin');
    }

    if (!user.active) {
  req.flash('message', 'Tu cuenta está deshabilitada. Contacta al administrador.');
  return res.redirect('/signin');
}

    req.session.user = {
      id: user._id,
      nombre: user.nombre,
      correo: user.correo,
      role: user.role
    };

    res.redirect('/home');

  } catch (error) {
    console.error(error);
    req.flash('message', 'Error en login');
    res.redirect('/signin');
  }
});



// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.log(err);
      return res.redirect('/home'); // o la página que prefieras
    }
    res.clearCookie('connect.sid'); // limpia cookie de sesión
    res.redirect('/signin');
  });
});


module.exports = router;

// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { isNotAuthenticated } = require('../middleware/auth');

// Mostrar formulario signup
router.get('/signup', isNotAuthenticated, (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
    res.render('auth/signup', {
    title: 'Registro | InventarioApp', // ✅ AÑADIDO
    titulo: 'Registro',
    message: req.flash('message')
  });
  
});

// Procesar formulario signup
router.post('/signup', isNotAuthenticated, async (req, res) => {
  const { nombre, correo, password } = req.body;

  try {
    const existingUser = await User.findOne({ correo });
    if (existingUser) {
      req.flash('message', 'El usuario ya existe');
      return res.redirect('/signup');
    }

    // 🚫 Ya NO se hace hash aquí, el modelo se encarga de eso
    const user = new User({ nombre, correo, password });
    await user.save();

    // Iniciar sesión automáticamente
    req.session.user = {
      id: user._id,
      nombre: user.nombre,
      correo: user.correo
    };

    req.session.save((err) => {
      if (err) {
        console.error('Error al guardar sesión en registro:', err);
        req.flash('message', 'Error al iniciar sesión automáticamente.');
        return res.redirect('/signin');
      }

      req.flash('message', 'Usuario registrado con éxito');
      res.redirect('/home');
    });

  } catch (error) {
    console.error('Error en registro:', error);
    req.flash('message', 'Error en el registro');
    res.redirect('/signup');
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
  const trimmedPassword = password.trim();

  console.log('------------------------------------------------');
  console.log('📬 Intento de login con correo:', correo);
  console.log('🔑 Contraseña recibida (visible para debug):', trimmedPassword);

  try {
    const user = await User.findOne({ correo });
    if (!user) {
      console.log('❌ Usuario no encontrado');
      req.flash('message', 'Usuario no encontrado');
      return res.redirect('/signin');
    }

    console.log('✅ Usuario encontrado:', user.correo);
    console.log('🔐 Hash almacenado en DB:', user.password);

    const isMatch = await bcrypt.compare(trimmedPassword, user.password);
    console.log('matchCondition:', isMatch);

    if (!isMatch) {
      console.log('❌ ¡Contraseña NO coincide!');
      req.flash('message', 'Contraseña incorrecta');
      return res.redirect('/signin');
    }

    console.log('🎉 ¡Login exitoso!');
    req.session.user = {
      id: user._id,
      nombre: user.nombre,
      correo: user.correo
    };

    req.session.save((err) => {
      if (err) {
        console.error('Error al guardar sesión:', err);
        req.flash('message', 'Error interno. Intente nuevamente.');
        return res.redirect('/signin');
      }
      res.redirect('/home');
    });

  } catch (error) {
    console.error('💥 Error en login:', error);
    req.flash('message', 'Error en el login');
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

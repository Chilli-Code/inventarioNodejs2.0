// routes/support.js
const express = require('express');
const router = express.Router();
const Support = require('../models/Support');

// Middleware de autenticación
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/');
};

// Ver todos los tickets (admin ve todos, user solo los suyos)
router.get('/support', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    let tickets;

    if (user.role === 'admin') {
      // Admin ve todos los tickets con información del usuario
      tickets = await Support.find()
        .populate('user', 'nombre correo businessName')
        .sort({ fechaActualizacion: -1 });
    } else {
      // Usuario normal solo ve sus propios tickets
      tickets = await Support.find({ user: user.id })
        .sort({ fechaActualizacion: -1 });
    }

    res.render('support', {
      title: 'Keku Inventory || Soporte',
      titleMain: 'Soporte Técnico',
      currentOption: '/support',
      imageUrl: null,
      user,
      username: user.nombre || 'Usuario', // AGREGAR
      tickets,
      success: req.flash('success')[0] || null, // AGREGAR
      error: req.flash('error')[0] || null // AGREGAR
    });
  } catch (err) {
    console.error('Error obteniendo tickets:', err);
    res.status(500).send('Error al cargar tickets');
  }
});

// Crear nuevo ticket
router.post('/support/create', isAuthenticated, async (req, res) => {
  try {
    const { tipo, asunto, descripcion, prioridad } = req.body;
    
    const nuevoTicket = new Support({
      user: req.session.user.id,
      tipo,
      asunto,
      descripcion,
      prioridad: prioridad || 'media'
    });

    await nuevoTicket.save();
    
    // Notificar a admins (implementar después)
    req.flash('success', 'Ticket creado exitosamente');
    res.redirect('/support');
  } catch (err) {
    console.error('Error creando ticket:', err);
    req.flash('error', 'Error al crear ticket');
    res.redirect('/support');
  }
});

// Ver detalles de un ticket
router.get('/support/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    const ticket = await Support.findById(req.params.id)
      .populate('user', 'nombre correo businessName')
      .populate('respuestas.usuario', 'nombre role');

    if (!ticket) {
      return res.status(404).send('Ticket no encontrado');
    }

    // Verificar permisos
    if (user.role !== 'admin' && ticket.user._id.toString() !== user.id) {
      return res.status(403).send('No tienes permiso para ver este ticket');
    }

    res.render('support-detail', {
      title: 'Detalle del Ticket',
      titleMain: 'Soporte Técnico',
      currentOption: '/support',
      imageUrl: null,
      user,
      ticket
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Error al cargar ticket');
  }
});

// Responder a un ticket
router.post('/support/:id/reply', isAuthenticated, async (req, res) => {
  try {
    const { mensaje } = req.body;
    const user = req.session.user;

    const ticket = await Support.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    // Verificar permisos
    if (user.role !== 'admin' && ticket.user.toString() !== user.id) {
      return res.status(403).json({ error: 'Sin permiso' });
    }

    ticket.respuestas.push({
      usuario: user.id,
      mensaje,
      esAdmin: user.role === 'admin'
    });

    ticket.fechaActualizacion = new Date();
    
    // Si admin responde, cambiar estado a "en_proceso"
    if (user.role === 'admin' && ticket.estado === 'abierto') {
      ticket.estado = 'en_proceso';
    }

    await ticket.save();

    req.flash('success', 'Respuesta agregada');
    res.redirect(`/support/${req.params.id}`);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error al responder' });
  }
});

// Cambiar estado del ticket (solo admin)
router.post('/support/:id/status', isAuthenticated, async (req, res) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo admins' });
    }

    const { estado } = req.body;
    await Support.findByIdAndUpdate(req.params.id, { 
      estado,
      fechaActualizacion: new Date()
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// Contador de tickets sin responder (para notificaciones admin)
router.get('/api/support/unread-count', isAuthenticated, async (req, res) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.json({ count: 0 });
    }

    const count = await Support.countDocuments({
      estado: { $in: ['abierto', 'en_proceso'] }
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
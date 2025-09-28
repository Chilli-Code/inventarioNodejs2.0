// middleware/notificaciones.js
const RegisterUser = require('../models/RegisterUser');

async function notificacionesMiddleware(req, res, next) {
  res.locals.pendingUserCount = 0;

  if (req.session.user && req.session.user.role === 'admin') {
    try {
      const count = await RegisterUser.countDocuments({ status: 'pendiente' });
      res.locals.pendingUserCount = count;
    } catch (err) {
      console.error('Error obteniendo usuarios pendientes:', err);
    }
  }

  next();
}

module.exports = notificacionesMiddleware;

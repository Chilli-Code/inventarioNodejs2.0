// middleware/auth.js
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  req.flash('message', 'Debes iniciar sesión para acceder a esta página.');
  res.redirect('/signin');
}

function isNotAuthenticated(req, res, next) {
  if (req.session.user) {
    req.flash('message', 'Ya tienes una sesión activa.');
    return res.redirect('/home');
  }
  next();
}

function isAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('Acceso denegado');
  }
  next();
}

module.exports = { isAuthenticated, isNotAuthenticated, isAdmin };

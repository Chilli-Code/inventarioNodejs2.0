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

module.exports = {
  isAuthenticated,
  isNotAuthenticated
};
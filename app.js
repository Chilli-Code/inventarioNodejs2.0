const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
// Rutas
const authRoutes = require('./routes/auth');
const homeRoutes = require('./routes/home');
const productRoutes = require('./routes/products'); // Asegúrate de que la ruta es correcta
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/settings');
const compression = require('compression');
const subUserRoutes = require('./routes/subusers');
const notificacionesMiddleware = require('./middleware/notificaciones');
const supportRoutes = require('./routes/support');
const expensesRoutes = require('./routes/expenses');
dotenv.config();

const app = express();

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("🟢 Conectado a MongoDB"))
  .catch(err => console.error("🔴 Error en MongoDB:", err));

// Middleware de cache selectiva para recursos pesados (antes de static)
app.use((req, res, next) => {
  if (req.url.match(/\.(mp4|webp|svg|ttf|woff2?|eot|otf)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 año
    
  }
  next();
});

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  etag: false
}));


// Middlewares
app.use(express.json()); // ← esto permite recibir JSON

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('layout', 'layout');
app.set('views', path.join(__dirname, 'views'));
app.use('/js', express.static(__dirname + '/node_modules/vanilla-tilt/dist'));
app.use('/js', express.static(__dirname + '/node_modules/toastify-js'));
app.use('/css', express.static(__dirname + '/node_modules/toastify-js'));
app.use('/toastify', express.static(path.join(__dirname, 'node_modules/toastify-js/src')));
app.use(compression());

// Sesión y flash (deben estar antes de las rutas)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // ← ¡true solo si usas HTTPS!
    httpOnly: true, // ← ¡impide acceso desde JS!
    maxAge: 24 * 60 * 60 * 1000 // ← 24 horas
  }
}));
app.use(flash());
app.use((req, res, next) => {
  res.locals.userSession = req.session.user || null;
  res.locals.success_msg = req.flash('success_msg')[0] || null;
  res.locals.error_msg = req.flash('error_msg')[0] || null;
  next();
});
app.use(require('./middleware/notificaciones'));
// Rutas
app.use('/', authRoutes); // Primero las rutas de autenticación
app.use('/', homeRoutes); // Luego las rutas protegidas
app.use('/products', productRoutes);
app.use('/api', apiRoutes);
app.use('/listUsers', adminRoutes);
app.use('/subusers', subUserRoutes);
app.use('/settings', profileRoutes);
app.use('/admin', adminRoutes);
app.use('/admin', require('./routes/adminReceipts'));
app.use('/', supportRoutes);
app.use('/expenses', expensesRoutes);
// Ruta raíz
app.get('/', (req, res) => {
  const isMobile = /mobile|android|iphone|ipad/i.test(req.headers['user-agent']);
  res.render('index', { 
    title: "Inicio",  
    currentOption: req.path,
    isMobile // 👈 ahora sí se pasa a index.ejs
  });
});



// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

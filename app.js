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


dotenv.config();

const app = express();

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("🟢 Conectado a MongoDB"))
  .catch(err => console.error("🔴 Error en MongoDB:", err));

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('layout', 'layout');
app.set('views', path.join(__dirname, 'views'));
app.use('/js', express.static(__dirname + '/node_modules/vanilla-tilt/dist'));

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
  res.locals.message = req.flash('message');
  next();
});

// Rutas
app.use('/', authRoutes); // Primero las rutas de autenticación
app.use('/', homeRoutes); // Luego las rutas protegidas
app.use('/products', productRoutes);
app.use('/api', apiRoutes);
// Ruta raíz
app.get('/', (req, res) => {
  res.render('index', { titulo: "Inicio",  currentOption: req.path, });
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

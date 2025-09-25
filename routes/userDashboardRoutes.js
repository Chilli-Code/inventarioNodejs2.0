const express = require('express');
const router = express.Router();
const { getUserDashboardData } = require('../controllers/userDashboardController');

// Ruta para usuarios normales
router.get('/mis-estadisticas', getUserDashboardData);

module.exports = router;

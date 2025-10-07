// routes/expenses.js
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const Gasto = require('../models/expenses');
const Venta = require('../models/Sell');
const { isAuthenticated } = require('../middleware/auth');


// IMPORTANTE: Esta ruta debe ir ANTES de router.get('/')
router.get('/balance', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    const meses = [];
    const hoy = new Date();
    
    for (let i = 0; i < 6; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const anio = fecha.getFullYear();
      
      // ✅ Para GASTOS: formato YYYY-MM (2025-10)
      const patronFechaGastos = `${anio}-${mes}`;
      
      // ✅ Para VENTAS: formato /MM/YYYY (/10/2025)
      const patronFechaVentas = `/${mes}/${anio}`;
      
      const gastosDelMes = await Gasto.aggregate([
        { 
          $match: { 
            user: userObjectId,
            fecha: { $regex: `^${patronFechaGastos}` } // Busca "2025-10"
          } 
        },
        { $group: { _id: null, total: { $sum: '$monto' } } }
      ]);

      const ingresosDelMes = await Venta.aggregate([
        { 
          $match: { 
            user: userObjectId,
            fechaa: { $regex: patronFechaVentas } // Busca "/10/2025"
          } 
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);

      meses.push({
        mes: fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }),
        gastos: gastosDelMes[0]?.total || 0,
        ingresos: ingresosDelMes[0]?.total || 0,
        balance: (ingresosDelMes[0]?.total || 0) - (gastosDelMes[0]?.total || 0)
      });
    }

    res.render('expenses-comparacion', {
      titleMain: 'Comparación Mensual',
      title: 'Keku Inventory || Comparación',
      currentOption: '/expenses',
      imageUrl: null,
      user: req.session.user,
      meses
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al cargar comparación');
  }
});

// Vista principal de gastos

// Vista principal de gastos
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    if (!userId) {
      return res.redirect('/login');
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const hoy = new Date();

    const mesSeleccionado = req.query.mes || `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    
    const [anioSel, mesSel] = mesSeleccionado.split('-');
    const patronFechaGastosFiltro = `^${mesSeleccionado}`;
    const patronFechaVentas = `/${mesSel}/${anioSel}`;
    
    // ✅ Filtrar gastos por el mes seleccionado
    const gastos = await Gasto.find({ 
      user: userObjectId,
      fecha: { $regex: patronFechaGastosFiltro }
    })
      .sort({ createdAt: -1 })
      .limit(50);

    // ✅ Total de gastos del mes seleccionado
    const totalGastos = await Gasto.aggregate([
      { 
        $match: { 
          user: userObjectId,
          fecha: { $regex: `^${mesSeleccionado}` }
        } 
      },
      { $group: { _id: null, total: { $sum: '$monto' } } }
    ]);

    // ✅ Total de ingresos del mes seleccionado
    const totalIngresos = await Venta.aggregate([
      { 
        $match: { 
          user: userObjectId,
          fechaa: { $regex: patronFechaVentas }
        } 
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // ✅ Gastos por categoría del mes seleccionado
    const gastosPorCategoria = await Gasto.aggregate([
      { 
        $match: { 
          user: userObjectId,
          fecha: { $regex: patronFechaGastosFiltro }
        } 
      },
      { 
        $group: { 
          _id: '$categoria', 
          total: { $sum: '$monto' },
          cantidad: { $sum: 1 }
        } 
      },
      { $sort: { total: -1 } }
    ]);

    // Balance del mes
    const gastosTotal = totalGastos[0]?.total || 0;
    const ingresosTotal = totalIngresos[0]?.total || 0;
    const balance = ingresosTotal - gastosTotal;
    
    const mesesDisponibles = [];
    for (let i = 0; i < 12; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mesString = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      mesesDisponibles.push({
        value: mesString,
        label: fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
      });
    }
    
    const data = {
      titleMain: '💰Gestión de Gastos',
      gastos,
      title: 'Keku Inventory || Expenses',
      currentOption: '/expenses',
      imageUrl: null,
      user: req.session.user,
      totalGastos: gastosTotal, // ✅ Ahora del mes seleccionado
      totalIngresos: ingresosTotal, // ✅ Ahora del mes seleccionado
      balance: balance, // ✅ Ahora del mes seleccionado
      gastosPorCategoria,
      mesSeleccionado,
      mesesDisponibles
    };

    res.render('expenses', data);
  } catch (error) {
    console.error('Error al cargar gastos:', error);
    res.status(500).send('Error al cargar gastos');
  }
});
// Registrar nuevo gasto
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { concepto, categoria, monto, fecha, descripcion, metodoPago, comprobante } = req.body;
    
    const nuevoGasto = new Gasto({
      concepto,
      categoria,
      monto: parseFloat(monto),
      fecha,
      descripcion,
      metodoPago,
      comprobante,
      user: req.session.user.id, // ✅ CAMBIAR AQUÍ
      registradoPor: req.session.user?.nombre || 'Usuario' // ✅ Y AQUÍ
    });

    await nuevoGasto.save();
    res.json({ success: true, message: 'Gasto registrado exitosamente' });
  } catch (error) {
    console.error('Error al registrar gasto:', error);
    res.status(500).json({ success: false, message: 'Error al registrar gasto' });
  }
});

// Eliminar gasto
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    await Gasto.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.session.user.id
    });
    res.json({ success: true, message: 'Gasto eliminado' });
  } catch (error) {
    console.error('Error al eliminar gasto:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar' });
  }
});

// Editar gasto
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const { concepto, categoria, monto, fecha, descripcion, metodoPago, comprobante } = req.body;
    
    await Gasto.findOneAndUpdate(
      { _id: req.params.id, user: req.session.user.id },
      {
        concepto,
        categoria,
        monto: parseFloat(monto),
        fecha,
        descripcion,
        metodoPago,
        comprobante
      }
    );

    res.json({ success: true, message: 'Gasto actualizado' });
  } catch (error) {
    console.error('Error al actualizar gasto:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar' });
  }
});

module.exports = router;
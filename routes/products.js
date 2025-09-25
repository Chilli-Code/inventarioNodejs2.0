// routes/product.js (fragmentos)
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// POST /add
router.post('/add', async (req, res) => {
  try {
    const userId = req.session.user.id;

    // evita duplicados por usuario
    const productoExistente = await Product.findOne({
      producto: req.body.producto,
      user: userId
    });

    if (productoExistente) {
      req.flash('error', 'El producto ya existe, no se puede agregar duplicado.');
      return res.redirect('/products');
    }

    const categoria = Array.isArray(req.body.categoria) ? req.body.categoria.filter(Boolean)[0] : req.body.categoria;
    const estado = Array.isArray(req.body.estado) ? req.body.estado.filter(Boolean)[0] : req.body.estado;

    const nuevoProducto = new Product({
      producto: req.body.producto,
      categoria,
      estado,
      ventas: parseInt(req.body.ventas) || 0,
      cantidad: parseInt(req.body.cantidad) || 0,
      precio: parseFloat(req.body.precio) || 0,
      hora: req.body.hora,
      user: userId
    });

    await nuevoProducto.save();
    req.flash('success', 'Producto agregado correctamente');
    res.redirect('/products');
  } catch (err) {
    console.error('Error al guardar producto:', err);
    req.flash('error', 'Error al guardar el producto.');
    res.redirect('/products');
  }
});

// GET /delete/:id (solo dueño puede borrar)
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const deleted = await Product.findOneAndDelete({ _id: req.params.id, user: userId });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado o no pertenece al usuario' });
    }

    return res.json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    return res.status(500).json({ success: false, message: 'Error al eliminar el producto' });
  }
});



// GET /update/:id (solo si es dueño)
router.get('/update/:id', async (req, res) => {
  const id = req.params.id;
  const userId = req.session.user.id;
  try {
    const data = await Product.findOne({ _id: id, user: userId });
    if (!data) return res.status(404).send('Producto no encontrado');
    res.render('editProduct', { data, title: 'Keku Inventory || Editar Producto', currentOption: "/products", imageUrl: null, user: req.session.user, titleMain: "Editar Producto" });
  } catch (err) {
    console.error('Error al cargar el producto:', err);
    res.status(500).send('Error al cargar el producto');
  }
});

// POST /products/update/:id
router.post('/update/:id', async (req, res) => {
  const id = req.params.id;
  const userId = req.session.user.id;
  const { producto, categoria, estado, cantidad, precio, hora } = req.body;

  try {
    const updated = await Product.findOneAndUpdate(
      { _id: id, user: userId },
      { producto, categoria, estado, cantidad, precio, hora },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

    // si quieres redirigir al listado después
    req.flash('success', 'Articulo Actualizado Correctamente');
    res.redirect('/products');
  } catch (err) {
    console.error('Error al actualizar el producto:', err);
    req.flash('error', 'Error al actualizar el producto.');
    res.redirect('/products');
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); // Ruta correcta al modelo

// Ruta para agregar producto
router.post('/add', async (req, res) => {
  try {
    // Verificar si el producto ya existe
    const productoExistente = await Product.findOne({ producto: req.body.producto });

    if (productoExistente) {
      req.flash('success', 'El producto ya existe, no se puede agregar duplicado.');
      return res.redirect('/products');
    }

    // Asegurar que categoria y estado sean strings (en caso de arrays)
    const categoria = Array.isArray(req.body.categoria)
      ? req.body.categoria.filter(Boolean)[0]
      : req.body.categoria;

    const estado = Array.isArray(req.body.estado)
      ? req.body.estado.filter(Boolean)[0]
      : req.body.estado;

    // Crear nuevo producto
    const nuevoProducto = new Product({
      producto: req.body.producto,
      categoria,
      estado,
      ventas: parseInt(req.body.ventas) || 0,
      cantidad: parseInt(req.body.cantidad) || 0,
      precio: parseFloat(req.body.precio) || 0,
      hora: req.body.hora,
    });

    await nuevoProducto.save();
    req.flash('success', 'Producto agregado correctamente');
    res.redirect('/products');

  } catch (err) {
    console.error('Error al guardar producto:', err);
    req.flash('success', 'Error al guardar el producto.');
    res.redirect('/products');
  }
});



router.get('/delete/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    req.flash('success', 'Producto Eliminado');
    res.redirect('/products');
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    req.flash('success', 'Error al eliminar el producto.');
    res.redirect('/products');
  }
});


router.post('/update/:id', async (req, res) => {
  const id = req.params.id;
  const { producto, categoria, estado, cantidad, precio, hora } = req.body;

  try {
    await Product.findByIdAndUpdate(id, {
      producto,
      categoria,
      estado,
      cantidad,
      precio,
      hora,
    });

    req.flash('success', 'Producto actualizado correctamente');
    res.redirect('/products');
  } catch (err) {
    console.error('Error al actualizar el producto:', err);
    req.flash('success', 'Error al actualizar el producto.');
    res.redirect('/products');
  }
});


// GET /update/:id
router.get('/update/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const data = await Product.findById(id);
    res.render('editProduct', { data, 

      title: 'Editar Producto',
      currentOption: "/products",
      imageUrl: null,
      user: req.session.user,
      titleMain: "Editar Producto",
     });
  } catch (err) {
    console.error('Error al cargar el producto:', err);
    res.status(500).send('Error al cargar el producto');
  }
});




module.exports = router;

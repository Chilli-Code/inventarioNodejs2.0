// controllers/userController.js
const User = require('../models/User');
const Product = require('../models/Product');
const Venta = require('../models/Sell'); // importa tu modelo de ventas

exports.deleteUserController = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Comprobamos que exista el usuario primero
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // 🔹 Borrar productos del usuario
    await Product.deleteMany({ user: userId });

    // 🔹 Borrar ventas / recibos del usuario
    await Venta.deleteMany({ user: userId });

    // 🔹 Borrar usuario
    await User.findByIdAndDelete(userId);

    // 🔹 Destruir su sesión si está activa en el store
    // (esto recorre todas las sesiones guardadas en tu store)
    if (req.sessionStore && typeof req.sessionStore.all === 'function') {
      req.sessionStore.all((err, sessions) => {
        if (err) {
          console.error('Error obteniendo sesiones:', err);
        } else {
          for (const sid in sessions) {
            if (
              sessions[sid].user && // debe existir user en la sesión
              sessions[sid].user.id === userId // coincide el id
            ) {
              req.sessionStore.destroy(sid, err2 => {
                if (err2) {
                  console.error('Error destruyendo sesión:', err2);
                } else {
                  console.log(`Sesión del usuario ${userId} destruida`);
                }
              });
            }
          }
        }
      });
    }

    return res
      .status(200)
      .json({ message: 'Usuario y datos eliminados, sesión cerrada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};

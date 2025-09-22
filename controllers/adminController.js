const User = require('../models/User');
const Product = require('../models/Product');
const Venta = require('../models/Sell');
const SubUser = require('../models/SubUser');

exports.getAdminStats = async (req, res) => {
  try {
    // Verifica que el usuario sea admin
    if (!req.session.user || req.session.user.rol !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    // Totales globales
    const totalProductos = await Product.countDocuments();
    const totalVentas = await Venta.countDocuments();
    const totalUsuarios = await User.countDocuments();
    
    // Clientes únicos (que hayan comprado algo)
    const clientesUnicos = await Venta.distinct('nombrecliente', {
      nombrecliente: { $ne: null, $ne: '' }
    });

    const totalClientes = clientesUnicos.length;

    // Subclientes únicos (por ejemplo, si guardas subcliente en cada venta)
    const subclientesUnicos = await Venta.distinct('subcliente', {
      subcliente: { $ne: null, $ne: '' }
    });

    const totalSubclientes = subclientesUnicos.length;
const subUserFilter = isAdmin ? {} : { parentUser: user.id };
const totalSubUsuarios = await SubUser.countDocuments(subUserFilter);
    // Categorías distintas
    const categorias = await Product.distinct('categoria');
    const totalCategorias = categorias.length;

    return res.json({
      totalProductos,
      totalVentas,
      totalUsuarios,
      totalClientes,
      totalSubclientes,
      totalCategorias,
      totalSubUsuarios
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas admin:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

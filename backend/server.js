const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar middleware
app.use(cors());
app.use(express.json());

// Logging en formato combinado (adecuado para CloudWatch/monitoreo DevOps)
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms'));

// Base de datos simulada de 2 productos de perritos
const products = [
  {
    id: 1,
    name: "Cama Plegable Premium Antiestrés",
    price: 34990,
    description: "Cama ortopédica con espuma viscoelástica, ideal para el descanso de perritos de todos los tamaños. Cubierta lavable y base impermeable antideslizante.",
    image: "https://images.unsplash.com/photo-1541599540903-216a46ca1ad0?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: 2,
    name: "Lanzador de Pelotas Automático",
    price: 59990,
    description: "Juguete interactivo que lanza pelotas a 3, 6 o 9 metros. Estimula mental y físicamente a tu perrito, ideal para cuando se queda solo en casa.",
    image: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&q=80&w=600"
  }
];

// Endpoint de Salud (Health Check para ALB / ECS)
app.get('/api/health', (req, res) => {
  console.log('[HEALTH CHECK] Verificación de estado exitosa.');
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Endpoint para obtener los productos
app.get('/api/products', (req, res) => {
  console.log(`[API GET] Retornando catálogo de productos (${products.length} ítems)`);
  res.json(products);
});

// Endpoint para simulación de pago / checkout
app.post('/api/checkout', (req, res) => {
  const { cart, paymentDetails } = req.body;

  console.log('[CHECKOUT INIT] Iniciando simulación de pago...');

  // Validación básica
  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    console.error('[CHECKOUT ERROR] Intento de compra con carrito vacío.');
    return res.status(400).json({ success: false, message: 'El carrito de compras está vacío.' });
  }

  if (!paymentDetails || !paymentDetails.cardNumber || !paymentDetails.cardName) {
    console.error('[CHECKOUT ERROR] Datos de pago incompletos.');
    return res.status(400).json({ success: false, message: 'Los detalles de pago son incompletos.' });
  }

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const lastFourDigits = paymentDetails.cardNumber.replace(/\s?/g, '').slice(-4);

  console.log(`[CHECKOUT PROCESS] Procesando pago por un monto total de $${totalAmount} CLP. Cliente: ${paymentDetails.cardName}. Tarjeta terminada en: ****${lastFourDigits}`);

  // Simulación de delay de red/procesamiento bancario (1.5 segundos)
  setTimeout(() => {
    // Simular aprobación de pago
    const transactionId = 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    console.log(`[CHECKOUT SUCCESS] Pago aprobado con éxito. ID Transacción: ${transactionId}`);
    
    res.status(200).json({
      success: true,
      message: '¡Pago simulado con éxito! Gracias por tu compra.',
      transactionId: transactionId,
      amount: totalAmount,
      timestamp: new Date().toISOString()
    });
  }, 1500);
});

// Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER RUNNING] Servidor ejecutándose en http://0.0.0.0:${PORT}`);
});

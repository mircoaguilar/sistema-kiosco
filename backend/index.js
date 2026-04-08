require('dotenv').config();
// FORZADO MANUAL: Si dotenv falla, esto lo arregla
process.env.JWT_SECRET = process.env.JWT_SECRET || 'clave_maestra_formosa_2026';

console.log("--- CHEQUEO DE INICIO ---");
console.log("JWT_SECRET cargado:", process.env.JWT_SECRET);
console.log("-------------------------");

const express = require('express');
const cors = require('cors');
const db = require('./src/config/db'); 
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        res.json({ message: "Conexión a la base de datos exitosa", result: rows });
    } catch (error) {
        res.status(500).json({ error: "Error conectando a la base de datos", details: error.message });
    }
});

const PORT = process.env.PORT || 3000;

const productosRoutes = require('./src/routes/productos.routes');
app.use('/api/productos', productosRoutes);

const ventasRoutes = require('./src/routes/ventas.routes');
app.use('/api/ventas', ventasRoutes);

app.use('/api/reportes', require('./src/routes/reportes.routes'));

app.use('/api/auth', require('./src/routes/auth.routes'));

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Base de datos conectada (Pool listo)`);
});
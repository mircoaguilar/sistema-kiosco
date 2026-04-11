require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./src/config/db'); 

if (!process.env.JWT_SECRET) {
    console.error("ERROR CRÍTICO: No se encontró la JWT_SECRET.");
    process.exit(1); 
}

const app = express();
app.use(cors());
app.use(express.json());


app.use('/api/productos', require('./src/routes/productos.routes'));
app.use('/api/ventas',    require('./src/routes/ventas.routes'));
app.use('/api/caja',      require('./src/routes/caja.routes'));
app.use('/api/reportes',  require('./src/routes/reportes.routes'));
app.use('/api/auth',      require('./src/routes/auth.routes'));
app.use('/api/gastos',    require('./src/routes/gastos.routes'));

app.get('/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        res.json({ message: "Conexión exitosa", result: rows });
    } catch (error) {
        res.status(500).json({ error: "Error en DB", details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor iniciado en puerto ${PORT}`);
    console.log(`Seguridad activa y Base de Datos conectada`);
});
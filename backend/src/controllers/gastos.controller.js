const db = require('../config/db');

const gastosController = {
    crear: async (req, res) => {
        const { descripcion, monto } = req.body;
        const id_usuario = req.user.id;
        const id_sesion = req.id_sesion_activa; 
        try {
            const sql = 'INSERT INTO gastos_caja (id_sesion, id_usuario, descripcion, monto) VALUES (?, ?, ?, ?)';
            const [result] = await db.query(sql, [id_sesion, id_usuario, descripcion, monto]);

            res.json({ message: "Gasto registrado correctamente", id_gasto: result.insertId });
        } catch (error) {
            res.status(500).json({ error: "Error al registrar gasto", details: error.message });
        }
    }
};

module.exports = gastosController;
const db = require('../config/db');

const movimientosController = {
    crearMovimiento: async (req, res) => {
        const { tipo, concepto, monto, metodo_pago } = req.body;

        const id_usuario = req.user.id;
        const id_sesion = req.id_sesion_activa;

        if (!tipo || !monto) {
            return res.status(400).json({ error: "Datos incompletos" });
        }

        try {
            await db.query(
                `INSERT INTO movimientos_caja 
                (id_sesion, id_usuario, tipo, concepto, monto, metodo_pago) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    id_sesion,
                    id_usuario,
                    tipo,
                    concepto || '',
                    monto,
                    metodo_pago || 'efectivo'
                ]
            );

            res.json({ message: "Movimiento registrado" });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error al registrar movimiento" });
        }
    }
};

module.exports = movimientosController;
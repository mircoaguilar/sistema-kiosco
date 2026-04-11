const db = require('../config/db');

const cajaController = {
    checkEstado: async (req, res) => {
        const id_usuario = req.user.id;
        try {
            const [rows] = await db.query(
                'SELECT id_sesion, monto_inicial FROM sesiones_caja WHERE id_usuario = ? AND estado = "abierta"',
                [id_usuario]
            );
            
            if (rows.length === 0) {
                return res.json({ abierta: false });
            }
            res.json({ abierta: true, sesion: rows[0] });
        } catch (error) {
            res.status(500).json({ error: "Error al chequear estado" });
        }
    },

    abrir: async (req, res) => {
        const { monto_inicial } = req.body;
        const id_usuario = req.user.id;
        try {
            const [abierta] = await db.query('SELECT 1 FROM sesiones_caja WHERE id_usuario = ? AND estado = "abierta"', [id_usuario]);
            if (abierta.length > 0) return res.status(400).json({ msg: "Ya tenés una caja abierta" });

            const [result] = await db.query(
                'INSERT INTO sesiones_caja (id_usuario, monto_inicial, estado) VALUES (?, ?, "abierta")',
                [id_usuario, monto_inicial]
            );
            res.json({ message: "Caja abierta", id_sesion: result.insertId });
        } catch (error) {
            res.status(500).json({ error: "Error al abrir" });
        }
    },

    cerrar: async (req, res) => {
        const { id_sesion, monto_final_efectivo } = req.body;

        try {
            const [sesionData] = await db.query(
                'SELECT monto_inicial FROM sesiones_caja WHERE id_sesion = ?',
                [id_sesion]
            );

            if (sesionData.length === 0) {
                return res.status(404).json({ error: "No se encontró la sesión" });
            }

            const montoInicial = parseFloat(sesionData[0].monto_inicial);

            const [totalesVentas] = await db.query(
                'SELECT SUM(monto_efectivo) as efe, SUM(monto_transferencia) as dig FROM ventas WHERE id_sesion = ?',
                [id_sesion]
            );

            const vEfe = parseFloat(totalesVentas[0].efe || 0);
            const vDig = parseFloat(totalesVentas[0].dig || 0);

            const [totalesGastos] = await db.query(
                'SELECT SUM(monto) as total_gastos FROM gastos_caja WHERE id_sesion = ?',
                [id_sesion]
            );

            const totalGastos = parseFloat(totalesGastos[0].total_gastos || 0);

            const montoEsperado = (montoInicial + vEfe) - totalGastos;
            const diferencia = parseFloat(monto_final_efectivo) - montoEsperado;

            await db.query(
                `UPDATE sesiones_caja SET 
                monto_ventas_efectivo = ?, 
                monto_ventas_digital = ?, 
                monto_final_efectivo = ?, 
                estado = 'cerrada', 
                fecha_cierre = NOW() 
                WHERE id_sesion = ?`,
                [vEfe, vDig, monto_final_efectivo, id_sesion]
            );

            res.json({ 
                message: "Caja cerrada correctamente", 
                detalle: { 
                    monto_inicial: montoInicial,
                    ventas_efectivo: vEfe, 
                    ventas_digital: vDig,
                    gastos_realizados: totalGastos,
                    monto_esperado_en_caja: montoEsperado,
                    monto_real_ingresado: parseFloat(monto_final_efectivo),
                    diferencia: diferencia
                } 
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error al cerrar la caja", details: error.message });
        }
    },

    obtenerHistorial: async (req, res) => {
        try {
            const sql = `
                SELECT 
                    id_sesion, 
                    fecha_apertura, 
                    fecha_cierre, 
                    monto_inicial, 
                    monto_final_efectivo,
                    monto_ventas_efectivo,
                    monto_ventas_digital,
                    estado
                FROM sesiones_caja 
                WHERE estado = 'cerrada' 
                ORDER BY fecha_apertura DESC 
                LIMIT 30`; 

            const [rows] = await db.query(sql);
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: "Error al obtener el historial", details: error.message });
        }
    },

    obtenerEstadoActual: async (req, res) => {
        const id_usuario = req.user.id;
        try {
            const [sesion] = await db.query(
                'SELECT id_sesion, monto_inicial, fecha_apertura FROM sesiones_caja WHERE id_usuario = ? AND estado = "abierta"',
                [id_usuario]
            );

            if (sesion.length === 0) return res.json({ abierta: false });

            const id_sesion = sesion[0].id_sesion;
            const montoInicial = parseFloat(sesion[0].monto_inicial);

            const [ventas] = await db.query(
                'SELECT SUM(monto_efectivo) as efe, SUM(monto_transferencia) as dig FROM ventas WHERE id_sesion = ?',
                [id_sesion]
            );

            const [gastos] = await db.query(
                'SELECT SUM(monto) as total_gastos FROM gastos_caja WHERE id_sesion = ?',
                [id_sesion]
            );

            const [movimientos] = await db.query(`
                (SELECT fecha_hora, CONCAT('Venta #', id_venta) as descripcion, 'Venta' as tipo, (monto_efectivo + monto_transferencia) as monto 
                FROM ventas WHERE id_sesion = ?)
                UNION ALL
                (SELECT fecha_hora, descripcion, 'Gasto' as tipo, monto FROM gastos_caja WHERE id_sesion = ?)
                ORDER BY fecha_hora DESC LIMIT 10`, 
                [id_sesion, id_sesion]
            );

            const vEfe = parseFloat(ventas[0].efe || 0);
            const tGastos = parseFloat(gastos[0].total_gastos || 0);

            res.json({
                abierta: true,
                id_sesion,
                monto_inicial: montoInicial,
                ventas_efectivo: vEfe,
                ventas_digital: parseFloat(ventas[0].dig || 0),
                total_gastos: tGastos,
                efectivo_esperado: (montoInicial + vEfe) - tGastos,
                movimientos
            });
        } catch (error) {
            res.status(500).json({ error: "Error al obtener estado real" });
        }
    }
};

module.exports = cajaController;
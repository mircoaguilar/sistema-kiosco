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
        const monto = parseFloat(monto_inicial);
        const id_usuario = req.user.id;

        // VALIDACIÓN DE SEGURIDAD
        if (isNaN(monto) || monto < 0) {
            return res.status(400).json({ msg: "El monto inicial no puede ser negativo" });
        }

        try {
            const [abierta] = await db.query(
                'SELECT 1 FROM sesiones_caja WHERE id_usuario = ? AND estado = "abierta"',
                [id_usuario]
            );

            if (abierta.length > 0) {
                return res.status(400).json({ msg: "Ya tenés una caja abierta" });
            }

            const [result] = await db.query(
                'INSERT INTO sesiones_caja (id_usuario, monto_inicial, estado) VALUES (?, ?, "abierta")',
                [id_usuario, monto]
            );

            res.json({ message: "Caja abierta", id_sesion: result.insertId });
        } catch (error) {
            res.status(500).json({ error: "Error al abrir" });
        }
    },

    cerrar: async (req, res) => {
        const { id_sesion, monto_final_efectivo } = req.body;

        try {
            const [sesionData] = await db.query('SELECT monto_inicial FROM sesiones_caja WHERE id_sesion = ?', [id_sesion]);
            if (sesionData.length === 0) return res.status(404).json({ error: "No se encontró la sesión" });

            const montoInicial = parseFloat(sesionData[0].monto_inicial);

            const [ventas] = await db.query(
                'SELECT SUM(monto_efectivo) as efe, SUM(monto_transferencia) as dig, SUM(monto_tarjeta) as tar FROM ventas WHERE id_sesion = ?',
                [id_sesion]
            );

            const vEfe = parseFloat(ventas[0].efe || 0);
            const vDig = parseFloat(ventas[0].dig || 0);
            const vTar = parseFloat(ventas[0].tar || 0);

            const [movs] = await db.query(`
                SELECT 
                    SUM(CASE WHEN tipo = 'egreso' AND metodo_pago = 'efectivo' THEN monto ELSE 0 END) as efe_egresos,
                    SUM(CASE WHEN tipo = 'ingreso' AND metodo_pago = 'efectivo' THEN monto ELSE 0 END) as efe_ingresos
                FROM movimientos_caja WHERE id_sesion = ?`, [id_sesion]);

            const efeEgresos = parseFloat(movs[0].efe_egresos || 0);
            const efeIngresos = parseFloat(movs[0].efe_ingresos || 0);

            // CÁLCULO DE EFECTIVO ESPERADO (Solo efectivo)
            const montoEsperado = (montoInicial + vEfe + efeIngresos) - efeEgresos;
            const diferencia = parseFloat(monto_final_efectivo) - montoEsperado;

            await db.query(`UPDATE sesiones_caja SET 
                    monto_ventas_efectivo = ?, monto_ventas_digital = ?, monto_ventas_tarjeta = ?, 
                    monto_final_efectivo = ?, estado = 'cerrada', fecha_cierre = NOW() 
                WHERE id_sesion = ?`, [vEfe, vDig, vTar, monto_final_efectivo, id_sesion]);

            res.json({ message: "Caja cerrada correctamente", detalle: { diferencia } });
        } catch (error) {
            res.status(500).json({ error: "Error al cerrar", details: error.message });
        }
    },

    obtenerHistorial: async (req, res) => {
        try {
            const [rows] = await db.query(`
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
                LIMIT 30
            `);

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
                'SELECT SUM(monto_efectivo) as efe, SUM(monto_transferencia) as dig, SUM(monto_tarjeta) as tar FROM ventas WHERE id_sesion = ?',
                [id_sesion]
            );

            const [movimientosTotales] = await db.query(
            `SELECT 
                SUM(CASE WHEN tipo = 'egreso' AND metodo_pago = 'efectivo' THEN monto ELSE 0 END) as total_egresos_efe,
                SUM(CASE WHEN tipo = 'ingreso' AND metodo_pago = 'efectivo' THEN monto ELSE 0 END) as total_ingresos_efe,
                
                SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) as total_egresos_total,
                SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as total_ingresos_total
            FROM movimientos_caja 
            WHERE id_sesion = ?`,
            [id_sesion]
        );

            const [movimientos] = await db.query(`
                SELECT 
                fecha_hora,
                CONCAT('Venta #', id_venta) as descripcion,
                'venta' as tipo,
                'efectivo' as medio,
                monto_efectivo as monto
                FROM ventas 
                WHERE id_sesion = ? AND monto_efectivo > 0

                UNION ALL

                SELECT 
                fecha_hora,
                CONCAT('Venta #', id_venta) as descripcion,
                'venta' as tipo,
                'transferencia' as medio,
                monto_transferencia as monto
                FROM ventas 
                WHERE id_sesion = ? AND monto_transferencia > 0

                UNION ALL

                SELECT 
                fecha_hora,
                CONCAT('Venta #', id_venta) as descripcion,
                'venta' as tipo,
                'tarjeta' as medio,
                monto_tarjeta as monto
                FROM ventas 
                WHERE id_sesion = ? AND monto_tarjeta > 0

                UNION ALL

                SELECT 
                fecha_hora,
                concepto as descripcion,
                tipo,
                metodo_pago as medio,
                monto
                FROM movimientos_caja 
                WHERE id_sesion = ?

                ORDER BY fecha_hora DESC
                LIMIT 10
            `, [id_sesion, id_sesion, id_sesion, id_sesion]);

            const vEfe = parseFloat(ventas[0].efe || 0);
            const vDig = parseFloat(ventas[0].dig || 0);
            const vTar = parseFloat(ventas[0].tar || 0);
            const totalEgresosEfe = parseFloat(movimientosTotales[0].total_egresos_efe || 0);
            const totalIngresosEfe = parseFloat(movimientosTotales[0].total_ingresos_efe || 0);

            const totalEgresosTotal = parseFloat(movimientosTotales[0].total_egresos_total || 0);
            const totalIngresosTotal = parseFloat(movimientosTotales[0].total_ingresos_total || 0);

            res.json({
                abierta: true,
                id_sesion,
                monto_inicial: montoInicial,
                ventas_efectivo: vEfe,
                ventas_digital: vDig,
                ventas_tarjeta: vTar,
                total_ingresos: totalIngresosTotal, // Envías el total REAL a la card
                total_egresos: totalEgresosTotal,   // Envías el total REAL a la card
                // Aquí calculas el esperado solo con los valores de EFECTIVO:
                efectivo_esperado: (montoInicial + vEfe + totalIngresosEfe) - totalEgresosEfe,
                movimientos
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error al obtener estado real", details: error.message });
        }
    }
};

module.exports = cajaController;
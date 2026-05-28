const db = require('../config/db');

const cajaController = {

    checkEstado: async (req, res) => {
        const id_usuario = req.user.id;

        try {
            const result = await db.query(
                `SELECT id_sesion, monto_inicial 
                FROM sesiones_caja 
                WHERE id_usuario = $1 AND estado = 'abierta'`,
                [id_usuario]
            );

            if (result.rows.length === 0) {
                return res.json({ abierta: false });
            }

            return res.json({
                abierta: true,
                sesion: result.rows[0]
            });

        } catch (error) {
            return res.status(500).json({
                error: "Error al chequear estado"
            });
        }
    },

    abrir: async (req, res) => {

        const { monto_inicial } = req.body;
        const monto = parseFloat(monto_inicial);

        if (!req.user || !req.user.id) {
            return res.status(401).json({ msg: "Usuario no autenticado" });
        }

        const id_usuario = req.user.id;

        if (isNaN(monto) || monto < 0) {
            return res.status(400).json({
                msg: "El monto inicial no puede ser negativo"
            });
        }

        try {
            const abierta = await db.query(
                `SELECT 1 
                FROM sesiones_caja 
                WHERE id_usuario = $1 AND estado = 'abierta'`,
                [id_usuario]
            );

            if (abierta.rows.length > 0) {
                return res.status(400).json({
                    msg: "Ya tenés una caja abierta"
                });
            }

            const result = await db.query(
                `INSERT INTO sesiones_caja (id_usuario, monto_inicial, estado)
                VALUES ($1, $2, 'abierta')
                RETURNING id_sesion`,
                [id_usuario, monto]
            );

            return res.json({
                message: "Caja abierta",
                id_sesion: result.rows[0].id_sesion
            });

        } catch (error) {
            return res.status(500).json({
                error: "Error interno al abrir la caja",
                details: error.message
            });
        }
    },

    cerrar: async (req, res) => {
        const { id_sesion, monto_final_efectivo } = req.body;

        try {
            const sesionData = await db.query(
                `SELECT monto_inicial 
                FROM sesiones_caja 
                WHERE id_sesion = $1`,
                [id_sesion]
            );

            if (sesionData.rows.length === 0) {
                return res.status(404).json({
                    error: "No se encontró la sesión"
                });
            }

            const montoInicial = parseFloat(sesionData.rows[0].monto_inicial);

            const ventas = await db.query(
                `SELECT 
                    COALESCE(SUM(monto_efectivo), 0) as efe,
                    COALESCE(SUM(monto_transferencia), 0) as dig,
                    COALESCE(SUM(total_final - monto_efectivo - monto_transferencia), 0) as tar
                FROM ventas
                WHERE id_sesion = $1
                AND COALESCE(estado, 'activa') = 'activa'`,
                [id_sesion]
            );

            const vEfe = parseFloat(ventas.rows[0].efe);
            const vDig = parseFloat(ventas.rows[0].dig);
            const vTar = parseFloat(ventas.rows[0].tar);

            const movs = await db.query(
                `SELECT 
                    COALESCE(SUM(CASE WHEN tipo = 'egreso' AND metodo_pago = 'efectivo' THEN monto ELSE 0 END), 0) as efe_egresos,
                    COALESCE(SUM(CASE WHEN tipo = 'ingreso' AND metodo_pago = 'efectivo' THEN monto ELSE 0 END), 0) as efe_ingresos
                FROM movimientos_caja 
                WHERE id_sesion = $1`,
                [id_sesion]
            );

            const efeEgresos = parseFloat(movs.rows[0].efe_egresos);
            const efeIngresos = parseFloat(movs.rows[0].efe_ingresos);

            const montoEsperado =
                (montoInicial + vEfe + efeIngresos) - efeEgresos;

            const diferencia =
                parseFloat(monto_final_efectivo) - montoEsperado;

            await db.query(
                `UPDATE sesiones_caja 
                SET 
                    monto_ventas_efectivo = $1,
                    monto_ventas_digital = $2,
                    monto_ventas_tarjeta = $3,
                    monto_final_efectivo = $4,
                    estado = 'cerrada',
                    fecha_cierre = NOW()
                WHERE id_sesion = $5`,
                [
                    vEfe,
                    vDig,
                    vTar,
                    monto_final_efectivo,
                    id_sesion
                ]
            );

            return res.json({
                message: "Caja cerrada correctamente",
                detalle: { diferencia }
            });

        } catch (error) {
            return res.status(500).json({
                error: "Error al cerrar",
                details: error.message
            });
        }
    },

    obtenerHistorial: async (req, res) => {
        try {
            const result = await db.query(
                `SELECT 
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
                LIMIT 30`
            );

            return res.json(result.rows);

        } catch (error) {
            return res.status(500).json({
                error: "Error al obtener el historial",
                details: error.message
            });
        }
    },

    obtenerEstadoActual: async (req, res) => {
        const id_usuario = req.user.id;

        try {
            const sesionResult = await db.query(
                `SELECT id_sesion, monto_inicial, fecha_apertura 
                FROM sesiones_caja 
                WHERE id_usuario = $1 AND estado = 'abierta'`,
                [id_usuario]
            );

            if (sesionResult.rows.length === 0) {
                return res.json({ abierta: false });
            }

            const sesion = sesionResult.rows[0];
            const id_sesion = sesion.id_sesion;
            const montoInicial = parseFloat(sesion.monto_inicial);

            const ventasResult = await db.query(
                `SELECT 
                    COALESCE(SUM(monto_efectivo), 0) as efe,
                    COALESCE(SUM(monto_transferencia), 0) as dig,
                    COALESCE(SUM(total_final - monto_efectivo - monto_transferencia), 0) as tar
                FROM ventas
                WHERE id_sesion = $1
                AND COALESCE(estado, 'activa') = 'activa'`,
                [id_sesion]
            );

            const movimientosTotalesResult = await db.query(
                `SELECT 
                    COALESCE(SUM(CASE WHEN tipo = 'egreso' AND metodo_pago = 'efectivo' THEN monto ELSE 0 END), 0) as total_egresos_efe,
                    COALESCE(SUM(CASE WHEN tipo = 'ingreso' AND metodo_pago = 'efectivo' THEN monto ELSE 0 END), 0) as total_ingresos_efe,
                    COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0) as total_egresos_total,
                    COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) as total_ingresos_total
                FROM movimientos_caja 
                WHERE id_sesion = $1`,
                [id_sesion]
            );

            const movimientosResult = await db.query(
                `
                SELECT 
                    fecha_hora,
                    CONCAT('Venta #', id_venta) as descripcion,
                    'venta' as tipo,
                    'efectivo' as medio,
                    monto_efectivo as monto
                FROM ventas 
                WHERE id_sesion = $1 
                AND monto_efectivo > 0
                AND COALESCE(estado, 'activa') = 'activa'

                UNION ALL

                SELECT 
                    fecha_hora,
                    CONCAT('Venta #', id_venta) as descripcion,
                    'venta' as tipo,
                    'transferencia' as medio,
                    monto_transferencia as monto
                FROM ventas 
                WHERE id_sesion = $1 
                AND monto_transferencia > 0
                AND COALESCE(estado, 'activa') = 'activa'

                UNION ALL

                SELECT 
                    fecha_hora,
                    CONCAT('Venta #', id_venta) as descripcion,
                    'venta' as tipo,
                    'tarjeta' as medio,
                    (total_final - monto_efectivo - monto_transferencia) as monto
                FROM ventas 
                WHERE id_sesion = $1 
                AND (total_final - monto_efectivo - monto_transferencia) > 0
                AND COALESCE(estado, 'activa') = 'activa'

                UNION ALL

                SELECT 
                    fecha_hora,
                    concepto as descripcion,
                    tipo,
                    metodo_pago as medio,
                    monto
                FROM movimientos_caja 
                WHERE id_sesion = $1

                ORDER BY fecha_hora DESC
                LIMIT 10
                `,
                [id_sesion]
            );

            const vEfe = parseFloat(ventasResult.rows[0].efe);
            const vDig = parseFloat(ventasResult.rows[0].dig);
            const vTar = parseFloat(ventasResult.rows[0].tar);

            const totalEgresosEfe = parseFloat(movimientosTotalesResult.rows[0].total_egresos_efe);
            const totalIngresosEfe = parseFloat(movimientosTotalesResult.rows[0].total_ingresos_efe);

            const totalEgresosTotal = parseFloat(movimientosTotalesResult.rows[0].total_egresos_total);
            const totalIngresosTotal = parseFloat(movimientosTotalesResult.rows[0].total_ingresos_total);

            const efectivoEsperado =
                (montoInicial + vEfe + totalIngresosEfe) - totalEgresosEfe;

            return res.json({
                abierta: true,
                id_sesion,
                monto_inicial: montoInicial,
                ventas_efectivo: vEfe,
                ventas_digital: vDig,
                ventas_tarjeta: vTar,
                total_ingresos: totalIngresosTotal,
                total_egresos: totalEgresosTotal,
                efectivo_esperado: efectivoEsperado,
                movimientos: movimientosResult.rows
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: "Error al obtener estado real",
                details: error.message
            });
        }
    }
};

module.exports = cajaController;
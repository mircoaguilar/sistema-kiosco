const db = require('../config/db');
const { imprimirTicket } = require('../services/printer');

const ventasController = {

    crearVenta: async (req, res) => {
        const {
            metodo_pago,
            total_venta,
            monto_efectivo,
            monto_transferencia,
            monto_tarjeta,
            tipo_tarjeta,
            items,
            imprimir_ticket
        } = req.body;

        const id_usuario = req.user.id;
        const id_sesion = req.id_sesion_activa;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: "Lista de items inválida" });
        }

        try {
            await db.query('BEGIN');

            let recargo_porcentaje = 0;
            let recargo_monto = 0;
            let base_total = parseFloat(total_venta);

            if (metodo_pago === 'tarjeta') {
                recargo_porcentaje = 8;
                recargo_monto = base_total * 0.08;
            }

            const total_final = base_total + recargo_monto;

            const efectivoFinal =
                (metodo_pago === 'efectivo' || metodo_pago === 'mixto')
                    ? (monto_efectivo || 0)
                    : 0;

            const transferenciaFinal =
                (metodo_pago === 'transferencia' || metodo_pago === 'mixto')
                    ? (monto_transferencia || 0)
                    : 0;

            const tarjetaFinal =
                metodo_pago === 'tarjeta'
                    ? base_total
                    : 0;

            const ventaResult = await db.query(
                `INSERT INTO ventas 
                (id_usuario, id_sesion, total_venta, total_final,
                monto_efectivo, monto_transferencia, monto_tarjeta,
                metodo_pago, tipo_tarjeta,
                recargo_porcentaje, recargo_monto)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                RETURNING id_venta`,
                [
                    id_usuario,
                    id_sesion,
                    base_total,
                    total_final,
                    efectivoFinal,
                    transferenciaFinal,
                    tarjetaFinal,
                    metodo_pago,
                    tipo_tarjeta || null,
                    recargo_porcentaje,
                    recargo_monto
                ]
            );

            const id_venta = ventaResult.rows[0].id_venta;

            for (const item of items) {
                const cantidad = item.es_manual ? 1 : item.cantidad;

                if (item.es_manual) {
                    await db.query(
                        `INSERT INTO detalle_ventas
                        (id_venta, id_producto, descripcion_manual, es_manual, cantidad, precio_unitario, subtotal, id_categoria)
                        VALUES ($1, NULL, $2, true, $3, $4, $5, $6)`,
                        [
                            id_venta,
                            item.descripcion_manual,
                            cantidad,
                            item.precio_unitario,
                            cantidad * item.precio_unitario,
                            item.id_categoria || null
                        ]
                    );
                } else {
                    await db.query(
                        `INSERT INTO detalle_ventas
                        (id_venta, id_producto, cantidad, precio_unitario, subtotal)
                        VALUES ($1,$2,$3,$4,$5)`,
                        [
                            id_venta,
                            item.id_producto,
                            cantidad,
                            item.precio_unitario,
                            cantidad * item.precio_unitario
                        ]
                    );

                    await db.query(
                        `UPDATE productos 
                        SET stock = stock - $1 
                        WHERE id_producto = $2`,
                        [cantidad, item.id_producto]
                    );
                }
            }

            await db.query('COMMIT');

            if (imprimir_ticket) {
                try {
                    await imprimirTicket({
                        id_venta,
                        total_venta: base_total,
                        total_final,
                        metodo_pago,
                        tipo_tarjeta,
                        recargo_monto,
                        monto_pagado: total_final,
                        items
                    });
                } catch (pErr) {
                    console.error("Error ticket:", pErr);
                }
            }

            res.json({
                message: "Venta registrada",
                id_venta
            });

        } catch (error) {
            await db.query('ROLLBACK');

            res.status(500).json({
                error: "Error en venta",
                details: error.message
            });
        }
    },

    reimprimirUltimo: async (req, res) => {
        try {
            const ventasResult = await db.query(
                `SELECT * 
                FROM ventas 
                WHERE id_usuario = $1 
                ORDER BY id_venta DESC 
                LIMIT 1`,
                [req.user.id]
            );

            const ventas = ventasResult.rows;

            if (ventas.length === 0) {
                return res.status(404).json({ error: "No hay ventas para reimprimir" });
            }

            const venta = ventas[0];

            const itemsResult = await db.query(
                `SELECT 
                    dv.*,
                    COALESCE(dv.descripcion_manual, p.nombre) AS nombre
                FROM detalle_ventas dv
                LEFT JOIN productos p ON dv.id_producto = p.id_producto
                WHERE dv.id_venta = $1`,
                [venta.id_venta]
            );

            const items = itemsResult.rows;

            await imprimirTicket({
                id_venta: venta.id_venta,
                total_venta: venta.total_venta,
                total_final: venta.total_final,
                metodo_pago: venta.metodo_pago,
                tipo_tarjeta: venta.tipo_tarjeta,
                recargo_monto: venta.recargo_monto,
                monto_pagado: venta.total_final,
                items
            });

            res.json({ message: "Ticket enviado a la impresora" });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error al reimprimir" });
        }
    },

    historialVentas: async (req, res) => {
        try {
            const { desde, hasta, estado, hora_desde, hora_hasta } = req.query;

            let filtros = `WHERE 1=1`;
            let params = [];
            let idx = 1;

            if (desde) {
                filtros += ` AND DATE(v.fecha_hora) >= $${idx++}`;
                params.push(desde);
            }

            if (hasta) {
                filtros += ` AND DATE(v.fecha_hora) <= $${idx++}`;
                params.push(hasta);
            }

            if (hora_desde) {
                filtros += ` AND CAST(v.fecha_hora AS time) >= $${idx++}`;
                params.push(hora_desde);
            }

            if (hora_hasta) {
                filtros += ` AND CAST(v.fecha_hora AS time) <= $${idx++}`;
                params.push(hora_hasta);
            }

            if (estado) {
                filtros += ` AND v.estado = $${idx++}`;
                params.push(estado);
            }

            const result = await db.query(
                `SELECT 
                    v.id_venta,
                    TO_CHAR(
                        (v.fecha_hora AT TIME ZONE 'UTC')
                        AT TIME ZONE 'America/Argentina/Buenos_Aires',
                        'YYYY-MM-DD HH24:MI:SS'
                    ) AS fecha_hora,
                    u.nombre_completo AS vendedor,
                    v.metodo_pago,
                    v.total_final,
                    v.estado
                FROM ventas v
                JOIN usuarios u ON v.id_usuario = u.id_usuario
                ${filtros}
                ORDER BY v.fecha_hora DESC`,
                params
            );

            console.log(result.rows[0]);

            res.json(result.rows);

        } catch (error) {
            res.status(500).json({
                error: "Error al obtener historial",
                details: error.message
            });
        }
    },

    detalleVenta: async (req, res) => {
        const { id } = req.params;

        try {
            const ventasResult = await db.query(
                `SELECT 
                    v.*,
                    u.nombre_completo AS vendedor
                FROM ventas v
                JOIN usuarios u ON v.id_usuario = u.id_usuario
                WHERE v.id_venta = $1`,
                [id]
            );

            const ventas = ventasResult.rows;

            if (ventas.length === 0) {
                return res.status(404).json({
                    error: "Venta no encontrada"
                });
            }

            const venta = ventas[0];

            const itemsResult = await db.query(
                `SELECT 
                    dv.*,
                    COALESCE(dv.descripcion_manual, p.nombre) AS nombre
                FROM detalle_ventas dv
                LEFT JOIN productos p ON dv.id_producto = p.id_producto
                WHERE dv.id_venta = $1`,
                [id]
            );

            const items = itemsResult.rows;

            res.json({
                venta,
                items
            });

        } catch (error) {
            res.status(500).json({
                error: "Error al obtener detalle",
                details: error.message
            });
        }
    },

    anularVenta: async (req, res) => {
        const { id } = req.params;
        const { motivo } = req.body;

        if (!motivo || motivo.trim().length < 3) {
            return res.status(400).json({
                error: "Motivo de anulación obligatorio"
            });
        }

        try {
            await db.query("BEGIN");

            const ventasResult = await db.query(
                `SELECT * 
                FROM ventas 
                WHERE id_venta = $1`,
                [id]
            );

            if (ventasResult.rows.length === 0) {
                await db.query("ROLLBACK");
                return res.status(404).json({
                    error: "Venta no encontrada"
                });
            }

            const venta = ventasResult.rows[0];

            if (venta.estado === "anulada") {
                await db.query("ROLLBACK");
                return res.status(400).json({
                    error: "La venta ya fue anulada"
                });
            }

            const detallesResult = await db.query(
                `SELECT * 
                FROM detalle_ventas 
                WHERE id_venta = $1`,
                [id]
            );

            for (const item of detallesResult.rows) {
                if (item.id_producto) {
                    await db.query(
                        `UPDATE productos
                        SET stock = stock + $1
                        WHERE id_producto = $2`,
                        [item.cantidad, item.id_producto]
                    );
                }
            }

            await db.query(
                `UPDATE ventas
                SET 
                    estado = 'anulada',
                    motivo_anulacion = $1,
                    fecha_anulacion = NOW(),
                    id_usuario_anulacion = $2
                WHERE id_venta = $3`,
                [motivo, req.user.id, id]
            );

            await db.query("COMMIT");

            return res.json({
                message: "Venta anulada correctamente"
            });

        } catch (error) {
            await db.query("ROLLBACK");

            return res.status(500).json({
                error: "Error al anular venta",
                details: error.message
            });
        }
    },

    corregirVenta: async (req, res) => {

        console.log("BODY CORRECCION:", req.body);

        const { id } = req.params;
        const {
            items,
            metodo_pago,
            monto_efectivo,
            monto_transferencia,
            monto_tarjeta,
            tipo_tarjeta,
            motivo
        } = req.body;

        if (!motivo || motivo.trim().length < 3) {
            return res.status(400).json({
                error: "Motivo de corrección obligatorio"
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                error: "Items inválidos"
            });
        }

        try {
            await db.query("BEGIN");

            const ventasResult = await db.query(
                `SELECT * FROM ventas WHERE id_venta = $1`,
                [id]
            );

            if (ventasResult.rows.length === 0) {
                await db.query("ROLLBACK");
                return res.status(404).json({
                    error: "Venta no encontrada"
                });
            }

            const venta = ventasResult.rows[0];

            if (venta.estado === 'anulada') {
                await db.query("ROLLBACK");
                return res.status(400).json({
                    error: "No se puede corregir una venta anulada"
                });
            }

            const detallesActualesResult = await db.query(
                `SELECT * FROM detalle_ventas WHERE id_venta = $1`,
                [id]
            );

            const detallesActuales = detallesActualesResult.rows;

            await db.query(
                `INSERT INTO ventas_correcciones
                (id_venta, id_usuario, motivo, datos_anteriores)
                VALUES ($1, $2, $3, $4)`,
                [
                    id,
                    req.user.id,
                    motivo,
                    JSON.stringify({
                        venta,
                        items: detallesActuales
                    })
                ]
            );

            for (const item of detallesActuales) {
                if (item.id_producto) {
                    await db.query(
                        `UPDATE productos
                        SET stock = stock + $1
                        WHERE id_producto = $2`,
                        [item.cantidad, item.id_producto]
                    );
                }
            }

            await db.query(
                `DELETE FROM detalle_ventas WHERE id_venta = $1`,
                [id]
            );

            let nuevoTotal = 0;

            for (const item of items) {
                const cantidad = item.es_manual ? 1 : item.cantidad;
                const subtotal = cantidad * item.precio_unitario;
                nuevoTotal += subtotal;

                if (item.es_manual) {
                    await db.query(
                        `INSERT INTO detalle_ventas
                        (id_venta, id_producto, descripcion_manual, es_manual, cantidad, precio_unitario, subtotal, id_categoria)
                        VALUES ($1, NULL, $2, TRUE, $3, $4, $5, $6)`,
                        [
                            id,
                            item.descripcion_manual,
                            cantidad,
                            item.precio_unitario,
                            subtotal,
                            item.id_categoria || null
                        ]
                    );
                } else {
                    await db.query(
                        `INSERT INTO detalle_ventas
                        (id_venta, id_producto, cantidad, precio_unitario, subtotal)
                        VALUES ($1, $2, $3, $4, $5)`,
                        [
                            id,
                            item.id_producto,
                            cantidad,
                            item.precio_unitario,
                            subtotal
                        ]
                    );

                    await db.query(
                        `UPDATE productos
                        SET stock = stock - $1
                        WHERE id_producto = $2`,
                        [cantidad, item.id_producto]
                    );
                }
            }

            let recargo_porcentaje = 0;
            let recargo_monto = 0;

            if (metodo_pago === 'tarjeta') {
                recargo_porcentaje = 8;
                recargo_monto = nuevoTotal * 0.08;
            }

            const total_final = nuevoTotal + recargo_monto;

            await db.query(
                `UPDATE ventas
                SET
                    total_venta = $1,
                    total_final = $2,
                    metodo_pago = $3,
                    monto_efectivo = $4,
                    monto_transferencia = $5,
                    monto_tarjeta = $6,
                    tipo_tarjeta = $7,
                    recargo_porcentaje = $8,
                    recargo_monto = $9,
                    corregida = TRUE,
                    motivo_correccion = $10,
                    fecha_correccion = NOW(),
                    id_usuario_correccion = $11
                WHERE id_venta = $12`,
                [
                    nuevoTotal,
                    total_final,
                    metodo_pago,
                    monto_efectivo || 0,
                    monto_transferencia || 0,
                    monto_tarjeta || 0,
                    tipo_tarjeta || null,
                    recargo_porcentaje,
                    recargo_monto,
                    motivo,
                    req.user.id,
                    id
                ]
            );

            await db.query("COMMIT");

            return res.json({
                message: "Venta corregida correctamente",
                id_venta: id,
                total_final
            });

        } catch (error) {
            await db.query("ROLLBACK");

            console.error("ERROR CORREGIR:", error);

            return res.status(500).json({
                error: "Error al corregir venta",
                details: error.message
            });
        }
    }
};

module.exports = ventasController;
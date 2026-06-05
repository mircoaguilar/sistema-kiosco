const db = require('../config/db');

const reportesController = {

    reporteProductosDia: async (req, res) => {
        try {
            const {
                categoria,
                proveedor,
                desde,
                hasta,
                hora_desde,
                hora_hasta
            } = req.query;

            // 1. Configuración de Fechas Base (Común para todo)
            let fechaInicio = desde ? `${desde} ${hora_desde || '00:00:00'}` : null;
            let fechaFin = hasta ? `${hasta} ${hora_hasta || '23:59:59'}` : null;

            let filtrosBase = `WHERE COALESCE(v.estado, 'activa') = 'activa'`;
            let paramsBase = [];

            if (fechaInicio && fechaFin) {
                filtrosBase += ` AND v.fecha_hora BETWEEN $1 AND $2`;
                paramsBase.push(fechaInicio, fechaFin);
            } else if (fechaInicio) {
                filtrosBase += ` AND v.fecha_hora >= $1`;
                paramsBase.push(fechaInicio);
            } else if (fechaFin) {
                filtrosBase += ` AND v.fecha_hora <= $1`;
                paramsBase.push(fechaFin);
            } else {
                filtrosBase += ` AND DATE(v.fecha_hora) = CURRENT_DATE`;
            }

            // 2. QUERY 1: Obtener Medios de Pago y Totales (No deben afectarse por filtros de productos)
            const mediosPagoResult = await db.query(`
                SELECT
                    COALESCE(SUM(v.monto_efectivo), 0) AS total_efectivo,
                    COALESCE(SUM(v.monto_transferencia), 0) AS total_transferencia,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN v.monto_tarjeta > 0
                                THEN v.monto_tarjeta + COALESCE(v.recargo_monto, 0)
                                ELSE 0
                            END
                        ),
                        0
                    ) AS total_tarjeta,
                    COALESCE(SUM(v.total_final), 0) AS total_dia
                FROM ventas v
                ${filtrosBase}
            `, paramsBase);

            const resumenMedios = mediosPagoResult.rows[0];

            // 3. QUERY 2: Cantidad de Ventas Únicas
            // Modificamos para que no haga JOIN con productos a menos que se filtre por ellos, 
            // evitando duplicación de registros en el COUNT.
            let filtrosCantidad = filtrosBase;
            let paramsCantidad = [...paramsBase];

            let joinProductosParaConteo = "";
            if (categoria || proveedor) {
                joinProductosParaConteo = `
                    JOIN detalle_ventas dv ON v.id_venta = dv.id_venta
                    LEFT JOIN productos p ON dv.id_producto = p.id_producto
                `;
                if (categoria) {
                    filtrosCantidad += ` AND (p.id_categoria = $${paramsCantidad.length + 1} OR dv.id_categoria = $${paramsCantidad.length + 1})`;
                    paramsCantidad.push(categoria);
                }
                if (proveedor) {
                    filtrosCantidad += ` AND p.id_proveedor = $${paramsCantidad.length + 1}`;
                    paramsCantidad.push(proveedor);
                }
            }

            const ventasCountResult = await db.query(`
                SELECT COUNT(DISTINCT v.id_venta) AS total_ventas
                FROM ventas v
                ${joinProductosParaConteo}
                ${filtrosCantidad}
            `, paramsCantidad);

            const cantidadVentas = ventasCountResult.rows[0].total_ventas;

            // 4. QUERY 3: Detalle de Productos Vendidos
            let filtrosProductos = filtrosBase;
            let paramsProductos = [...paramsBase];

            if (categoria) {
                filtrosProductos += ` AND (p.id_categoria = $${paramsProductos.length + 1} OR dv.id_categoria = $${paramsProductos.length + 1})`;
                paramsProductos.push(categoria);
            }
            if (proveedor) {
                filtrosProductos += ` AND p.id_proveedor = $${paramsProductos.length + 1}`;
                paramsProductos.push(proveedor);
            }

            const productosResult = await db.query(`
                SELECT 
                    COALESCE(dv.descripcion_manual, p.nombre) AS nombre,
                    MAX(c.nombre_categoria) AS categoria,
                    MAX(pr.nombre) AS proveedor,
                    SUM(dv.cantidad) AS cantidad,
                    SUM(dv.subtotal * (1 + COALESCE(v.recargo_porcentaje, 0) / 100)) AS total
                FROM detalle_ventas dv
                LEFT JOIN productos p ON dv.id_producto = p.id_producto
                LEFT JOIN categorias c ON c.id_categoria = COALESCE(p.id_categoria, dv.id_categoria)
                LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                JOIN ventas v ON dv.id_venta = v.id_venta
                ${filtrosProductos}
                GROUP BY COALESCE(dv.descripcion_manual, p.nombre)
                ORDER BY total DESC
            `, paramsProductos);

            return res.json({
                resumen: {
                    total_dia: resumenMedios.total_dia,
                    cantidad_ventas: cantidadVentas,
                    total_efectivo: resumenMedios.total_efectivo,
                    total_transferencia: resumenMedios.total_transferencia,
                    total_tarjeta: resumenMedios.total_tarjeta
                },
                productos: productosResult.rows
            });

        } catch (error) {
            return res.status(500).json({
                error: "Error al generar reporte",
                details: error.message
            });
        }
    },

    topProductos: async (req, res) => {
        try {
            const { desde, hasta, categoria } = req.query;

            let filtros = `WHERE COALESCE(v.estado, 'activa') = 'activa'`;
            let params = [];

            if (desde && hasta) {
                filtros += ` AND DATE(v.fecha_hora) BETWEEN $1 AND $2`;
                params.push(desde, hasta);

            } else if (desde) {
                filtros += ` AND DATE(v.fecha_hora) >= $1`;
                params.push(desde);

            } else if (hasta) {
                filtros += ` AND DATE(v.fecha_hora) <= $1`;
                params.push(hasta);

            } else {
                filtros += ` AND DATE(v.fecha_hora) = CURRENT_DATE`;
            }

            if (categoria) {
                filtros += ` AND (p.id_categoria = $${params.length + 1} OR dv.id_categoria = $${params.length + 1})`;
                params.push(categoria);
            }

            const result = await db.query(`
                SELECT 
                    COALESCE(dv.descripcion_manual, p.nombre) AS nombre,
                    SUM(dv.cantidad) AS cantidad
                FROM detalle_ventas dv
                LEFT JOIN productos p ON dv.id_producto = p.id_producto
                JOIN ventas v ON dv.id_venta = v.id_venta
                AND COALESCE(v.estado, 'activa') = 'activa'
                ${filtros}
                GROUP BY COALESCE(dv.descripcion_manual, p.nombre)
                ORDER BY cantidad DESC
                LIMIT 10
            `, params);

            return res.json(result.rows);

        } catch (error) {
            return res.status(500).json({
                error: "Error en top productos",
                details: error.message
            });
        }
    }
};

module.exports = reportesController;
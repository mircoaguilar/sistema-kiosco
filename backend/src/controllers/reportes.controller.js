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

            let filtrosProductos = `WHERE COALESCE(v.estado, 'activa') = 'activa'`;
            let filtrosCantidad = `WHERE COALESCE(v.estado, 'activa') = 'activa'`;

            let paramsProductos = [];
            let paramsCantidad = [];

            let fechaInicio = null;
            let fechaFin = null;

            if (desde) {
                fechaInicio = `${desde} ${hora_desde || '00:00:00'}`;
            }

            if (hasta) {
                fechaFin = `${hasta} ${hora_hasta || '23:59:59'}`;
            }

            if (fechaInicio && fechaFin) {
                filtrosProductos += ` AND v.fecha_hora BETWEEN $1 AND $2`;
                filtrosCantidad += ` AND v.fecha_hora BETWEEN $1 AND $2`;

                paramsProductos.push(fechaInicio, fechaFin);
                paramsCantidad.push(fechaInicio, fechaFin);

            } else if (fechaInicio) {
                filtrosProductos += ` AND v.fecha_hora >= $1`;
                filtrosCantidad += ` AND v.fecha_hora >= $1`;

                paramsProductos.push(fechaInicio);
                paramsCantidad.push(fechaInicio);

            } else if (fechaFin) {
                filtrosProductos += ` AND v.fecha_hora <= $1`;
                filtrosCantidad += ` AND v.fecha_hora <= $1`;

                paramsProductos.push(fechaFin);
                paramsCantidad.push(fechaFin);

            } else {
                filtrosProductos += ` AND DATE(v.fecha_hora) = CURRENT_DATE`;
                filtrosCantidad += ` AND DATE(v.fecha_hora) = CURRENT_DATE`;
            }

            if (categoria) {
                filtrosProductos += ` AND (p.id_categoria = $${paramsProductos.length + 1} OR dv.id_categoria = $${paramsProductos.length + 1})`;
                filtrosCantidad += ` AND (p.id_categoria = $${paramsCantidad.length + 1} OR dv.id_categoria = $${paramsCantidad.length + 1})`;

                paramsProductos.push(categoria);
                paramsCantidad.push(categoria);
            }

            if (proveedor) {
                filtrosProductos += ` AND p.id_proveedor = $${paramsProductos.length + 1}`;
                filtrosCantidad += ` AND p.id_proveedor = $${paramsCantidad.length + 1}`;

                paramsProductos.push(proveedor);
                paramsCantidad.push(proveedor);
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
                LEFT JOIN categorias c 
                    ON c.id_categoria = COALESCE(p.id_categoria, dv.id_categoria)
                LEFT JOIN proveedores pr 
                    ON p.id_proveedor = pr.id_proveedor
                JOIN ventas v 
                    ON dv.id_venta = v.id_venta
                ${filtrosProductos}
                GROUP BY COALESCE(dv.descripcion_manual, p.nombre)
                ORDER BY total DESC
            `, paramsProductos);

            const rows = productosResult.rows;

            const totalGeneral = rows.reduce((acc, item) => {
                return acc + parseFloat(item.total);
            }, 0);

            const ventasCountResult = await db.query(`
                SELECT COUNT(DISTINCT v.id_venta) AS total_ventas
                FROM ventas v
                JOIN detalle_ventas dv ON v.id_venta = dv.id_venta
                LEFT JOIN productos p ON dv.id_producto = p.id_producto
                ${filtrosCantidad}
            `, paramsCantidad);

            const cantidadVentas = ventasCountResult.rows[0].total_ventas;

            return res.json({
                resumen: {
                    total_dia: totalGeneral,
                    cantidad_ventas: cantidadVentas
                },
                productos: rows
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
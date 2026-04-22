const db = require('../config/db');

const reportesController = {

    reporteProductosDia: async (req, res) => {
        try {
            const { categoria, proveedor, desde, hasta } = req.query;

            // 🔹 FILTROS PRODUCTOS
            let filtrosProductos = `WHERE 1=1`;
            let paramsProductos = [];

            // 🔹 FILTROS VENTAS (sin p)
            let filtrosVentas = `WHERE 1=1`;
            let paramsVentas = [];

            // 🔥 FECHAS (en ambos)
            if (desde && hasta) {
                filtrosProductos += ` AND DATE(v.fecha_hora) BETWEEN ? AND ?`;
                filtrosVentas += ` AND DATE(v.fecha_hora) BETWEEN ? AND ?`;
                paramsProductos.push(desde, hasta);
                paramsVentas.push(desde, hasta);
            } else if (desde) {
                filtrosProductos += ` AND DATE(v.fecha_hora) >= ?`;
                filtrosVentas += ` AND DATE(v.fecha_hora) >= ?`;
                paramsProductos.push(desde);
                paramsVentas.push(desde);
            } else if (hasta) {
                filtrosProductos += ` AND DATE(v.fecha_hora) <= ?`;
                filtrosVentas += ` AND DATE(v.fecha_hora) <= ?`;
                paramsProductos.push(hasta);
                paramsVentas.push(hasta);
            } else {
                filtrosProductos += ` AND DATE(v.fecha_hora) = CURDATE()`;
                filtrosVentas += ` AND DATE(v.fecha_hora) = CURDATE()`;
            }

            // 🔹 SOLO PRODUCTOS
            if (categoria) {
                filtrosProductos += ` AND p.id_categoria = ?`;
                paramsProductos.push(categoria);
            }

            if (proveedor) {
                filtrosProductos += ` AND p.id_proveedor = ?`;
                paramsProductos.push(proveedor);
            }

            // 🔹 QUERY PRODUCTOS
            const [rows] = await db.query(`
                SELECT 
                    p.nombre,
                    c.nombre_categoria AS categoria,
                    pr.nombre AS proveedor,
                    SUM(dv.cantidad) AS cantidad,
                    SUM(dv.subtotal) AS total
                FROM detalle_ventas dv
                JOIN productos p ON dv.id_producto = p.id_producto
                LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                JOIN ventas v ON dv.id_venta = v.id_venta
                ${filtrosProductos}
                GROUP BY p.id_producto
                ORDER BY total DESC
            `, paramsProductos);

            // 🔹 TOTAL GENERAL
            const totalGeneral = rows.reduce((acc, item) => {
                return acc + parseFloat(item.total);
            }, 0);

            // 🔹 QUERY CANTIDAD DE VENTAS
            const [ventasCount] = await db.query(`
                SELECT COUNT(*) AS total_ventas
                FROM ventas v
                ${filtrosVentas}
            `, paramsVentas);

            const cantidadVentas = ventasCount[0].total_ventas;

            // 🔹 RESPONSE
            res.json({
                resumen: {
                    total_dia: totalGeneral,
                    cantidad_ventas: cantidadVentas
                },
                productos: rows
            });

        } catch (error) {
            res.status(500).json({
                error: "Error al generar reporte",
                details: error.message
            });
        }
    }

};

module.exports = reportesController;
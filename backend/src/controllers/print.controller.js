const db = require("../config/db");

exports.getPending = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                v.id_venta,
                v.fecha_hora,
                v.total_venta,
                dv.id_producto,
                dv.cantidad,
                dv.precio_unitario,
                dv.descripcion_manual
            FROM ventas v
            JOIN detalle_ventas dv ON v.id_venta = dv.id_venta
            WHERE v.impreso = 0
            ORDER BY v.id_venta ASC
        `);

        const ventasMap = {};

        rows.forEach(r => {
            if (!ventasMap[r.id_venta]) {
                ventasMap[r.id_venta] = {
                    id_venta: r.id_venta,
                    fecha_hora: r.fecha_hora,
                    total_venta: r.total_venta,
                    items: []
                };
            }

            ventasMap[r.id_venta].items.push({
                nombre: r.descripcion_manual || `Producto ${r.id_producto}`,
                cantidad: r.cantidad,
                precio_unitario: r.precio_unitario
            });
        });

        const result = Object.values(ventasMap);

        res.json(result);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.markAsPrinted = async (req, res) => {
    try {
        const { id } = req.body;

        await db.query(`
            UPDATE ventas
            SET impreso = 1
            WHERE id_venta = ?
        `, [id]);

        res.json({ ok: true });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const db = require("../config/db");

exports.getPending = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT * FROM ventas
            WHERE impreso = 0
            ORDER BY id_venta ASC
            LIMIT 20
        `);

        res.json(rows);

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
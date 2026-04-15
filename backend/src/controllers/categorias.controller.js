const db = require('../config/db');

const categoriasController = {
    obtenerTodas: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM categorias WHERE activa = 1 ORDER BY nombre_categoria ASC');
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: "Error al obtener categorías", details: error.message });
        }
    },

    crear: async (req, res) => {
        const { nombre_categoria } = req.body;
        try {
            const [result] = await db.query('INSERT INTO categorias (nombre_categoria) VALUES (?)', [nombre_categoria]);
            res.json({ message: "Categoría creada", id: result.insertId });
        } catch (error) {
            res.status(500).json({ error: "Error al crear categoría", details: error.message });
        }
    },

    eliminar: async (req, res) => {
        const { id } = req.params;
        try {
            await db.query('UPDATE categorias SET activa = 0 WHERE id_categoria = ?', [id]);
            res.json({ message: "Categoría eliminada correctamente" });
        } catch (error) {
            res.status(500).json({ error: "Error al eliminar categoría", details: error.message });
        }
    }
};

module.exports = categoriasController;
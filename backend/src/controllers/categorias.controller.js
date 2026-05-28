const db = require('../config/db');

const categoriasController = {

    obtenerTodas: async (req, res) => {
        try {
            const result = await db.query(
                `SELECT * 
                 FROM categorias 
                 WHERE activa = TRUE 
                 ORDER BY nombre_categoria ASC`
            );

            return res.json(result.rows);

        } catch (error) {
            return res.status(500).json({
                error: "Error al obtener categorías",
                details: error.message
            });
        }
    },

    crear: async (req, res) => {
        const { nombre_categoria } = req.body;

        try {
            const result = await db.query(
                `INSERT INTO categorias (nombre_categoria)
                 VALUES ($1)
                 RETURNING id_categoria`,
                [nombre_categoria]
            );

            return res.json({
                message: "Categoría creada",
                id: result.rows[0].id_categoria
            });

        } catch (error) {
            return res.status(500).json({
                error: "Error al crear categoría",
                details: error.message
            });
        }
    },

    eliminar: async (req, res) => {
        const { id } = req.params;

        try {
            await db.query(
                `UPDATE categorias 
                 SET activa = FALSE 
                 WHERE id_categoria = $1`,
                [id]
            );

            return res.json({
                message: "Categoría eliminada correctamente"
            });

        } catch (error) {
            return res.status(500).json({
                error: "Error al eliminar categoría",
                details: error.message
            });
        }
    }
};

module.exports = categoriasController;
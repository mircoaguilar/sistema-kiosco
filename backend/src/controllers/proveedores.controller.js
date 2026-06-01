const db = require('../config/db');

const proveedoresController = {

    obtenerTodos: async (req, res) => {
        try {
            const result = await db.query(
                `SELECT * 
                 FROM proveedores 
                 WHERE activo = TRUE 
                 ORDER BY nombre ASC`
            );

            return res.json(result.rows);

        } catch (error) {
            return res.status(500).json({
                error: "Error al obtener proveedores",
                details: error.message
            });
        }
    },

    obtenerPorId: async (req, res) => {
        const { id } = req.params;

        try {
            const result = await db.query(
                `SELECT * 
                 FROM proveedores 
                 WHERE id_proveedor = $1`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: "Proveedor no encontrado"
                });
            }

            return res.json(result.rows[0]);

        } catch (error) {
            return res.status(500).json({
                error: "Error al buscar proveedor",
                details: error.message
            });
        }
    },

    crear: async (req, res) => {
        let { nombre, telefono, email, direccion } = req.body;

        try {
            nombre = nombre?.trim();
            telefono = telefono?.trim();
            email = email?.trim();
            direccion = direccion?.trim();

            if (!nombre || nombre.length < 3) {
                return res.status(400).json({
                    error: "El nombre es obligatorio (mínimo 3 caracteres)"
                });
            }

            if (telefono && !/^[0-9]+$/.test(telefono)) {
                return res.status(400).json({
                    error: "El teléfono debe contener solo números"
                });
            }

            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({
                    error: "Email inválido"
                });
            }

            const existe = await db.query(
                `SELECT id_proveedor 
                FROM proveedores 
                WHERE nombre = $1 AND activo = TRUE`,
                [nombre]
            );

            if (existe.rows.length > 0) {
                return res.status(400).json({
                    error: "Ya existe un proveedor con ese nombre"
                });
            }

            const result = await db.query(
                `INSERT INTO proveedores 
                (nombre, telefono, email, direccion) 
                VALUES ($1, $2, $3, $4)
                RETURNING id_proveedor`,
                [
                    nombre,
                    telefono || null,
                    email || null,
                    direccion || null
                ]
            );

            return res.json({
                message: "Proveedor creado correctamente",
                id: result.rows[0].id_proveedor
            });

        } catch (error) {
            return res.status(500).json({
                error: "Error al crear proveedor",
                details: error.message
            });
        }
    },

    actualizar: async (req, res) => {
        const { id } = req.params;
        let { nombre, telefono, email, direccion } = req.body;

        try {
            nombre = nombre?.trim();
            telefono = telefono?.trim();
            email = email?.trim();
            direccion = direccion?.trim();

            if (!nombre || nombre.length < 3) {
                return res.status(400).json({
                    error: "El nombre es obligatorio (mínimo 3 caracteres)"
                });
            }

            if (telefono && !/^[0-9]+$/.test(telefono)) {
                return res.status(400).json({
                    error: "El teléfono debe contener solo números"
                });
            }

            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({
                    error: "Email inválido"
                });
            }

            const existe = await db.query(
                `SELECT id_proveedor 
                FROM proveedores 
                WHERE nombre = $1 
                AND id_proveedor != $2 
                AND activo = TRUE`,
                [nombre, id]
            );

            if (existe.rows.length > 0) {
                return res.status(400).json({
                    error: "Ya existe otro proveedor con ese nombre"
                });
            }

            await db.query(
                `UPDATE proveedores 
                SET nombre = $1,
                    telefono = $2,
                    email = $3,
                    direccion = $4
                WHERE id_proveedor = $5`,
                [
                    nombre,
                    telefono || null,
                    email || null,
                    direccion || null,
                    id
                ]
            );

            return res.json({
                message: "Proveedor actualizado correctamente"
            });

        } catch (error) {
            return res.status(500).json({
                error: "Error al actualizar proveedor",
                details: error.message
            });
        }
    },

    eliminar: async (req, res) => {
        const { id } = req.params;

        try {
            await db.query(
                `UPDATE proveedores 
                SET activo = FALSE 
                WHERE id_proveedor = $1`,
                [id]
            );

            return res.json({
                message: "Proveedor eliminado correctamente"
            });

        } catch (error) {
            return res.status(500).json({
                error: "Error al eliminar proveedor",
                details: error.message
            });
        }
    }
};

module.exports = proveedoresController;
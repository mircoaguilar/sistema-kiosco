const db = require('../config/db');

const proveedoresController = {

    obtenerTodos: async (req, res) => {
        try {
            const [rows] = await db.query(
                'SELECT * FROM proveedores WHERE activo = 1 ORDER BY nombre ASC'
            );
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: "Error al obtener proveedores", details: error.message });
        }
    },

    obtenerPorId: async (req, res) => {
        const { id } = req.params;

        try {
            const [rows] = await db.query(
                'SELECT * FROM proveedores WHERE id_proveedor = ?',
                [id]
            );

            if (rows.length === 0) {
                return res.status(404).json({ message: "Proveedor no encontrado" });
            }

            res.json(rows[0]);

        } catch (error) {
            res.status(500).json({ error: "Error al buscar proveedor", details: error.message });
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
                return res.status(400).json({ error: "El nombre es obligatorio (mínimo 3 caracteres)" });
            }

            if (telefono && !/^[0-9]+$/.test(telefono)) {
                return res.status(400).json({ error: "El teléfono debe contener solo números" });
            }

            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({ error: "Email inválido" });
            }

            const [existe] = await db.query(
                'SELECT id_proveedor FROM proveedores WHERE nombre = ? AND activo = 1',
                [nombre]
            );

            if (existe.length > 0) {
                return res.status(400).json({ error: "Ya existe un proveedor con ese nombre" });
            }

            const sql = `
                INSERT INTO proveedores 
                (nombre, telefono, email, direccion) 
                VALUES (?, ?, ?, ?)
            `;

            const [result] = await db.query(sql, [
                nombre,
                telefono || null,
                email || null,
                direccion || null
            ]);

            res.json({ message: "Proveedor creado correctamente", id: result.insertId });

        } catch (error) {
            res.status(500).json({ error: "Error al crear proveedor", details: error.message });
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
                return res.status(400).json({ error: "El nombre es obligatorio (mínimo 3 caracteres)" });
            }

            if (telefono && !/^[0-9]+$/.test(telefono)) {
                return res.status(400).json({ error: "El teléfono debe contener solo números" });
            }

            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({ error: "Email inválido" });
            }

            const [existe] = await db.query(
                'SELECT id_proveedor FROM proveedores WHERE nombre = ? AND id_proveedor != ? AND activo = 1',
                [nombre, id]
            );

            if (existe.length > 0) {
                return res.status(400).json({ error: "Ya existe otro proveedor con ese nombre" });
            }

            const sql = `
                UPDATE proveedores 
                SET nombre=?, telefono=?, email=?, direccion=? 
                WHERE id_proveedor=?
            `;

            await db.query(sql, [
                nombre,
                telefono || null,
                email || null,
                direccion || null,
                id
            ]);

            res.json({ message: "Proveedor actualizado correctamente" });

        } catch (error) {
            res.status(500).json({ error: "Error al actualizar proveedor", details: error.message });
        }
    },

    eliminar: async (req, res) => {
        const { id } = req.params;

        try {
            await db.query(
                'UPDATE proveedores SET activo = 0 WHERE id_proveedor = ?',
                [id]
            );

            res.json({ message: "Proveedor eliminado correctamente" });

        } catch (error) {
            res.status(500).json({ error: "Error al eliminar proveedor", details: error.message });
        }
    }
};

module.exports = proveedoresController;
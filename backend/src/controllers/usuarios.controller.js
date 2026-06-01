const db = require('../config/db');
const bcrypt = require('bcrypt');

const usuariosController = {

    crearUsuario: async (req, res) => {
        const { nombre_completo, usuario, password, rol } = req.body;
        const id_admin = req.user.id;

        try {
            if (!nombre_completo || !usuario || !password) {
                return res.status(400).json({
                    error: "Nombre, usuario y contraseña son obligatorios"
                });
            }

            const rolesValidos = ['administrador', 'vendedor'];
            const rolFinal = rol || 'vendedor';

            if (!rolesValidos.includes(rolFinal)) {
                return res.status(400).json({
                    error: "Rol inválido"
                });
            }

            const usuarioExistente = await db.query(
                `SELECT id_usuario 
                 FROM usuarios 
                 WHERE usuario = $1`,
                [usuario]
            );

            if (usuarioExistente.rows.length > 0) {
                return res.status(409).json({
                    error: "El nombre de usuario ya existe"
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const resultado = await db.query(
                `INSERT INTO usuarios 
                 (nombre_completo, usuario, password, rol)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id_usuario`,
                [
                    nombre_completo,
                    usuario,
                    hashedPassword,
                    rolFinal
                ]
            );

            await db.query(
                `INSERT INTO logs_sistema 
                 (id_usuario, accion, descripcion)
                 VALUES ($1, $2, $3)`,
                [
                    id_admin,
                    'CREAR_USUARIO',
                    `Creó usuario ${usuario} con rol ${rolFinal}`
                ]
            );

            return res.status(201).json({
                message: "Usuario creado exitosamente",
                id_usuario: resultado.rows[0].id_usuario
            });

        } catch (error) {
            return res.status(500).json({
                error: "Error al crear usuario",
                details: error.message
            });
        }
    },

    listarUsuarios: async (req, res) => {
        try {
            const result = await db.query(
                `SELECT id_usuario, nombre_completo, usuario, rol, estado, fecha_creacion
                FROM usuarios
                ORDER BY id_usuario DESC`
            );

            return res.json(result.rows);

        } catch (error) {
            return res.status(500).json({
                error: "Error al listar usuarios",
                details: error.message
            });
        }
    },

    obtenerUsuarioPorId: async (req, res) => {
        const { id } = req.params;

        try {
            const result = await db.query(
                `SELECT id_usuario, nombre_completo, usuario, rol, estado, fecha_creacion
                FROM usuarios
                WHERE id_usuario = $1`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "Usuario no encontrado"
                });
            }

            return res.json(result.rows[0]);

        } catch (error) {
            return res.status(500).json({
                error: "Error al obtener usuario",
                details: error.message
            });
        }
    },

    editarUsuario: async (req, res) => {
        const { id } = req.params;
        const { nombre_completo, usuario, password, rol, estado } = req.body;
        const id_admin = req.user.id;

        try {
            const rolesValidos = ['administrador', 'vendedor'];

            if (rol && !rolesValidos.includes(rol)) {
                return res.status(400).json({
                    error: "Rol inválido"
                });
            }

            const usuarioExistente = await db.query(
                `SELECT id_usuario 
                FROM usuarios 
                WHERE usuario = $1 AND id_usuario != $2`,
                [usuario, id]
            );

            if (usuarioExistente.rows.length > 0) {
                return res.status(409).json({
                    error: "El nombre de usuario ya está en uso"
                });
            }

            let query = `
                UPDATE usuarios 
                SET nombre_completo = $1,
                    usuario = $2,
                    rol = $3,
                    estado = $4
            `;

            let params = [
                nombre_completo,
                usuario,
                rol,
                estado
            ];

            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                query += `, password = $${params.length + 1}`;
                params.push(hashedPassword);
            }

            query += ` WHERE id_usuario = $${params.length + 1}`;
            params.push(id);

            await db.query(query, params);

            await db.query(
                `INSERT INTO logs_sistema (id_usuario, accion, descripcion)
                VALUES ($1, $2, $3)`,
                [
                    id_admin,
                    'EDITAR_USUARIO',
                    `Editó usuario ID ${id}`
                ]
            );

            return res.json({
                message: "Usuario actualizado correctamente"
            });

        } catch (error) {
            return res.status(500).json({
                error: "Error al editar usuario",
                details: error.message
            });
        }
    },

    cambiarEstadoUsuario: async (req, res) => {
        const { id } = req.params;
        const { estado } = req.body;
        const id_admin = req.user.id;

        try {
            await db.query(
                `UPDATE usuarios 
                SET estado = $1 
                WHERE id_usuario = $2`,
                [estado, id]
            );

            await db.query(
                `INSERT INTO logs_sistema (id_usuario, accion, descripcion)
                VALUES ($1, $2, $3)`,
                [
                    id_admin,
                    'CAMBIAR_ESTADO_USUARIO',
                    `Cambió estado del usuario ID ${id} a ${estado}`
                ]
            );

            return res.json({
                message: "Estado actualizado correctamente"
            });

        } catch (error) {
            return res.status(500).json({
                error: "Error al cambiar estado del usuario",
                details: error.message
            });
        }
    }
};

module.exports = usuariosController;
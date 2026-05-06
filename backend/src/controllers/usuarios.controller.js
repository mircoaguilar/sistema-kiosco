const db = require('../config/db');
const bcrypt = require('bcrypt');

const usuariosController = {
    crearUsuario: async (req, res) => {
        const { nombre_completo, usuario, password, rol } = req.body;
        const id_admin = req.usuario.id_usuario;

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

            const [usuarioExistente] = await db.query(
                'SELECT id_usuario FROM usuarios WHERE usuario = ?',
                [usuario]
            );

            if (usuarioExistente.length > 0) {
                return res.status(409).json({
                    error: "El nombre de usuario ya existe"
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const [resultado] = await db.query(
                `INSERT INTO usuarios (nombre_completo, usuario, password, rol)
                 VALUES (?, ?, ?, ?)`,
                [nombre_completo, usuario, hashedPassword, rolFinal]
            );

            await db.query(
                `INSERT INTO logs_sistema (id_usuario, accion, descripcion)
                 VALUES (?, ?, ?)`,
                [
                    id_admin,
                    'CREAR_USUARIO',
                    `Creó usuario ${usuario} con rol ${rolFinal}`
                ]
            );

            res.status(201).json({
                message: "Usuario creado exitosamente",
                id_usuario: resultado.insertId
            });

        } catch (error) {
            res.status(500).json({
                error: "Error al crear usuario",
                details: error.message
            });
        }
    },

    listarUsuarios: async (req, res) => {
        try {
            const [usuarios] = await db.query(
                `SELECT id_usuario, nombre_completo, usuario, rol, estado, fecha_creacion
                 FROM usuarios
                 ORDER BY id_usuario DESC`
            );

            res.json(usuarios);

        } catch (error) {
            res.status(500).json({
                error: "Error al listar usuarios",
                details: error.message
            });
        }
    },

    obtenerUsuarioPorId: async (req, res) => {
        const { id } = req.params;

        try {
            const [usuarios] = await db.query(
                `SELECT id_usuario, nombre_completo, usuario, rol, estado, fecha_creacion
                 FROM usuarios
                 WHERE id_usuario = ?`,
                [id]
            );

            if (usuarios.length === 0) {
                return res.status(404).json({
                    error: "Usuario no encontrado"
                });
            }

            res.json(usuarios[0]);

        } catch (error) {
            res.status(500).json({
                error: "Error al obtener usuario",
                details: error.message
            });
        }
    },

    editarUsuario: async (req, res) => {
        const { id } = req.params;
        const { nombre_completo, usuario, password, rol, estado } = req.body;
        const id_admin = req.usuario.id_usuario;

        try {
            const rolesValidos = ['administrador', 'vendedor'];

            if (rol && !rolesValidos.includes(rol)) {
                return res.status(400).json({
                    error: "Rol inválido"
                });
            }

            const [usuarioExistente] = await db.query(
                `SELECT id_usuario FROM usuarios 
                 WHERE usuario = ? AND id_usuario != ?`,
                [usuario, id]
            );

            if (usuarioExistente.length > 0) {
                return res.status(409).json({
                    error: "El nombre de usuario ya está en uso"
                });
            }

            let query = `
                UPDATE usuarios 
                SET nombre_completo = ?, usuario = ?, rol = ?, estado = ?
            `;

            let params = [nombre_completo, usuario, rol, estado];

            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                query += `, password = ?`;
                params.push(hashedPassword);
            }

            query += ` WHERE id_usuario = ?`;
            params.push(id);

            await db.query(query, params);

            await db.query(
                `INSERT INTO logs_sistema (id_usuario, accion, descripcion)
                 VALUES (?, ?, ?)`,
                [
                    id_admin,
                    'EDITAR_USUARIO',
                    `Editó usuario ID ${id}`
                ]
            );

            res.json({
                message: "Usuario actualizado correctamente"
            });

        } catch (error) {
            res.status(500).json({
                error: "Error al editar usuario",
                details: error.message
            });
        }
    },
    
    cambiarEstadoUsuario: async (req, res) => {
        const { id } = req.params;
        const { estado } = req.body;
        const id_admin = req.usuario.id_usuario;

        try {
            await db.query(
                `UPDATE usuarios SET estado = ? WHERE id_usuario = ?`,
                [estado, id]
            );

            await db.query(
                `INSERT INTO logs_sistema (id_usuario, accion, descripcion)
                 VALUES (?, ?, ?)`,
                [
                    id_admin,
                    'CAMBIAR_ESTADO_USUARIO',
                    `Cambió estado del usuario ID ${id} a ${estado}`
                ]
            );

            res.json({
                message: "Estado actualizado correctamente"
            });

        } catch (error) {
            res.status(500).json({
                error: "Error al cambiar estado del usuario",
                details: error.message
            });
        }
    }
};

module.exports = usuariosController;
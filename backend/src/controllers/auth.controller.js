const db = require('../config/db');
// const bcrypt = require('bcrypt'); // Lo comentamos por ahora
const jwt = require('jsonwebtoken');

const authController = {
    login: async (req, res) => {
        const { usuario, password } = req.body;

        try {
            // Buscamos el usuario
            const [rows] = await db.query('SELECT * FROM usuarios WHERE usuario = ? AND estado = 1', [usuario]);
            
            if (rows.length === 0) {
                return res.status(401).json({ message: "Credenciales inválidas (usuario no existe)" });
            }

            const user = rows[0];

            // COMPARACIÓN SIMPLE (Texto plano)
            // Cambiamos bcrypt.compare por una comparación de strings directa
            if (password !== user.password) {
                return res.status(401).json({ message: "Credenciales inválidas (contraseña incorrecta)" });
            }

            // Verificamos el secreto del JWT
            if (!process.env.JWT_SECRET) {
                throw new Error("JWT_SECRET no definida en variables de entorno");
            }

            // Generamos el Token
            const token = jwt.sign(
                { 
                    id: user.id_usuario, 
                    rol: user.rol, 
                    nombre: user.nombre_completo,
                    username: user.usuario 
                },
                process.env.JWT_SECRET,
                { expiresIn: '8h' } 
            );

            // Respuesta exitosa
            res.json({
                message: "Login exitoso",
                token,
                user: { 
                    id: user.id_usuario,
                    nombre: user.nombre_completo, 
                    rol: user.rol 
                }
            });

        } catch (error) {
            console.error("Error en el login:", error); 
            res.status(500).json({ error: "Error en el servidor" });
        }
    }
};

module.exports = authController;
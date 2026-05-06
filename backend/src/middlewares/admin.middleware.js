const verificarAdministrador = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: "Usuario no autenticado."
            });
        }

        if (req.user.rol !== 'administrador') {
            return res.status(403).json({
                error: "Acceso denegado. Solo administradores pueden realizar esta acción."
            });
        }

        next();

    } catch (error) {
        return res.status(500).json({
            error: "Error interno al verificar permisos.",
            details: error.message
        });
    }
};

module.exports = { verificarAdministrador };
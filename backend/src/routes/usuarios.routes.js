const express = require('express');
const router = express.Router();

const usuariosController = require('../controllers/usuarios.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { verificarAdministrador } = require('../middlewares/admin.middleware');
console.log(require('../middlewares/admin.middleware'));

router.post('/', verificarToken, verificarAdministrador, usuariosController.crearUsuario);

router.get('/', verificarToken, verificarAdministrador, usuariosController.listarUsuarios);

router.get('/:id', verificarToken, verificarAdministrador, usuariosController.obtenerUsuarioPorId);

router.put('/:id', verificarToken, verificarAdministrador, usuariosController.editarUsuario);

router.patch('/:id/estado', verificarToken, verificarAdministrador, usuariosController.cambiarEstadoUsuario);

module.exports = router;
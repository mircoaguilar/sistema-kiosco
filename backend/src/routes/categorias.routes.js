const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categorias.controller.js');
const { verificarToken } = require('../middlewares/auth.middleware');

router.get('/', verificarToken, categoriasController.obtenerTodas);
router.post('/', verificarToken, categoriasController.crear);
router.delete('/:id', verificarToken, categoriasController.eliminar);

module.exports = router;
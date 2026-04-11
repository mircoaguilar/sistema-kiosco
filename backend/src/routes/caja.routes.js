const express = require('express');
const router = express.Router();
const cajaController = require('../controllers/caja.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.post('/abrir', verificarToken, cajaController.abrir);
router.post('/cerrar', verificarToken, cajaController.cerrar);
router.get('/estado', verificarToken, cajaController.checkEstado);
router.get('/historial', verificarToken, cajaController.obtenerHistorial);
router.get('/estado-actual', verificarToken, cajaController.obtenerEstadoActual);

module.exports = router;
const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middlewares/auth.middleware');
const { verificarCajaAbierta } = require('../middlewares/caja.middleware');

const movimientosController = require('../controllers/movimientos.controller');

router.post('/', verificarToken, verificarCajaAbierta, movimientosController.crearMovimiento);

module.exports = router;
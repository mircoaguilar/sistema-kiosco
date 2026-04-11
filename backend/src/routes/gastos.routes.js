const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth.middleware');
const { verificarCajaAbierta } = require('../middlewares/caja.middleware');
const gastosController = require('../controllers/gastos.controller');

router.post('/', verificarToken, verificarCajaAbierta, gastosController.crear);

module.exports = router;
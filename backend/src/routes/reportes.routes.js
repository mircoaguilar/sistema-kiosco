const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller');

router.get('/productos-dia', reportesController.reporteProductosDia);
router.get('/top-productos', reportesController.topProductos);
router.get('/filtros-disponibles', reportesController.filtrosDisponibles)

module.exports = router;
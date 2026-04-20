const express = require('express');
const router = express.Router();
const proveedoresController = require('../controllers/proveedores.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.get('/', proveedoresController.obtenerTodos);
router.get('/:id', proveedoresController.obtenerPorId);

router.post('/', verificarToken, proveedoresController.crear);
router.put('/:id', verificarToken, proveedoresController.actualizar);
router.delete('/:id', verificarToken, proveedoresController.eliminar);

module.exports = router;
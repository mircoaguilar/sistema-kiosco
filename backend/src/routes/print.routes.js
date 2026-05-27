const express = require("express");
const router = express.Router();
const printController = require("../controllers/print.controller");

router.get("/pending", printController.getPending);
router.post("/complete", printController.markAsPrinted);

module.exports = router;
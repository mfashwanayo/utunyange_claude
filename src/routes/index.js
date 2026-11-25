const express = require('express');
const router = express.Router();

router.use('/', require('./public.routes'));

module.exports = router;

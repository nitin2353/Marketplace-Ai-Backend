const express = require('express');
const router = express.Router();

const { createRequirement } = require('./requirement.controller');

router.post('/', createRequirement);

module.exports = router;
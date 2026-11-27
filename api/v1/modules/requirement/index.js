<<<<<<< HEAD
const express = require('express');
const router = express.Router();

const { createRequirement } = require('./requirement.controller');

router.post('/', createRequirement);

=======
const express = require('express');
const router = express.Router();

const { createRequirement } = require('./requirement.controller');

router.post('/', createRequirement);

>>>>>>> dev_nitin
module.exports = router;
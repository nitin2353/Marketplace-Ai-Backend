const express = require('express');
const router = express.Router();

const requirement = require('../api/v1/modules/requirement');
const quote = require('../api/v1/modules/quote');


router.use('/requirement', requirement)  
    .use('/quote', quote);             

module.exports = router;
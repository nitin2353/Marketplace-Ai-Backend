<<<<<<< HEAD
const express = require('express');
const router = express.Router();

const {
  createQuote,
  getQuotesByRequirement
} = require('./quote.controller');

// Seller quote submit karega
router.post('/', createQuote);

// Requirement ke hisaab se quotes fetch
router.get('/:requirementId', getQuotesByRequirement);

=======
const express = require('express');
const router = express.Router();

const {
  createQuote,
  getQuotesByRequirement
} = require('./quote.controller');

// Seller quote submit karega
router.post('/', createQuote);

// Requirement ke hisaab se quotes fetch
router.get('/:requirementId', getQuotesByRequirement);

>>>>>>> dev_nitin
module.exports = router;
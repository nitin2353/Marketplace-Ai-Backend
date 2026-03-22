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

module.exports = router;
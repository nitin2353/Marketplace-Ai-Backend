const quoteService = require('./quote.service');

// Create Quote
exports.createQuote = async (req, res) => {
  try {
    const result = await quoteService.createQuote(req.body);

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Get Quotes by Requirement
exports.getQuotesByRequirement = async (req, res) => {
  try {
    const { requirementId } = req.params;

    const result = await quoteService.getQuotesByRequirement(requirementId);

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
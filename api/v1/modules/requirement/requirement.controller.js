const aiService = require('../ai/ai.service');
const RequirementService = require('./requirement.modal');

exports.createRequirement = async (req, res) => {
  try {
    const { user_id, user_input } = req.body;

    const aiData = await aiService.parseRequirement(user_input);

    const newRequirement = await RequirementService.createRequirement({
      user_id,
      product_type: aiData.product_type,
      description: aiData.description,
      budget: aiData.budget
    });

    res.json({ success: true, data: newRequirement });

  } catch (error) {
    console.error(error);
    res.json({ success: false, error: error.message });
  }
};
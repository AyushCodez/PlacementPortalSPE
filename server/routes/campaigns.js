// server/routes/campaigns.js
const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');

// Create a new campaign
router.post('/', campaignController.createCampaign);

// Get all campaigns
router.get('/', campaignController.getCampaigns);

// Add a cycle to a campaign
router.post('/:campaignId/cycles', campaignController.addCycle);

router.get('/:campaignId', campaignController.getCampaignById); // NEW ROUTE

router.delete('/:campaignId', campaignController.deleteCampaign);

router.put('/:campaignId/status', campaignController.updateCampaignStatus);

module.exports = router;
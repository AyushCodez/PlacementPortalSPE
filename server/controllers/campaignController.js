// server/controllers/campaignController.js
const Campaign = require('../models/Campaign');
const Test = require('../models/Test');
const Applicant = require('../models/Applicant');
const Student = require('../models/Student');

// Create a new campaign
exports.createCampaign = async (req, res) => {
    try {
        const newCampaign = new Campaign(req.body);
        const savedCampaign = await newCampaign.save();
        res.status(201).json(savedCampaign);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all campaigns
exports.getCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find();
        res.status(200).json(campaigns);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add a new cycle to an existing campaign
exports.addCycle = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        campaign.cycles.push({ name: req.body.name });
        const updatedCampaign = await campaign.save();
        res.status(200).json(updatedCampaign);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get a single campaign by ID
exports.getCampaignById = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        res.status(200).json(campaign);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        console.log(`Attempting to delete campaign: ${campaignId}`); // Add log

        // 1. Find all tests associated with this campaign
        const testsToDelete = await Test.find({ campaign: campaignId });
        const testIdsToDelete = testsToDelete.map(test => test._id);
        console.log(`Found ${testIdsToDelete.length} tests to delete.`); // Add log

        // 2. Find all applicants associated with these tests
        const applicantIdsToDelete = await Applicant.distinct('_id', { test: { $in: testIdsToDelete } });
        console.log(`Found ${applicantIdsToDelete.length} applicants to delete.`); // Add log

        // 3. Delete the applicants
        if (applicantIdsToDelete.length > 0) {
            await Applicant.deleteMany({ _id: { $in: applicantIdsToDelete } });
            console.log("Deleted applicants."); // Add log
        }

        // 4. Delete the tests
        if (testIdsToDelete.length > 0) {
            await Test.deleteMany({ _id: { $in: testIdsToDelete } });
            console.log("Deleted tests."); // Add log
        }

        // 👇 **5. ADD THIS STEP: Delete students associated with this campaign**
        const studentDeleteResult = await Student.deleteMany({ campaign: campaignId });
        console.log(`Deleted ${studentDeleteResult.deletedCount} students associated with the campaign.`); // Add log

        // 6. Delete the campaign itself
        const deletedCampaign = await Campaign.findByIdAndDelete(campaignId);

        if (!deletedCampaign) {
            console.log("Campaign not found during deletion."); // Add log
            return res.status(404).json({ message: 'Campaign not found' });
        }

        console.log("Campaign deleted successfully."); // Add log
        res.status(200).json({ message: 'Campaign and all associated data (tests, applicants, students) deleted successfully.' });
    } catch (error) {
        console.error("Error deleting campaign:", error);
        res.status(500).json({ message: 'Server error while deleting campaign.' });
    }
};

exports.updateCampaignStatus = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { status } = req.body; // Expect 'active' or 'completed'

        if (!['active', 'completed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value.' });
        }

        const updatedCampaign = await Campaign.findByIdAndUpdate(
            campaignId,
            { $set: { status: status } },
            { new: true } // Return the updated document
        );

        if (!updatedCampaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        res.status(200).json(updatedCampaign);
    } catch (error) {
        console.error("Error updating campaign status:", error);
        res.status(500).json({ message: 'Server error while updating status.' });
    }
};
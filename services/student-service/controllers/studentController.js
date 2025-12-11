// server/controllers/studentController.js
const Student = require('../models/Student');
const xlsx = require('xlsx');
const Campaign = require('../models/Campaign');
const Applicant = require('../models/Applicant');
const Test = require('../models/Test');

exports.uploadStudentsForCampaign = async (req, res) => {
    const { campaignId } = req.params;
    console.log(`[Upload] Request for campaign: ${campaignId}`);

    if (!req.file) {
        console.error('[Upload] No file received');
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    console.log('[Upload] File received:', req.file);

    try {
        // Check if campaign exists
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            console.error(`[Upload] Campaign ${campaignId} not found`);
            return res.status(404).json({ message: 'Campaign not found.' });
        }

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);
        console.log(`[Upload] Parsed ${data.length} rows from Excel`);

        const studentOps = data.map(item => ({
            updateOne: {
                filter: { rollNumber: item['Roll Number'] }, // Filter by unique roll number
                update: {
                    $set: {
                        name: item['Name'],
                        email: item['Email'],
                        department: item['Department'],
                        rollNumber: item['Roll Number'],
                        cgpa: item['CGPA'] || 0,
                        isEligible: item['Eligible'] === 'Yes' || item['Eligible'] === true
                    },
                    $addToSet: { campaigns: campaignId } // Add campaign to the array if not present
                },
                upsert: true
            }
        }));

        if (studentOps.length > 0) {
            const result = await Student.bulkWrite(studentOps);
            console.log('Bulk write result:', result);
            res.status(200).json({
                message: `Student database updated. Added/Modified: ${result.upsertedCount + result.modifiedCount} students.`
            });
        } else {
            res.status(200).json({ message: 'No student data found in the file.' });
        }

    } catch (error) {
        console.error("Error uploading students for campaign:", error);
        res.status(500).json({ message: 'Failed to upload students.', error: error.message });
    }
};

exports.getStudentsByCampaign = async (req, res) => {
    const { campaignId } = req.params;
    try {
        // Find students where campaigns array contains campaignId OR legacy campaign field matches
        const students = await Student.find({
            $or: [
                { campaigns: campaignId },
                { campaign: campaignId }
            ]
        }).sort({ rollNumber: 1 });
        res.status(200).json(students);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve students for this campaign.', error: error.message });
    }
};

exports.getStudentStats = async (req, res) => {
    const { studentId } = req.params;
    try {
        const student = await Student.findById(studentId).populate('campaigns');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const applications = await Applicant.find({ student: studentId }).populate('test');

        const stats = {
            student,
            totalTestsApplied: applications.length,
            testsAttended: applications.filter(app => app.attended).length,
            applications: applications.map(app => ({
                testName: app.test?.name || 'Unknown Test',
                date: app.test?.date,
                attended: app.attended,
                venue: app.venue,
                campaignId: app.test?.campaign // Add campaignId for filtering
            }))
        };

        res.status(200).json(stats);
    } catch (error) {
        console.error("Error fetching student stats:", error);
        res.status(500).json({ message: 'Failed to fetch student stats', error: error.message });
    }
};

exports.bulkMarkEligible = async (req, res) => {
    const { campaignId } = req.params;
    const { rollNumbers, isEligible } = req.body;

    if (!rollNumbers || !Array.isArray(rollNumbers)) {
        return res.status(400).json({ message: 'Invalid roll numbers provided.' });
    }

    try {
        // Update students who are in this campaign (new or legacy) AND have the roll number
        const result = await Student.updateMany(
            {
                $and: [
                    { $or: [{ campaigns: campaignId }, { campaign: campaignId }] },
                    { rollNumber: { $in: rollNumbers } }
                ]
            },
            { $set: { isEligible: isEligible } }
        );

        res.status(200).json({
            message: `Updated eligibility for ${result.modifiedCount} students.`
        });
    } catch (error) {
        console.error("Error bulk marking eligible:", error);
        res.status(500).json({ message: 'Failed to update eligibility', error: error.message });
    }
};

// Remove student from a campaign
exports.removeStudentFromCampaign = async (req, res) => {
    const { campaignId, studentId } = req.params;
    try {
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Remove campaignId from campaigns array
        student.campaigns = student.campaigns.filter(id => id.toString() !== campaignId);

        // Also check legacy campaign field if it matches
        if (student.campaign && student.campaign.toString() === campaignId) {
            student.campaign = undefined; // Or null, depending on schema
        }

        await student.save();
        res.status(200).json({ message: 'Student removed from campaign successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Search Students
exports.searchStudents = async (req, res) => {
    const { query } = req.query;
    if (!query) return res.json([]);

    try {
        // 1. Get active campaign IDs
        const activeCampaigns = await Campaign.find({ status: 'active' }).select('_id');
        const activeCampaignIds = activeCampaigns.map(c => c._id);

        if (activeCampaignIds.length === 0) {
            return res.json([]); // No active campaigns, so no students should be shown
        }

        const regex = new RegExp(query, 'i');

        // 2. Filter students by query AND active campaign association
        const students = await Student.find({
            $and: [
                {
                    $or: [
                        { name: regex },
                        { email: regex },
                        { rollNumber: regex }
                    ]
                },
                {
                    $or: [
                        { campaigns: { $in: activeCampaignIds } },
                        { campaign: { $in: activeCampaignIds } }
                    ]
                }
            ]
        }).limit(10).select('name email rollNumber department');

        res.json(students);
    } catch (error) {
        console.error("Error searching students:", error);
        res.status(500).json({ message: 'Server error searching students' });
    }
};
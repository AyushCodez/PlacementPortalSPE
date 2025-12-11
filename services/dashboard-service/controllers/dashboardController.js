// server/controllers/dashboardController.js
const Campaign = require('../models/Campaign');
const Test = require('../models/Test');
const Applicant = require('../models/Applicant');
const Student = require('../models/Student');

exports.getDashboardStats = async (req, res) => {
    try {
        console.log("\n--- Starting Detailed Dashboard Stats Calculation ---");

        // --- Date Setup ---
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(todayStart.getDate() + 1);

        console.log(`Today's Range: ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);
        console.log(`Tomorrow Starts: ${tomorrowStart.toISOString()}`);

        // --- Fetch Active Campaigns ---
        const activeCampaigns = await Campaign.find({ status: 'active' }).lean(); // Use lean() for performance
        console.log(`1. Found ${activeCampaigns.length} active campaigns.`);

        if (activeCampaigns.length === 0) {
            console.log("-> No active campaigns. Returning empty details and zero counts.");
            return res.status(200).json({ testsTodayCount: 0, testsUpcomingCount: 0, testsToday: [], testsUpcoming: [], campaignDetails: [] });
        }
        const activeCampaignIds = activeCampaigns.map(c => c._id);

        // --- Fetch ALL Tests and Applicants for Active Campaigns ---
        // Fetch tests first to calculate today/upcoming counts globally
        const allTestsInActive = await Test.find({ campaign: { $in: activeCampaignIds } }).lean();
        console.log(`2. Found ${allTestsInActive.length} total tests linked to active campaigns.`);
        const allTestIdsInActive = allTestsInActive.map(t => t._id);

        // Fetch all relevant applicants
        const allApplicantsInActive = await Applicant.find({ test: { $in: allTestIdsInActive } })
            .select('student test') // Only select needed fields
            .lean(); // Use lean()
        console.log(`3. Found ${allApplicantsInActive.length} applicant entries linked to these tests.`);

        // --- Calculate Global Stats (Today/Upcoming) ---
        let testsToday = [];
        let testsUpcoming = [];

        allTestsInActive.forEach(test => {
            if (!test.date) return;
            const testDate = new Date(test.date);

            const testInfo = {
                id: test._id,
                name: test.name,
                date: test.date,
                campaignName: activeCampaigns.find(c => c._id.toString() === test.campaign.toString())?.name || 'Unknown'
            };

            if (testDate >= todayStart && testDate <= todayEnd) {
                testsToday.push(testInfo);
            } else if (testDate >= tomorrowStart) {
                testsUpcoming.push(testInfo);
            }
        });

        const testsTodayCount = testsToday.length;
        const testsUpcomingCount = testsUpcoming.length;

        console.log(`4. Global Counts => Today: ${testsTodayCount}, Upcoming: ${testsUpcomingCount}`);

        // --- Calculate Per-Campaign Stats ---
        const campaignDetails = [];
        console.log("5. Calculating stats per campaign:");

        for (const campaign of activeCampaigns) {
            const campaignIdString = campaign._id.toString();
            console.log(`   - Processing Campaign: ${campaign.name} (${campaignIdString})`);

            // Filter tests belonging to this specific campaign
            const testsForThisCampaign = allTestsInActive.filter(test => test.campaign.toString() === campaignIdString);
            const testCount = testsForThisCampaign.length;
            console.log(`     - Tests in this campaign: ${testCount}`);

            // Filter applicants belonging to tests within this campaign
            const testIdsForThisCampaign = testsForThisCampaign.map(t => t._id.toString());
            const applicantsForThisCampaign = allApplicantsInActive.filter(app =>
                testIdsForThisCampaign.includes(app.test.toString()) && app.student // Ensure student exists
            );

            // Count unique students for this campaign
            const uniqueStudentIds = new Set(applicantsForThisCampaign.map(app => app.student.toString()));
            const studentCount = uniqueStudentIds.size;
            console.log(`     - Unique students in this campaign: ${studentCount}`);

            campaignDetails.push({
                campaignId: campaignIdString,
                campaignName: campaign.name,
                testCount: testCount,
                studentCount: studentCount
            });
        }

        // --- Final Response ---
        const finalResponse = {
            testsTodayCount,
            testsUpcomingCount,
            testsToday,
            testsUpcoming,
            campaignDetails // Array of objects, one per campaign
        };
        console.log("--- Calculation Complete. Final Response:", JSON.stringify(finalResponse, null, 2));

        res.status(200).json(finalResponse);

    } catch (error) {
        console.error("!!! Error in getDashboardStats:", error);
        res.status(500).json({ message: 'Server error while fetching dashboard stats.' });
    }
};
// server/controllers/testController.js
const Test = require('../models/Test');
const Applicant = require('../models/Applicant');
const xlsx = require('xlsx');
const Student = require('../models/Student');
const Campaign = require('../models/Campaign');
const mongoose = require('mongoose');
const { sendQRCodeEmail, sendVenueUpdateEmail } = require('../utils/mailer');


// Create a new test
exports.createTest = async (req, res) => {
    try {
        const newTest = new Test(req.body);
        const savedTest = await newTest.save();
        res.status(201).json(savedTest);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all tests for a campaign
exports.getTestsByCampaign = async (req, res) => {
    try {
        const tests = await Test.find({ campaign: req.params.campaignId });
        res.status(200).json(tests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Replace the entire uploadApplicants function
exports.uploadApplicants = async (req, res) => {
    try {
        const { testId } = req.params;
        // Populate the campaign field when finding the test
        const test = await Test.findById(testId).populate('campaign');
        if (!test) return res.status(404).json({ message: 'Test not found' });
        if (!test.campaign) return res.status(400).json({ message: 'Test is not associated with a campaign.' });

        const campaignId = test.campaign._id; // Get the campaign ID from the populated test

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        const rollNumbers = data.map(item => item['Roll Number']);

        // 👇 UPDATED: Find students matching roll numbers AND belonging to this test's campaign
        // Checks both the new 'campaigns' array and the legacy 'campaign' field
        const foundStudents = await Student.find({
            $and: [
                { rollNumber: { $in: rollNumbers } },
                {
                    $or: [
                        { campaigns: campaignId },
                        { campaign: campaignId }
                    ]
                }
            ]
        });

        if (foundStudents.length === 0) {
            return res.status(400).json({ message: `No students found in campaign "${test.campaign.name}" matching the provided roll numbers.` });
        }

        // Filter for eligibility
        const eligibleStudents = foundStudents.filter(student => student.isEligible);
        const ineligibleCount = foundStudents.length - eligibleStudents.length;

        if (eligibleStudents.length === 0) {
            return res.status(400).json({
                message: `No eligible students found. ${ineligibleCount} students were skipped because they are not marked as eligible.`
            });
        }

        // Check for students already registered for this specific test to avoid duplicates
        const existingApplicantStudentIds = await Applicant.find({ test: testId }).distinct('student');
        const existingStudentIdStrings = existingApplicantStudentIds.map(id => id.toString());

        // Filter out students who are already applicants for this test
        const studentsToRegister = eligibleStudents.filter(student =>
            !existingStudentIdStrings.includes(student._id.toString())
        );

        if (studentsToRegister.length === 0) {
            let msg = 'All eligible students from the list are already registered for this test.';
            if (ineligibleCount > 0) {
                msg += ` ${ineligibleCount} students were skipped due to ineligibility.`;
            }
            return res.status(200).json({ message: msg, ineligibleCount });
        }

        // Create new 'Applicant' documents only for the newly added students
        const newApplicants = studentsToRegister.map(student => ({
            student: student._id,
            test: testId
        }));

        if (newApplicants.length > 0) {
            const savedApplicants = await Applicant.insertMany(newApplicants);
            const savedApplicantIds = savedApplicants.map(app => app._id);
            test.applicants.push(...savedApplicantIds);
            await test.save();

            let successMsg = `Successfully registered ${savedApplicants.length} students.`;
            if (ineligibleCount > 0) {
                successMsg += ` Warning: ${ineligibleCount} students were skipped because they are not marked as eligible.`;
            }

            res.status(200).json({
                message: successMsg,
                registeredCount: savedApplicants.length,
                ineligibleCount
            });
        } else {
            res.status(200).json({ message: 'No new students to register.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.clearApplicants = async (req, res) => {
    try {
        const { testId } = req.params;
        const test = await Test.findById(testId);
        if (!test) return res.status(404).json({ message: 'Test not found' });

        // Fetch applicant IDs to delete
        const applicantIdsToDelete = test.applicants;

        // Delete the Applicant documents
        if (applicantIdsToDelete && applicantIdsToDelete.length > 0) {
            await Applicant.deleteMany({ _id: { $in: applicantIdsToDelete } });
        }

        // Clear the array in the Test document
        test.applicants = [];
        await test.save();

        res.status(200).json({ message: 'All applicants have been cleared for this test successfully.' });
    } catch (error) {
        console.error("Error clearing applicants:", error);
        res.status(500).json({ message: 'Server error while clearing applicants.' });
    }
};

// Also update getTestDetails to populate the nested student data AND volunteers
exports.getTestDetails = async (req, res) => {
    try {
        const test = await Test.findById(req.params.testId)
            .populate({
                path: 'applicants',
                populate: {
                    path: 'student',
                    model: 'Student'
                }
            })
            .populate('volunteers', 'name email rollNumber'); // Populating volunteers (Volunteer model)

        if (!test) return res.status(404).json({ message: 'Test not found' });
        res.status(200).json(test);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mark attendance by scanning barcode (roll number)
exports.markAttendance = async (req, res) => {
    try {
        const { testId, rollNumber } = req.params;
        const io = req.app.get('socketio'); // Get socket.io instance if using websockets

        if (!rollNumber || rollNumber.trim() === '') {
            return res.status(400).json({ message: 'Roll number cannot be empty.' });
        }

        console.log(`Attempting to mark attendance for Roll Number: ${rollNumber} in Test ID: ${testId}`);

        // Authorization Check: Ensure volunteer is assigned to this test
        if (req.user.role === 'volunteer') {
            const isAssigned = req.user.assignedTests.some(id => id.toString() === testId);
            if (!isAssigned) {
                return res.status(403).json({ message: 'Access denied. You are not assigned to this test.' });
            }
        }

        // 1. Find the test and populate applicant -> student data
        const test = await Test.findById(testId).populate({
            path: 'applicants',
            populate: {
                path: 'student',
                model: 'Student'
            }
        });

        if (!test) {
            console.log(`Test not found: ${testId}`);
            return res.status(404).json({ message: 'Test not found.' });
        }

        // Find the student in the test's applicants
        const applicant = test.applicants.find(app => app.student.rollNumber === rollNumber);

        if (!applicant) {
            return res.status(404).json({ message: 'Student not registered for this test.' });
        }

        if (applicant.attended) {
            return res.status(400).json({ message: 'Student already marked present.' });
        }

        // Update applicant attended status
        await Applicant.findByIdAndUpdate(applicant._id, { attended: true });

        res.status(200).json({ message: 'Attendance marked successfully.', student: applicant.student });
    } catch (error) {
        console.error("Error marking attendance:", error);
        res.status(500).json({ message: error.message });
    }
};

// Generate random seating arrangement
exports.generateSeating = async (req, res) => {
    try {
        const { testId } = req.params;
        const { venues } = req.body; // venues = [{ name: 'Venue A', capacity: 50 }, ...]

        console.log(`Generating venue assignment for Test ID: ${testId} with venues:`, venues); // Log start

        const test = await Test.findById(testId).populate('applicants');
        if (!test) { /* ... error handling ... */ }
        if (!test.applicants || test.applicants.length === 0) { /* ... error handling ... */ }

        let applicantsToSeat = [...test.applicants];

        // Shuffle applicants randomly
        for (let i = applicantsToSeat.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [applicantsToSeat[i], applicantsToSeat[j]] = [applicantsToSeat[j], applicantsToSeat[i]];
        }
        console.log(`Shuffled ${applicantsToSeat.length} applicants.`);

        let applicantIndex = 0;
        const updatePromises = [];

        for (const venue of venues) {
            console.log(`Assigning applicants to Venue: ${venue.name} (Capacity: ${venue.capacity})`);
            // Assign applicants up to the venue's capacity
            for (let assignedCount = 0; assignedCount < venue.capacity; assignedCount++) {
                if (applicantIndex < applicantsToSeat.length) {
                    const applicantId = applicantsToSeat[applicantIndex]._id;
                    // 👇 **CHANGED:** Only update the venue, set seatNumber to 'N/A' (or empty string if preferred)
                    updatePromises.push(
                        Applicant.findByIdAndUpdate(applicantId, {
                            $set: { venue: venue.name, seatNumber: 'N/A' } // Removed seat number generation
                        })
                    );
                    applicantIndex++;
                } else {
                    break; // Stop assigning to this venue if all applicants are seated
                }
            }
            if (applicantIndex >= applicantsToSeat.length) break; // Stop looping through venues if all applicants are seated
        }

        // Check if all students were assigned
        if (applicantIndex < applicantsToSeat.length) {
            console.warn(`Warning: Not enough venue capacity for all ${applicantsToSeat.length} applicants. ${applicantIndex} were assigned.`);
            // Optionally, handle unassigned students (e.g., mark their venue as 'Unassigned')
            for (let i = applicantIndex; i < applicantsToSeat.length; i++) {
                updatePromises.push(
                    Applicant.findByIdAndUpdate(applicantsToSeat[i]._id, {
                        $set: { venue: 'Unassigned', seatNumber: 'N/A' }
                    })
                );
            }
        }

        await Promise.all(updatePromises);
        console.log(`Updated venue info for applicants.`);

        // Fetch the test data AGAIN with NESTED population
        const updatedTestWithPopulatedStudents = await Test.findById(testId).populate({
            path: 'applicants',
            populate: { path: 'student', model: 'Student' }
        });

        console.log("Venue assignment generated successfully.");
        res.status(200).json(updatedTestWithPopulatedStudents);

    } catch (error) {
        console.error("Error generating venue assignment:", error);
        res.status(500).json({ message: 'Server error while generating venue assignment.' });
    }
};

exports.deleteTest = async (req, res) => {
    try {
        const { testId } = req.params;

        // 1. Find all applicants associated with this test
        const applicantsToDelete = await Applicant.find({ test: testId });
        const applicantIdsToDelete = applicantsToDelete.map(app => app._id);

        // 2. Delete the applicants
        if (applicantIdsToDelete.length > 0) {
            await Applicant.deleteMany({ _id: { $in: applicantIdsToDelete } });
        }

        // 3. Delete the test itself
        const deletedTest = await Test.findByIdAndDelete(testId);

        if (!deletedTest) {
            return res.status(404).json({ message: 'Test not found' });
        }

        // Note: We might also need to remove the test ID from any user/volunteer assignments if applicable.

        res.status(200).json({ message: 'Test and all associated applicants deleted successfully.' });
    } catch (error) {
        console.error("Error deleting test:", error);
        res.status(500).json({ message: 'Server error while deleting test.' });
    }
};

exports.sendTestAdmitCards = async (req, res) => {
    try {
        const { testId } = req.params;
        const { customMessage } = req.body;

        const test = await Test.findById(testId).populate({
            path: 'applicants',
            populate: { path: 'student', model: 'Student' }
        });

        if (!test) return res.status(404).json({ message: 'Test not found' });

        const applicants = test.applicants;
        if (!applicants || applicants.length === 0) {
            return res.status(400).json({ message: 'No applicants found for this test.' });
        }

        let sentCount = 0;
        let failedCount = 0;

        // Iterate and send emails
        // Note: For large numbers, consider using a queue (e.g., BullMQ) to avoid timeout
        for (const applicant of applicants) {
            if (applicant.student && applicant.student.email) {
                const success = await sendQRCodeEmail(
                    applicant.student.email,
                    applicant.student.rollNumber,
                    test.name,
                    customMessage,
                    test._id, // Pass testId for validation
                    applicant.venue // Pass venue
                );
                if (success) sentCount++;
                else failedCount++;
            }
        }

        res.status(200).json({
            message: `Process completed. Sent: ${sentCount}, Failed: ${failedCount}`,
            sentCount,
            failedCount
        });

    } catch (error) {
        console.error("Error sending admit cards:", error);
        res.status(500).json({ message: 'Server error while sending emails.' });
    }
};

// Remove a single applicant from a test
exports.removeApplicant = async (req, res) => {
    try {
        const { testId, studentId } = req.params;

        const test = await Test.findById(testId);
        if (!test) return res.status(404).json({ message: 'Test not found' });

        // Find the applicant document
        const applicant = await Applicant.findOne({ test: testId, student: studentId });

        if (applicant) {
            // Remove from Applicant collection
            await Applicant.findByIdAndDelete(applicant._id);

            // Remove from Test's applicants array
            test.applicants = test.applicants.filter(appId => appId.toString() !== applicant._id.toString());
            await test.save();

            res.status(200).json({ message: 'Applicant removed successfully.' });
        } else {
            // Even if applicant doc not found, ensure it's not in the test array (cleanup)
            // This handles cases where data might be inconsistent
            // But strictly speaking, if not found, we can just say not found or success (idempotent)
            res.status(404).json({ message: 'Applicant not found for this test.' });
        }

    } catch (error) {
        console.error("Error removing applicant:", error);
        res.status(500).json({ message: 'Server error while removing applicant.' });
    }
};

// Update venue for a single applicant
exports.updateApplicantVenue = async (req, res) => {
    try {
        const { testId, studentId } = req.params;
        const { venue } = req.body;

        const test = await Test.findById(testId);
        if (!test) return res.status(404).json({ message: 'Test not found' });

        // Find the applicant document
        const applicant = await Applicant.findOne({ test: testId, student: studentId }).populate('student');

        if (!applicant) {
            return res.status(404).json({ message: 'Applicant not found for this test.' });
        }

        // Update venue
        applicant.venue = venue;
        await applicant.save();

        // Send email notification if student has email
        if (applicant.student && applicant.student.email) {
            // Run in background, don't await
            sendVenueUpdateEmail(
                applicant.student.email,
                applicant.student.name,
                test.name,
                venue
            ).catch(err => console.error("Failed to send venue update email:", err));
        }

        res.status(200).json({ message: 'Venue updated successfully.' });

    } catch (error) {
        console.error("Error updating venue:", error);
        res.status(500).json({ message: 'Server error while updating venue.' });
    }
};

const Volunteer = require('../models/Volunteer');
const User = require('../models/User');

exports.toggleTestCompletion = async (req, res) => {
    try {
        const { testId } = req.params;
        const test = await Test.findById(testId);

        if (!test) return res.status(404).json({ message: 'Test not found' });

        // Toggle status
        const newStatus = test.status === 'completed' ? 'upcoming' : 'completed';
        test.status = newStatus;
        await test.save();

        // If marked as completed, invalidate volunteer credentials
        if (newStatus === 'completed') {
            // Find all volunteers for this test
            // Note: test.volunteers might be an array of IDs. 
            // Also check Volunteer model for volunteers assigned to this test if test.volunteers is not reliable or if we want to be sure.
            // The Volunteer model has 'assignedTests' array.

            // Strategy: Find volunteers where assignedTests contains this testId
            const volunteers = await Volunteer.find({ assignedTests: testId });

            const userIdsToDelete = [];

            for (const vol of volunteers) {
                if (vol.user) {
                    userIdsToDelete.push(vol.user);
                }
                // Optional: Remove the test from their assignedTests list? 
                // Or just leave it. If we delete the user, they can't login anyway.
                // But if we want to be clean:
                // vol.assignedTests = vol.assignedTests.filter(id => id.toString() !== testId);
                // await vol.save();

                // Actually, if we delete the User, we should probably unset the user field in Volunteer
                vol.user = undefined;
                await vol.save();
            }

            if (userIdsToDelete.length > 0) {
                await User.deleteMany({ _id: { $in: userIdsToDelete } });
                console.log(`Invalidated credentials for ${userIdsToDelete.length} volunteers for test ${testId}`);
            }
        }

        res.json({ message: `Test marked as ${test.status}.`, test });
    } catch (error) {
        console.error("Error toggling test completion:", error);
        res.status(500).json({ message: 'Server error toggling test completion.' });
    }
};

// Add a single student to a test
exports.addStudentToTest = async (req, res) => {
    try {
        const { testId } = req.params;
        const { rollNumber } = req.body;

        if (!rollNumber) {
            return res.status(400).json({ message: 'Roll number is required.' });
        }

        const test = await Test.findById(testId).populate('campaign');
        if (!test) return res.status(404).json({ message: 'Test not found' });
        if (!test.campaign) return res.status(400).json({ message: 'Test is not associated with a campaign.' });

        const campaignId = test.campaign._id;

        // Find student by roll number AND campaign
        const student = await Student.findOne({
            rollNumber: rollNumber,
            $or: [
                { campaigns: campaignId },
                { campaign: campaignId }
            ]
        });

        if (!student) {
            return res.status(404).json({ message: `Student with roll number ${rollNumber} not found in this campaign.` });
        }

        // Check eligibility
        if (!student.isEligible) {
            return res.status(400).json({ message: `Student ${student.name} (${rollNumber}) is not eligible for this test.` });
        }

        // Check if already registered
        const existingApplicant = await Applicant.findOne({ test: testId, student: student._id });
        if (existingApplicant) {
            return res.status(400).json({ message: `Student ${student.name} is already registered for this test.` });
        }

        // Create new Applicant
        const newApplicant = new Applicant({
            student: student._id,
            test: testId
        });
        await newApplicant.save();

        // Add to test applicants array
        test.applicants.push(newApplicant._id);
        await test.save();

        res.status(200).json({ message: `Student ${student.name} added successfully.`, student });

    } catch (error) {
        console.error("Error adding student:", error);
        res.status(500).json({ message: 'Server error while adding student.' });
    }
};

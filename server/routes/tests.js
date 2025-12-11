const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const auth = require('../middleware/authMiddleware');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

// Create a new test
router.post('/', auth, testController.createTest);

// Get all tests for a campaign
router.get('/campaign/:campaignId', auth, testController.getTestsByCampaign);

// Upload applicant list
router.post('/:testId/applicants', auth, upload.single('applicantsFile'), testController.uploadApplicants);

// Mark attendance
router.put('/:testId/attendance/:rollNumber', auth, testController.markAttendance);

// Generate seating arrangement
router.post('/:testId/seating', auth, testController.generateSeating);

// Get test details with applicants
router.get('/:testId', auth, testController.getTestDetails);

// Clears all applicants for a specific test
router.delete('/:testId/applicants', auth, testController.clearApplicants);

// Remove individual applicant
router.delete('/:testId/applicants/:studentId', auth, testController.removeApplicant);

// Update applicant venue
router.put('/:testId/applicants/:studentId/venue', auth, testController.updateApplicantVenue);

router.delete('/:testId', auth, testController.deleteTest);

// Send Admit Cards (QR Code)
router.post('/:testId/send-admit-cards', auth, testController.sendTestAdmitCards);

// Toggle Test Completed Status
router.put('/:testId/toggle-complete', auth, testController.toggleTestCompletion);

// Add individual student to test
router.post('/:testId/add-student', auth, testController.addStudentToTest);

module.exports = router;
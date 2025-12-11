// server/routes/students.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

router.post('/campaign/:campaignId/upload', upload.single('studentsFile'), studentController.uploadStudentsForCampaign);
router.get('/search', studentController.searchStudents);
router.get('/campaign/:campaignId', studentController.getStudentsByCampaign);
router.get('/:studentId/stats', studentController.getStudentStats);
router.post('/campaign/:campaignId/bulk-eligible', studentController.bulkMarkEligible);
router.delete('/campaign/:campaignId/student/:studentId', studentController.removeStudentFromCampaign);

module.exports = router;
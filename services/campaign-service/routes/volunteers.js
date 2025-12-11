const express = require('express');
const router = express.Router();
const volunteerController = require('../controllers/volunteerController');
const auth = require('../middleware/authMiddleware');

// All routes protected
router.use(auth);

router.post('/', volunteerController.addVolunteer);
router.get('/campaign/:campaignId', volunteerController.getVolunteersByCampaign);
router.delete('/:volunteerId', volunteerController.removeVolunteer);
router.get('/', auth, volunteerController.getAllVolunteers);
router.post('/enable-creds', auth, volunteerController.enableCredentials);
router.post('/assign-test', volunteerController.assignTestToVolunteer);
router.post('/remove-test', volunteerController.removeTestFromVolunteer);

module.exports = router;

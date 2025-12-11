// server/routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');

// Register a new user (for admins)
router.post('/register', userController.registerUser);

// Login user
router.post('/login', userController.loginUser);

// Add Volunteer (Protected)
router.post('/volunteer', auth, userController.addVolunteer);

// Get All Users (Protected, Admin)
router.get('/', auth, userController.getAllUsers);

// Update User Role (Protected, Admin)
router.put('/:id/role', auth, userController.updateUserRole);

// Delete User (Protected, Admin)
router.delete('/:id', auth, userController.deleteUser);

// Change Password (Protected, All Authenticated Users)
router.put('/change-password', auth, userController.changePassword);

// Get Volunteers with Tests (Protected, Admin/Master)
router.get('/volunteers', auth, userController.getVolunteersWithTests);

// Toggle Volunteer Test Access (Protected, Admin/Master)
router.put('/:userId/tests', auth, userController.toggleVolunteerTestAccess);

// Bulk Add Volunteers (Protected, Admin/Master)
router.post('/volunteers/bulk', auth, userController.bulkAddVolunteers);

module.exports = router;
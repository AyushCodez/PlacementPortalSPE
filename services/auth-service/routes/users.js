const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');

// Auth Routes
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.put('/change-password', auth, userController.changePassword);

// User Management Routes
router.get('/', auth, userController.getAllUsers);
router.put('/:id/role', auth, userController.updateUserRole);
router.delete('/:id', auth, userController.deleteUser);

module.exports = router;
// server/routes/dashboard.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Define the route for getting dashboard stats
router.get('/', dashboardController.getDashboardStats);

module.exports = router;
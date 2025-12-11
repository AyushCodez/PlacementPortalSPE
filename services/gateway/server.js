const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Gateway is running' });
});

// Proxy routes to Dashboard Service 
// In later phases, we will split these out.
const SERVICES = {
    AUTH: process.env.AUTH_SERVICE_URL || 'http://localhost:5002',
    CAMPAIGN: process.env.CAMPAIGN_SERVICE_URL || 'http://localhost:5003',
    ASSESSMENT: process.env.ASSESSMENT_SERVICE_URL || 'http://localhost:5004',
    STUDENT: process.env.STUDENT_SERVICE_URL || 'http://localhost:5005',
    DASHBOARD: process.env.DASHBOARD_SERVICE_URL || 'http://localhost:5001',
};

// Routes to proxy
const services = [
    // Volunteer/Test management routes (must stay in Dashboard Service for now)
    { route: '/api/users/volunteer', target: SERVICES.DASHBOARD },
    { route: '/api/users/volunteers', target: SERVICES.DASHBOARD },
    { route: '/api/users/*/tests', target: SERVICES.DASHBOARD }, // matches /api/users/:id/tests

    // Auth Service Routes
    { route: '/api/users', target: SERVICES.AUTH },

    // Campaign Service Routes
    { route: '/api/campaigns', target: SERVICES.CAMPAIGN },
    { route: '/api/volunteers', target: SERVICES.CAMPAIGN },

    // Assessment Service Routes
    { route: '/api/tests', target: SERVICES.ASSESSMENT },

    // Student Service Routes
    { route: '/api/students', target: SERVICES.STUDENT },

    // Other Dashboard Routes
    { route: '/api/dashboard', target: SERVICES.DASHBOARD },
    { route: '/socket.io', target: SERVICES.DASHBOARD, ws: true },
];

services.forEach(({ route, target, ws }) => {
    app.use(route, createProxyMiddleware({
        target,
        changeOrigin: true,
        ws: ws || false,
        pathRewrite: {
            // [`^${route}`]: '', // Don't rewrite path for now as dashboard service expects /api/...
        },
    }));
});

app.listen(PORT, () => {
    console.log(`Gateway running on port ${PORT}`);
    console.log(`Gateway running on port ${PORT}`);
    console.log(`Services Config:`, SERVICES);
});

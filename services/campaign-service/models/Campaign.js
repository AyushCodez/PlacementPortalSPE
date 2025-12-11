// server/models/Campaign.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CampaignSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, default: 'No description provided' }, // <-- ADD THIS LINE
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    cycles: [{ name: { type: String, required: true } }],
    status: { type: String, enum: ['active', 'completed'], default: 'active' }
});

module.exports = mongoose.model('Campaign', CampaignSchema);
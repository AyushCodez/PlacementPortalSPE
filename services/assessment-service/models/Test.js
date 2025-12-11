const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TestSchema = new Schema({
    name: { type: String, required: true },
    date: { type: Date, required: true },
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    cycleName: { type: String, required: true },
    applicants: [{ type: Schema.Types.ObjectId, ref: 'Applicant' }],
    volunteers: [{ type: Schema.Types.ObjectId, ref: 'Volunteer' }],
    status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' }
});

module.exports = mongoose.model('Test', TestSchema);
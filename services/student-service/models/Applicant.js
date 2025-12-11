// server/models/Applicant.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ApplicantSchema = new Schema({
    // Link to the master student document
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    // Link to the test this application is for
    test: { type: Schema.Types.ObjectId, ref: 'Test', required: true },
    // Test-specific details
    attended: { type: Boolean, default: false },
    venue: { type: String, default: 'N/A' },
    seatNumber: { type: String, default: 'N/A' }
});

module.exports = mongoose.model('Applicant', ApplicantSchema);
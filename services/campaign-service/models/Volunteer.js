const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VolunteerSchema = new Schema({
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // Linked User account for login
    name: { type: String, required: true },
    email: { type: String, required: true },
    rollNumber: { type: String, required: true },
    assignedTests: [{ type: Schema.Types.ObjectId, ref: 'Test' }],
    createdAt: { type: Date, default: Date.now }
});

// Compound index to ensure a student is added as a volunteer only once per campaign
VolunteerSchema.index({ campaign: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Volunteer', VolunteerSchema);

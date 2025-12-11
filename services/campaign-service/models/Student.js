// server/models/Student.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StudentSchema = new Schema({
    name: { type: String, required: true },
    rollNumber: { type: String, required: true, unique: true }, // rollNumber must be unique
    email: { type: String },
    department: { type: String },
    campaigns: [{ type: Schema.Types.ObjectId, ref: 'Campaign' }], // Changed to array
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign' }, // Deprecated: Kept for backward compatibility
    cgpa: { type: Number },
    isEligible: { type: Boolean, default: false }
});

module.exports = mongoose.model('Student', StudentSchema);
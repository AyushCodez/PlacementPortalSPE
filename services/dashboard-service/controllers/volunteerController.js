const Volunteer = require('../models/Volunteer');
const Student = require('../models/Student');
const User = require('../models/User');
const Test = require('../models/Test');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// Add a volunteer to a campaign
exports.addVolunteer = async (req, res) => {
    try {
        const { campaignId, studentId } = req.body;

        if (!campaignId || !studentId) {
            return res.status(400).json({ message: 'Campaign ID and Student ID are required.' });
        }

        // 1. Find the Student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found.' });
        }
        if (!student.email) {
            return res.status(400).json({ message: 'Student does not have an email address.' });
        }

        // 2. Check if already a volunteer for this campaign
        const existingVolunteer = await Volunteer.findOne({ campaign: campaignId, student: studentId });
        if (existingVolunteer) {
            return res.status(400).json({ message: 'Student is already a volunteer for this campaign.' });
        }

        // 3. Find or Create User
        let user = await User.findOne({ email: student.email });
        let generatedPassword = null;

        if (!user) {
            generatedPassword = crypto.randomBytes(4).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(generatedPassword, salt);

            user = new User({
                username: student.rollNumber, // Use roll number as username
                email: student.email,
                password: hashedPassword,
                role: 'volunteer',
                assignedTests: []
            });
            await user.save();
        } else {
            // Ensure role is at least volunteer
            if (user.role === 'student') {
                user.role = 'volunteer';
                await user.save();
            }
        }

        // 4. Create Volunteer Record
        const newVolunteer = new Volunteer({
            campaign: campaignId,
            student: studentId,
            user: user._id,
            name: student.name,
            email: student.email,
            rollNumber: student.rollNumber,
            assignedTests: []
        });

        await newVolunteer.save();

        // 5. Send Email if new user created (Optional: User requested email only on test assignment, 
        // but for a new volunteer account, they might need creds. 
        // However, sticking to previous logic: Email on Test Assignment.)

        res.status(201).json({ message: 'Volunteer added successfully.', volunteer: newVolunteer });

    } catch (error) {
        console.error("Error adding volunteer:", error);
        res.status(500).json({ message: 'Server error adding volunteer.' });
    }
};

// Get volunteers for a specific campaign
exports.getVolunteersByCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const volunteers = await Volunteer.find({ campaign: campaignId })
            .populate('assignedTests', 'name date');
        res.json(volunteers);
    } catch (error) {
        console.error("Error fetching volunteers:", error);
        res.status(500).json({ message: 'Server error fetching volunteers.' });
    }
};

// Remove a volunteer from a campaign
exports.removeVolunteer = async (req, res) => {
    try {
        const { volunteerId } = req.params;
        const volunteer = await Volunteer.findById(volunteerId);

        if (!volunteer) return res.status(404).json({ message: 'Volunteer not found.' });

        // Optional: Remove volunteer access from tests they were assigned to in this campaign?
        // For now, just delete the record. The User account remains.

        await Volunteer.findByIdAndDelete(volunteerId);
        res.json({ message: 'Volunteer removed from campaign.' });

    } catch (error) {
        console.error("Error removing volunteer:", error);
        res.status(500).json({ message: 'Server error removing volunteer.' });
    }
};

// Assign Test to Volunteer (This replaces the User-centric assignment)
exports.assignTestToVolunteer = async (req, res) => {
    try {
        const { volunteerId, testId } = req.body;

        const volunteer = await Volunteer.findById(volunteerId).populate('user');
        if (!volunteer) return res.status(404).json({ message: 'Volunteer not found.' });

        let userId = volunteer.user ? volunteer.user._id : null;

        // Check if user exists, if not regenerate
        if (!userId) {
            console.log(`Regenerating user for volunteer ${volunteer.email}`);

            // Check if email is already taken by another user (safety check)
            let existingUser = await User.findOne({ email: volunteer.email });

            if (existingUser) {
                userId = existingUser._id;
            } else {
                // Create new user
                const generatedPassword = crypto.randomBytes(4).toString('hex');
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(generatedPassword, salt);

                const newUser = new User({
                    username: volunteer.rollNumber,
                    email: volunteer.email,
                    password: hashedPassword,
                    role: 'volunteer',
                    assignedTests: []
                });

                await newUser.save();
                userId = newUser._id;
            }

            // Link to Volunteer
            volunteer.user = userId;
            await volunteer.save();
        }

        const test = await Test.findById(testId);
        if (!test) return res.status(404).json({ message: 'Test not found.' });

        // Check if already assigned
        if (volunteer.assignedTests.includes(testId)) {
            return res.status(400).json({ message: 'Test already assigned to this volunteer.' });
        }

        // 1. Update Volunteer Record
        volunteer.assignedTests.push(testId);
        await volunteer.save();

        // 2. Update User Record (for permissions/login check)
        const user = await User.findById(userId);
        if (!user.assignedTests.includes(testId)) {
            user.assignedTests.push(testId);

            // Generate password if needed (or if we want to reset it on assignment)
            // Requirement: Send email with creds on assignment.
            const generatedPassword = crypto.randomBytes(4).toString('hex');
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(generatedPassword, salt);
            await user.save();

            // 3. Send Email
            const transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: process.env.EMAIL_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const loginLink = 'http://localhost:3000/login';

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: 'Volunteer Assignment - Placement Test Management',
                html: `
                    <h3>You have been assigned to volunteer for: ${test.name}</h3>
                    <p><strong>Login Details:</strong></p>
                    <p>Username: ${user.username}</p>
                    <p>Password: ${generatedPassword}</p>
                    <br>
                    <a href="${loginLink}">Click here to Login</a>
                `
            };

            try {
                await transporter.sendMail(mailOptions);
            } catch (emailError) {
                console.error("Failed to send email:", emailError);
            }
        } else {
            // Even if user already had access, ensure they are linked in Volunteer record (done above)
            await user.save();
        }

        // 3. Update Test Record
        await Test.findByIdAndUpdate(testId, { $addToSet: { volunteers: volunteer._id } });

        res.json({ message: 'Test assigned successfully.' });

    } catch (error) {
        console.error("Error assigning test:", error);
        res.status(500).json({ message: 'Server error assigning test.' });
    }
};

// Remove Test from Volunteer
exports.removeTestFromVolunteer = async (req, res) => {
    try {
        const { volunteerId, testId } = req.body;

        const volunteer = await Volunteer.findById(volunteerId).populate('user');
        if (!volunteer) return res.status(404).json({ message: 'Volunteer not found.' });

        // Check if user exists
        if (!volunteer.user) {
            // If user is missing, we can still remove the test from the volunteer record
            // But we can't remove from user record.
            // We MUST still remove from the Test record.
            volunteer.assignedTests = volunteer.assignedTests.filter(id => id.toString() !== testId);
            await volunteer.save();

            // Remove from Test Record (Critical fix)
            await Test.findByIdAndUpdate(testId, { $pull: { volunteers: volunteer._id } });

            return res.json({ message: 'Test unassigned from volunteer record (User account was missing, but cleaned up Test).' });
        }

        // 1. Remove from Volunteer Record
        volunteer.assignedTests = volunteer.assignedTests.filter(id => id.toString() !== testId);
        await volunteer.save();

        // 2. Remove from User Record
        const user = await User.findById(volunteer.user._id);
        if (user) {
            user.assignedTests = user.assignedTests.filter(id => id.toString() !== testId);
            await user.save();
        }

        // 3. Remove from Test Record
        await Test.findByIdAndUpdate(testId, { $pull: { volunteers: volunteer._id } });

        res.json({ message: 'Test unassigned successfully.' });

    } catch (error) {
        console.error("Error unassigning test:", error);
        res.status(500).json({ message: 'Server error unassigning test.' });
    }
};

// Get All Volunteers (Admin/Master)
exports.getAllVolunteers = async (req, res) => {
    try {
        const volunteers = await Volunteer.find()
            .populate('user', 'username email role')
            .populate('assignedTests', 'name date status');
        res.json(volunteers);
    } catch (error) {
        console.error("Error fetching all volunteers:", error);
        res.status(500).json({ message: 'Server error fetching volunteers.' });
    }
};

// Enable Credentials (Regenerate User)
exports.enableCredentials = async (req, res) => {
    try {
        const { volunteerId } = req.body;
        const volunteer = await Volunteer.findById(volunteerId);
        if (!volunteer) return res.status(404).json({ message: 'Volunteer not found.' });

        if (volunteer.user) {
            // Check if user actually exists in DB
            const userExists = await User.findById(volunteer.user);
            if (userExists) {
                return res.status(400).json({ message: 'Credentials already active.' });
            }
        }

        // Create new user
        const generatedPassword = crypto.randomBytes(4).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(generatedPassword, salt);

        const newUser = new User({
            username: volunteer.rollNumber,
            email: volunteer.email,
            password: hashedPassword,
            role: 'volunteer',
            assignedTests: volunteer.assignedTests
        });

        await newUser.save();
        volunteer.user = newUser._id;
        await volunteer.save();

        // Send Email
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const loginLink = 'http://localhost:3000/login';

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: newUser.email,
            subject: 'Volunteer Access Enabled - Placement Test Management',
            html: `
                <h3>Your volunteer access has been enabled.</h3>
                <p><strong>Login Details:</strong></p>
                <p>Username: ${newUser.username}</p>
                <p>Password: ${generatedPassword}</p>
                <br>
                <a href="${loginLink}">Click here to Login</a>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (emailError) {
            console.error("Failed to send email:", emailError);
        }

        res.json({ message: 'Credentials enabled and email sent.' });

    } catch (error) {
        console.error("Error enabling credentials:", error);
        res.status(500).json({ message: 'Server error enabling credentials.' });
    }
};

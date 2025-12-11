// server/controllers/userController.js
const User = require('../models/User');
const Test = require('../models/Test');
const Student = require('../models/Student');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { sendAdminWelcomeEmail } = require('../utils/mailer');

// Register a new user (Admin/Master)
exports.registerUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Check if user already exists
        let user = await User.findOne({ $or: [{ username }, { email }] });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        user = new User({ username, email, password, role: role || 'admin' });

        // Hash password before saving
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Send welcome email if it's an admin or master
        if (email) {
            sendAdminWelcomeEmail(email, username, password).catch(err => console.error("Failed to send admin welcome email", err));
        }

        res.status(201).json({ message: 'User registered successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Login user
exports.loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check for user by username OR email
        const user = await User.findOne({
            $or: [{ username }, { email: username }]
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Populate assignedTests to check status
        await user.populate('assignedTests');

        // Filter active tests (non-completed)
        const activeTests = user.assignedTests.filter(t => t.status !== 'completed');

        // Check if volunteer has assigned tests
        if (user.role === 'volunteer') {
            if (activeTests.length === 0) {
                return res.status(403).json({ message: 'Access denied. You are not assigned to any active tests.' });
            }
        }

        // Return jsonwebtoken
        const payload = {
            user: {
                id: user.id,
                role: user.role,
                assignedTests: activeTests.map(t => t._id)
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'a_default_secret_key',
            { expiresIn: 36000 }, // Expires in 10 hours
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        role: user.role,
                        assignedTests: activeTests.map(t => t._id)
                    }
                });
            }
        );

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add Volunteer
exports.addVolunteer = async (req, res) => {
    try {
        const { email, testId } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });

        // Generate random password
        const generatedPassword = crypto.randomBytes(4).toString('hex'); // 8 chars

        let shouldSendEmail = false;

        if (user) {
            // If user exists, just add the test to their assigned tests if not already there
            if (testId) {
                if (user.assignedTests.includes(testId)) {
                    return res.status(400).json({ message: 'Volunteer is already assigned to this test.' });
                }
                user.assignedTests.push(testId);
                shouldSendEmail = true; // Send email when test is assigned

                // Sync with Test model
                await Test.findByIdAndUpdate(testId, { $addToSet: { volunteers: user._id } });
            }

            if (user.role !== 'volunteer' && user.role !== 'admin' && user.role !== 'master') {
                user.role = 'volunteer';
            }
            if (user.role === 'student') user.role = 'volunteer';

            // If sending email, we might want to update password to ensure they can login
            if (shouldSendEmail) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(generatedPassword, salt);
            }

            await user.save();
        } else {
            // Create new volunteer
            user = new User({
                username: email.split('@')[0] + '_' + crypto.randomBytes(2).toString('hex'),
                email,
                password: generatedPassword, // Will be hashed below
                role: 'volunteer',
                assignedTests: testId ? [testId] : []
            });

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(generatedPassword, salt);
            await user.save();

            if (testId) {
                shouldSendEmail = true;
                // Sync with Test model
                await Test.findByIdAndUpdate(testId, { $addToSet: { volunteers: user._id } });
            }
        }

        if (shouldSendEmail && email) {
            const transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: process.env.EMAIL_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const loginLink = 'http://localhost:3000/login'; // Adjust for production

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Volunteer Access - Placement Test Management',
                html: `
                    <h3>You have been assigned as a volunteer.</h3>
                    <p>You can now mark attendance.</p>
                    <p><strong>Login Details:</strong></p>
                    <p>Username/Email: ${email}</p>
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
        }

        res.status(201).json({ message: 'Volunteer added successfully.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error adding volunteer.' });
    }
};

// Get All Users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .populate('assignedTests', 'name'); // Populate test names

        // Filter: Show Admins/Masters OR Volunteers with assigned tests
        const filteredUsers = users.filter(u => {
            if (u.role === 'admin' || u.role === 'master') return true;
            if (u.role === 'volunteer' && u.assignedTests && u.assignedTests.length > 0) return true;
            return false;
        });

        res.json(filteredUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching users' });
    }
};

// Update User Role
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const requesterRole = req.user.role;
        const targetUserId = req.params.id;

        // Check permissions
        if (requesterRole !== 'master') {
            return res.status(403).json({ message: 'Only Master can change user roles.' });
        }

        const user = await User.findByIdAndUpdate(targetUserId, { role }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating user role' });
    }
};

// Delete User
exports.deleteUser = async (req, res) => {
    try {
        const requesterRole = req.user.role;
        const targetUserId = req.params.id;

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) return res.status(404).json({ message: 'User not found' });

        // Permission Logic
        if (requesterRole === 'master') {
            await User.findByIdAndDelete(targetUserId);
            return res.json({ message: 'User deleted successfully' });
        } else if (requesterRole === 'admin') {
            if (targetUser.role === 'volunteer') {
                await User.findByIdAndDelete(targetUserId);
                return res.json({ message: 'User deleted successfully' });
            } else {
                return res.status(403).json({ message: 'Admins can only delete volunteers.' });
            }
        } else {
            return res.status(403).json({ message: 'Unauthorized' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting user' });
    }
};

// Change Password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();

        res.json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating password' });
    }
};

// Get Volunteers with populated tests
exports.getVolunteersWithTests = async (req, res) => {
    try {
        const volunteers = await User.find({ role: 'volunteer' })
            .select('-password')
            .populate('assignedTests', 'name date campaign');
        res.json(volunteers);
    } catch (error) {
        console.error("Error fetching volunteers:", error);
        res.status(500).json({ message: 'Server error fetching volunteers' });
    }
};

// Toggle Volunteer Test Access
exports.toggleVolunteerTestAccess = async (req, res) => {
    try {
        const { userId } = req.params;
        const { testId, action } = req.body; // action: 'add' or 'remove'

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        let shouldSendEmail = false;
        const generatedPassword = crypto.randomBytes(4).toString('hex');

        if (action === 'add') {
            if (!user.assignedTests.includes(testId)) {
                user.assignedTests.push(testId);
                shouldSendEmail = true;

                // Sync with Test model
                await Test.findByIdAndUpdate(testId, { $addToSet: { volunteers: user._id } });

                // Reset password to ensure they have access (since we don't know if they have the old one)
                // Or we could assume they know it if they are already a volunteer.
                // But the requirement says "a volunteer gets login creds when they are assigned a test".
                // Let's send new creds to be safe.
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(generatedPassword, salt);
            }
        } else if (action === 'remove') {
            user.assignedTests = user.assignedTests.filter(id => id.toString() !== testId);
            // Sync with Test model
            await Test.findByIdAndUpdate(testId, { $pull: { volunteers: user._id } });
        }

        await user.save();

        if (shouldSendEmail && user.email) {
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
                subject: 'Volunteer Access - Placement Test Management',
                html: `
                    <h3>You have been assigned as a volunteer.</h3>
                    <p>You can now mark attendance.</p>
                    <p><strong>Login Details:</strong></p>
                    <p>Username/Email: ${user.email}</p>
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
        }

        // Return updated user with populated tests
        const updatedUser = await User.findById(userId)
            .select('-password')
            .populate('assignedTests', 'name date campaign');

        res.json(updatedUser);

    } catch (error) {
        console.error("Error toggling test access:", error);
        res.status(500).json({ message: 'Server error updating access' });
    }
};

// Bulk Add Volunteers by Roll Number
exports.bulkAddVolunteers = async (req, res) => {
    const { rollNumbers } = req.body; // Array of strings
    if (!rollNumbers || !Array.isArray(rollNumbers)) {
        return res.status(400).json({ message: 'Invalid roll numbers.' });
    }

    let added = 0;
    let updated = 0;
    let failed = 0;

    try {
        for (const roll of rollNumbers) {
            const student = await Student.findOne({ rollNumber: { $regex: new RegExp(`^${roll}$`, 'i') } });

            if (student && student.email) {
                const email = student.email;
                let user = await User.findOne({ email });

                if (user) {
                    if (user.role !== 'master' && user.role !== 'admin') {
                        user.role = 'volunteer';
                        await user.save();
                        updated++;
                    }
                } else {
                    // Create new user
                    const generatedPassword = crypto.randomBytes(4).toString('hex');
                    user = new User({
                        username: student.name.split(' ')[0] + '_' + roll, // e.g. Subham_123
                        email,
                        password: generatedPassword,
                        role: 'volunteer',
                        assignedTests: []
                    });

                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(generatedPassword, salt);
                    await user.save();
                    added++;

                    // NO EMAIL SENT HERE as per requirement
                }
            } else {
                failed++;
            }
        }

        res.json({ message: `Processed. Added: ${added}, Updated: ${updated}, Failed/Not Found: ${failed}` });

    } catch (error) {
        console.error("Error bulk adding volunteers:", error);
        res.status(500).json({ message: 'Server error bulk adding volunteers' });
    }
};
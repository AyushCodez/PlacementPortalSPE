const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
exports.registerUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        let user = await User.findOne({ $or: [{ username }, { email }] });
        if (user) return res.status(400).json({ message: 'User already exists' });

        user = new User({ username, email, password, role: role || 'admin' });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

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
        const user = await User.findOne({ $or: [{ username }, { email: username }] });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // NOTE: removed volunteer access check logic (belongs in domain service or gateway)

        const payload = {
            user: {
                id: user.id,
                role: user.role,
                assignedTests: user.assignedTests // Just send IDs
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'a_default_secret_key',
            { expiresIn: 36000 },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        role: user.role,
                        assignedTests: user.assignedTests
                    }
                });
            }
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get All Users (Management)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
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
        if (requesterRole !== 'master') return res.status(403).json({ message: 'Only Master can change user roles.' });

        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
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
        const targetUser = await User.findById(req.params.id);
        if (!targetUser) return res.status(404).json({ message: 'User not found' });

        if (requesterRole === 'master') {
            await User.findByIdAndDelete(req.params.id);
            return res.json({ message: 'User deleted successfully' });
        } else if (requesterRole === 'admin' && targetUser.role === 'volunteer') {
            await User.findByIdAndDelete(req.params.id);
            return res.json({ message: 'User deleted successfully' });
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
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating password' });
    }
};
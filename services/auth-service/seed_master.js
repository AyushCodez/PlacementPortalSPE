const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const seedMaster = async () => {
    try {
        console.log('Connecting to MongoDB for seeding...');
        await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('MongoDB connected');

        const username = 'master';
        const email = 'master@example.com';
        const password = 'master123';
        const role = 'master';

        let user = await User.findOne({ $or: [{ username }, { email }] });
        if (user) {
            console.log('Master user already exists');
            if (user.role !== 'master') {
                user.role = 'master';
                await user.save();
                console.log('Updated existing user to master role');
            }
        } else {
            user = new User({ username, email, password, role });
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            await user.save();
            console.log('Master user created successfully');
        }

        mongoose.disconnect();
        console.log('Seeding completed.');
    } catch (error) {
        console.error('Error seeding master:', error);
        mongoose.disconnect();
        process.exit(1);
    }
};

seedMaster();

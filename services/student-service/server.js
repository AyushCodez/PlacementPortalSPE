const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5005; // Student Service on 5005

app.use(cors());
app.use(cors());
app.use(express.json());

const fs = require('fs');
const path = require('path');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log('Created uploads directory');
}

// DB Connection (Shared Cluster)
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Student Service: MongoDB connected'))
    .catch(err => console.error(err));

// Routes
app.use('/api/students', require('./routes/students'));

app.listen(PORT, () => console.log(`Student Service running on port ${PORT}`));

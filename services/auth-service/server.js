const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002; // Auth Service on 5002

app.use(cors());
app.use(express.json());

// DB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Auth Service: MongoDB connected'))
    .catch(err => console.error(err));

// Routes
app.use('/api/users', require('./routes/users'));

app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));

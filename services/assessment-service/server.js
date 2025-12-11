const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5004; // Assessment Service on 5004

app.use(cors());
app.use(express.json());

// DB Connection (Shared Cluster)
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Assessment Service: MongoDB connected'))
    .catch(err => console.error(err));

// Routes
app.use('/api/tests', require('./routes/tests'));

app.listen(PORT, () => console.log(`Assessment Service running on port ${PORT}`));

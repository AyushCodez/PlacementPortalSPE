const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5003; // Campaign Service on 5003

app.use(cors());
app.use(express.json());

// DB Connection (Shared Cluster)
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Campaign Service: MongoDB connected'))
    .catch(err => console.error(err));

// Routes
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/volunteers', require('./routes/volunteers'));

app.listen(PORT, () => console.log(`Campaign Service running on port ${PORT}`));

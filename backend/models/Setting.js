// models/Setting.js
const mongoose = require('mongoose');

// Define the schema for application settings.
// This will store key-value pairs for configurable options,
// such as the QR code validity duration.
const settingSchema = new mongoose.Schema({
    key: { 
        type: String, 
        required: true, 
        unique: true // Ensure each setting has a unique key
    },
    value: { 
        type: mongoose.Schema.Types.Mixed, // Allows storing various data types
        required: true 
    }
});

module.exports = mongoose.model('Setting', settingSchema);

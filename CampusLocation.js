// backend/models/CampusLocation.js
const mongoose = require('mongoose');

// Defines a schema for campus locations (nodes in the campus graph).
const campusLocationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  // Geographic coordinates for the location
  location: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  },
  type: { // e.g., 'classroom', 'hostel', 'library', 'lab', 'cafeteria'
    type: String,
    required: true,
    enum: ['classroom', 'hostel', 'library', 'lab', 'cafeteria', 'sports complex', 'admin block', 'other'],
    default: 'other'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add an index for faster lookups by name
campusLocationSchema.index({ name: 1 });

module.exports = mongoose.model('CampusLocation', campusLocationSchema);

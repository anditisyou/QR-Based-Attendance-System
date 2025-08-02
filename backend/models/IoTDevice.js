// backend/models/IoTDevice.js
const mongoose = require('mongoose');

// Defines a schema for IoT devices (nodes in the IoT network graph).
const iotDeviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: { // e.g., 'sensor', 'access_point', 'gateway'
    type: String,
    required: true,
    enum: ['sensor', 'access_point', 'gateway', 'other'],
    default: 'sensor'
  },
  location: { // Geographic coordinates or logical location
    lat: Number,
    lng: Number,
    building: String,
    room: String
  },
  status: { // e.g., 'active', 'inactive', 'maintenance'
    type: String,
    default: 'active'
  },
  installationDate: {
    type: Date,
    default: Date.now
  },
  lastCommunication: {
    type: Date
  }
});

iotDeviceSchema.index({ name: 1 });

module.exports = mongoose.model('IoTDevice', iotDeviceSchema);

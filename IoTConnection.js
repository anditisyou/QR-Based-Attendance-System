// backend/models/IoTConnection.js
const mongoose = require('mongoose');

// Defines a schema for connections between IoT devices (edges in the IoT network graph).
const iotConnectionSchema = new mongoose.Schema({
  fromDevice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IoTDevice',
    required: true
  },
  toDevice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IoTDevice',
    required: true
  },
  cost: { // Weight of the edge, e.g., wiring cost, signal latency
    type: Number,
    required: true,
    min: 0
  },
  connectionType: { // e.g., 'wired', 'wireless', 'fiber'
    type: String,
    default: 'wireless'
  },
  status: { // e.g., 'active', 'broken'
    type: String,
    default: 'active'
  },
  establishedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure unique connections
iotConnectionSchema.index({ fromDevice: 1, toDevice: 1 }, { unique: true });

module.exports = mongoose.model('IoTConnection', iotConnectionSchema);

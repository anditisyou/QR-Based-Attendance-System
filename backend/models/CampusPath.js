// backend/models/CampusPath.js
const mongoose = require('mongoose');

// Defines a schema for paths/edges between campus locations.
const campusPathSchema = new mongoose.Schema({
  fromLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CampusLocation', // References the CampusLocation model
    required: true
  },
  toLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CampusLocation', // References the CampusLocation model
    required: true
  },
  distance: { // Weight of the edge, e.g., in meters
    type: Number,
    required: true,
    min: 0
  },
  type: { // e.g., 'walking_path', 'road', 'corridor'
    type: String,
    default: 'walking_path'
  },
  // Ensures that a path between two locations is unique regardless of direction
  // For undirected graphs, you might only store one direction (e.g., A->B)
  // Or store both A->B and B->A if distances can differ.
  // For simplicity, this assumes a directed path, but for shortest path,
  // you'd typically add both directions if the path is traversable both ways.
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add a compound index to ensure unique paths and efficient lookups
campusPathSchema.index({ fromLocation: 1, toLocation: 1 }, { unique: true });

module.exports = mongoose.model('CampusPath', campusPathSchema);

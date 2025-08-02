// backend/models/LearningActivity.js
const mongoose = require('mongoose');

// Defines a schema for learning activities, courses, or certifications
// used for profile optimization (Knapsack problem).
const learningActivitySchema = new mongoose.Schema({
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
  value: { // Represents the "profile boost" or "benefit" (value in Knapsack)
    type: Number,
    required: true,
    min: 0
  },
  weight: { // Represents the "time" or "effort" required (weight in Knapsack)
    type: Number,
    required: true,
    min: 0
  },
  category: { // e.g., 'programming', 'soft_skills', 'certification', 'project'
    type: String,
    default: 'other'
  },
  durationUnit: { // e.g., 'hours', 'weeks', 'months'
    type: String,
    default: 'hours'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

learningActivitySchema.index({ name: 1 });

module.exports = mongoose.model('LearningActivity', learningActivitySchema);

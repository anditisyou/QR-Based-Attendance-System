// backend/models/Friendship.js
const mongoose = require('mongoose');

// Defines a schema for friendships in a student community system.
// This assumes a bidirectional friendship (if A is friend with B, B is friend with A).
// For simplicity, we'll store two entries for each friendship (A->B and B->A)
// or handle it in the application logic to ensure bidirectionality.
const friendshipSchema = new mongoose.Schema({
  // Reference to the 'User' model (or 'StudentProfile' if that's preferred for social features)
  // Assuming 'User' for simplicity, as it has universityRollNo
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: { // e.g., 'pending', 'accepted', 'blocked'
    type: String,
    enum: ['pending', 'accepted', 'blocked'],
    default: 'accepted' // Assuming direct friendship for graph traversal
  },
  establishedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure unique friendships regardless of order (e.g., {A,B} is same as {B,A})
// This requires a custom validation or ensuring order before saving.
// For now, we'll rely on application logic to prevent duplicates like (A,B) and (B,A)
// if we only want one representation. For graph traversal, both might be useful.
friendshipSchema.index({ user1: 1, user2: 1 }, { unique: true });

module.exports = mongoose.model('Friendship', friendshipSchema);

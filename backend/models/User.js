const mongoose = require('mongoose');

const usersSchema = new mongoose.Schema({
  name: String,
  universityRollNo: { type: String, unique: true },
  section: String,
  classRollNo: String,
  registeredAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', usersSchema);
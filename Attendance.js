const mongoose = require('mongoose');
//Mark attendance Page
const attendanceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  universityRollNo: { type: String, required: true },
  section: { type: String, required: true },
  classRollNo: { type: String, required: true },
  date: { type: String, required: true },
  time: {
    type: String,
    default: () => new Date().toLocaleTimeString('en-IN', { hour12: false })
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  deviceFingerprint: { type: String, required: true },
  status: { type: String, default: "present" },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Create indexes
attendanceSchema.index({ universityRollNo: 1, date: 1 });
attendanceSchema.index({ deviceFingerprint: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
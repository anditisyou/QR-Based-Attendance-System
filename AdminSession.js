const mongoose = require('mongoose');
//Admin login session 
const AdminSessionSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  ipAddress: String,
  userAgent: String,
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdminSession', AdminSessionSchema);
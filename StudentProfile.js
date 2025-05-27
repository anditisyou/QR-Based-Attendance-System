const mongoose = require('mongoose');
//For dashboard
const studentProfileSchema = new mongoose.Schema({
    universityRollNo: { type: String, required: true, unique: true },
    personalInfo: {
      fullName: String,
      profilePicture: String,
      dob: String,
      gender: String,
      contactNumber: String,
      email: String,
      address: String,
      linkedin: String,
      github: String
    },
    academicInfo: {
      universityName: String,
      classRollNo: String,
      regNo: String,
      department: String,
      courseDuration: String,
      admissionYear: String,
      gradYear: String,
      section: String,
      academicYear: String,
      attendancePercentage: Number,
      cgpa: Number,
      advisor: String
    },
    skills: {
      programming: [String],
      tools: [String],
      domains: [String],
      softSkills: [String],
      proficiency: Map
    },
    documents: {
      idCardUrl: String,
      bonafideUrl: String,
      feeReceipts: [String],
      gradeSheets: [String],
      resumeUrl: String
    }
  },{ collection: 'students' });
  module.exports = mongoose.model('StudentProfile', studentProfileSchema);
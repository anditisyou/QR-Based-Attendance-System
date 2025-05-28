const mongoose = require('mongoose');

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
      proficiency: Map // e.g., { "Python": "Intermediate" }
    },
    documents: {
      idCardUrl: String,
      bonafideUrl: String,
      feeReceipts: [String],
      gradeSheets: [String],
      resumeUrl: String
    }
  },{ collection: 'studentprofiles' });
  module.exports = mongoose.model('StudentProfile', studentProfileSchema);
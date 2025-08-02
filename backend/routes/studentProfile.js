const express = require('express');
const router = express.Router();
const StudentProfile = require('../models/StudentProfile');

// Get student profile by roll number
router.get('/profile', async (req, res) => {
  try {
    const { rollNo } = req.query;
    if (!rollNo) {
      return res.status(400).json({ error: 'Roll number is required' });
    }

    const student = await StudentProfile.findOne({ 
      universityRollNo: rollNo 
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ data: student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
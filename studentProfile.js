const express = require('express');
const router = express.Router();
const StudentProfile = require('../models/StudentProfile');

// GET student profile by roll number
router.get('/profile', async (req, res) => {
  try {
    const { rollNo } = req.query;
    const profile = await StudentProfile.findOne({ universityRollNo: rollNo });
    
    if (!profile) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json({ data: profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
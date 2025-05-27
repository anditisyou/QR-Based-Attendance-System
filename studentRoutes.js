const express = require('express');
const router = express.Router();
const Student = require('../models/StudentProfile');

// GET /api/students/profile?rollNo=xxxxx
router.get('/profile', async (req, res) => {
  try {
    const { rollNo } = req.query;
    
    if (!rollNo) {
      return res.status(400).json({ 
        success: false,
        error: "Roll number is required"
      });
    }

    const student = await Student.findOne({ 
      universityRollNo: rollNo.trim()
    });

    if (!student) {
      return res.status(404).json({
        success: false, 
        error: "Student not found"
      });
    }

    res.json({
      success: true,
      data: student
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
});

module.exports = router;
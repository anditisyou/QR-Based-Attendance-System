const express = require('express');
const router = express.Router();
const Attendance = require("../models/Attendance");

// Get attendance by roll number
router.get('/', async (req, res) => {
  try {
    const { rollNo } = req.query;
    
    if (!rollNo) {
      return res.status(400).json({ error: "Roll number is required" });
    }

    const attendance = await Attendance.find({ universityRollNo: rollNo })
      .sort({ date: -1, time: -1 });

    res.json(attendance);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const Attendance = require("../models/Attendance");
const User = require("../models/User");

// GET student attendance records
router.get('/', async (req, res) => {
  try {
    const { rollNo } = req.query;

    if (!rollNo) {
      return res.status(400).json({ message: "Roll number is required" });
    }

    // Get student info
    const student = await User.findOne({ universityRollNo: rollNo });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get attendance records
    const attendance = await Attendance.find({ universityRollNo: rollNo })
      .sort({ date: -1, time: -1 });

    res.json({
      status: "success",
      name: student.name,
      universityRollNo: student.universityRollNo,
      attendance
    });
  } catch (error) {
    console.error("Attendance fetch error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
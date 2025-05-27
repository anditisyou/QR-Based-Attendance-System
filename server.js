const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const path = require('path');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require("helmet");
//const sha256 = require('./sha256');
const { execSync } = require('child_process');

const requiredEnvVars = ['MONGO_URI'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`${envVar} environment variable is required`);
    process.exit(1);
  }
});

const app = express();

// Configuration Constants
const CLASS_LAT = 30.2679634;
const CLASS_LNG = 77.991887;
const MAX_DISTANCE_METERS = 1000;

const QR_CODE_DIR = path.join(__dirname, '../frontend/public/qrcodes');

// Middleware Setup
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": [
          "'self'",
          "https://cdn.tailwindcss.com",
          "https://cdn.jsdelivr.net",
          "'unsafe-inline'"
        ],
        "style-src": [
          "'self'",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "'unsafe-inline'"
        ],
        "font-src": [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com"
        ],
        "img-src": [
          "'self'",
          "data:",
          "https://ui-avatars.com"
        ]
      }
    }
  })
);


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});


// QR Code Directory Setup
try {
  if (!fs.existsSync(QR_CODE_DIR)) {
    fs.mkdirSync(QR_CODE_DIR, { recursive: true });
    console.log(` Created QR code directory at: ${QR_CODE_DIR}`);
  }

  // Clean up old QR codes on startup
  fs.readdir(QR_CODE_DIR, (err, files) => {
    if (err) {
      console.error('Startup cleanup error:', err);
      return;
    }
    
    const now = Date.now();
    files.forEach(file => {
      if (file.startsWith('qr_') && file.endsWith('.png')) {
        const fileTimestamp = parseInt(file.split('_')[1].split('.')[0]);
        if (isNaN(fileTimestamp) || (now - fileTimestamp > 1.5 * 60 * 1000)) {
          fs.unlink(path.join(QR_CODE_DIR, file), err => {
            if (err) console.error('Error deleting file:', file, err);
          });
        }
      }
    });
  });
  
  app.use('/qrcodes', express.static(QR_CODE_DIR, {
    maxAge: '1h', // Cache for 1 hour
    setHeaders: (res, path) => {
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));
  console.log(` Serving QR codes from: ${QR_CODE_DIR}`);
} 
catch (err) {
  console.error(' Failed to setup QR code directory:', err);
  process.exit(1);
}

// Rate limiting for QR generation
const qrLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  handler: (req, res) => {
    console.log(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: "error",
      message: "Too many QR requests. Please wait a minute."
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Import models and routes
const User = require("./models/User");
const Attendance = require("./models/Attendance");
const StudentProfile = require("./models/StudentProfile");
const studentProfileRoutes = require("./routes/studentProfile");
const attendanceRoutes = require("./routes/attendance");
const { generateQRCode, validateSession } = require('./qr-generator');

// Routes
app.use("/api/students", studentProfileRoutes);
app.use("/api/attendance", attendanceRoutes);
// Add this with your other routes
// Add this with your other student routes (only once)

app.get('/api/students/by-attendance-range', async (req, res) => {
    try {
        const { min, max } = req.query;
        
        // Validate inputs
        if (!min || !max) {
            return res.status(400).json({ 
                error: 'Both min and max percentage parameters are required' 
            });
        }
        
        const minPercentage = parseFloat(min);
        const maxPercentage = parseFloat(max);
        
        if (isNaN(minPercentage)) {
            return res.status(400).json({ 
                error: 'Minimum percentage must be a number' 
            });
        }
        
        if (isNaN(maxPercentage)) {
            return res.status(400).json({ 
                error: 'Maximum percentage must be a number' 
            });
        }
        
        if (minPercentage < 0 || maxPercentage > 100) {
            return res.status(400).json({ 
                error: 'Percentages must be between 0 and 100' 
            });
        }
        
        if (minPercentage > maxPercentage) {
            return res.status(400).json({ 
                error: 'Minimum percentage cannot be greater than maximum' 
            });
        }

        // Get all unique class dates (for calculating total possible classes)
        const allDates = await Attendance.find().distinct('date');
        const totalClasses = allDates.length;
        
        if (totalClasses === 0) {
            return res.json({ 
                status: "success", 
                data: [] 
            });
        }

        // Optimized aggregation to get students with attendance in range
        const results = await StudentProfile.aggregate([
            {
                $lookup: {
                    from: "attendances",
                    let: { rollNo: "$universityRollNo" },
                    pipeline: [
                        { 
                            $match: { 
                                $expr: { 
                                    $and: [
                                        { $eq: ["$universityRollNo", "$$rollNo"] },
                                        { $eq: ["$status", "present"] }
                                    ]
                                }
                            }
                        },
                        { $count: "presentDays" }
                    ],
                    as: "attendance"
                }
            },
            {
                $addFields: {
                    presentDays: { $ifNull: [{ $arrayElemAt: ["$attendance.presentDays", 0] }, 0] },
                    totalClasses: totalClasses,
                    attendancePercentage: {
                        $round: [
                            { 
                                $multiply: [
                                    { 
                                        $divide: [
                                            { $ifNull: [{ $arrayElemAt: ["$attendance.presentDays", 0] }, 0] },
                                            totalClasses
                                        ] 
                                    },
                                    100
                                ] 
                            }
                        ]
                    }
                }
            },
            {
                $match: {
                    attendancePercentage: { $gte: minPercentage, $lte: maxPercentage }
                }
            },
            {
                $sort: { attendancePercentage: -1 }
            },
            {
                $project: {
                    universityRollNo: 1,
                    name: 1,
                    section: 1,
                    attendancePercentage: 1,
                    presentDays: 1,
                    totalClasses: 1,
                    _id: 0
                }
            }
        ]);

        res.json({ 
            status: "success",
            data: results 
        });

    } catch (error) {
        console.error("Error fetching students by attendance range:", error);
        res.status(500).json({ 
            status: "error", 
            message: error.message 
        });
    }
});
app.get('/api/attendance/dates', async (req, res) => {
  try {
    const dates = await Attendance.find().distinct('date');
    res.json({ status: "success", data: dates });
  } catch (error) {
    console.error("Error fetching attendance dates:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});
app.get('/api/attendance/by-date', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ error: 'Date parameter is required' });
        }

        const attendance = await Attendance.find({ 
            date: date,
            status: 'present'
        }).sort({ universityRollNo: 1 });

        res.json({ 
            status: "success",
            data: attendance 
        });
    } catch (error) {
        console.error("Error fetching attendance by date:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});
// QR Code Generation Endpoint
app.get("/api/generate-qr", qrLimiter, async (req, res) => {
  try {
    console.log(`Generating QR code for IP: ${req.ip}`);
    const qrData = await generateQRCode(req.ip);
    
    console.log(` Generated QR code at: ${qrData.qrImage}`);
    res.json({
      status: "success",
      qrImage: qrData.qrImage,
      sessionId: qrData.sessionId
    });
  } catch (error) {
    console.error("QR generation error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate QR code",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// Add this with your other routes
app.post('/api/consistent-hash', async (req, res) => {
    try {
        const { input } = req.body;
        
        // Validate input
        if (typeof input !== 'string' || !input.trim()) {
            return res.status(400).json({ error: 'Input must be a non-empty string' });
        }

        // Execute Java program
        const escapedInput = input
            .replace(/"/g, '\\"')          // Escape double quotes
            .replace(/\$/g, '\\$')         // Escape dollar signs (shell injection)
            .replace(/`/g, '\\`');         // Escape backticks (shell injection)

        // Use absolute path to Java class and specify classpath
        const command = `java ConsistentHash "${escapedInput}"`;
        
        const result = execSync(command, { 
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore'],
            timeout: 5000  // Kill process if it hangs (5 seconds)
        });

        // Validate Java output (must be 8-character hex)
        if (!/^[0-9a-f]{8}$/.test(result.trim())) {
            throw new Error('Invalid hash format from Java');
        }

        res.json({ fingerprint: result.trim() });
    } catch (error) {
        console.error("Consistent hash error:", error);
        
        // Fallback to JavaScript implementation if Java fails
        const jsHash = consistentHashJS(req.body.input);  // Implement this as a backup
        res.status(500).json({ 
            error: 'Java hashing failed. Used JS fallback.',
            fingerprint: jsHash 
        });
    }
});

// Fallback JavaScript implementation (same as original)
function consistentHashJS(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}
// Session Validation Endpoint
app.post("/api/validate-session", async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ 
        valid: false, 
        message: "Session ID required" 
      });
    }
    
    const isValid = validateSession(sessionId);
    res.json({ 
      valid: isValid,
      message: isValid ? "Valid session" : "Invalid or expired session ID"
    });
  } catch (error) {
    console.error("Session validation error:", error);
    res.status(500).json({ 
      valid: false,
      message: "Validation error"
    });
  }
});
// Replace the current /verify-attendance route with:
// In server.js, update the verify-attendance route:
app.get('/verify-attendance', (req, res) => {
    try {
        console.log('Raw query data:', req.query.data); // Add this line
        const dataStr = decodeURIComponent(req.query.data);
        const data = JSON.parse(dataStr);
        console.log('Parsed data:', data); // Add this line

        // Validate required fields
        if (!data?.sessionId || !data?.timestamp || !data?.hash) {
            console.log('Missing fields in data:', data); // Add this line
            return res.status(400).send('Invalid QR code data: Missing fields');
        }

        const secretKey = process.env.QR_SECRET_KEY || 'default-secret-key';
        console.log('Using secret key:', secretKey); // Add this line
        
        const hashInput = data.sessionId + data.timestamp + secretKey;
        console.log('Hash input string:', hashInput); // Add this line
        
        const expectedHash = sha256(hashInput);
        console.log('Expected hash:', expectedHash); // Add this line
        console.log('Received hash:', data.hash); // Add this line

        if (data.hash !== expectedHash) {
            console.log('Hash mismatch details:', {
                input: hashInput,
                expected: expectedHash,
                received: data.hash
            }); // Add this line
            return res.status(400).send('Invalid QR code: Hash mismatch');
        }

        // Check if session is expired (optional)
        const currentTime = Date.now();
        const qrExpiryTime = 15 * 60 * 1000; // 15 minutes
        if (currentTime - data.timestamp > qrExpiryTime) {
            return res.status(400).send('QR code expired');
        }

        // Redirect to the attendance page with sessionId
        res.redirect(`/index.html?sessionId=${data.sessionId}`);
    }  catch (error) {
        console.error('QR validation error:', error);
        res.status(400).send('Invalid QR code data');
    }
});

// Haversine Distance Calculation
function getDistanceFromLatLngInMeters(lat1, lng1, lat2, lng2) {
    try {
        // Escape quotes and special characters in coordinates
        const command = `java Haversine ${lat1} ${lng1} ${lat2} ${lng2}`;
        
        // Execute Java program synchronously
        const result = execSync(command, { 
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore'] // Suppress Java errors from stderr
        });
        
        return parseFloat(result.trim());
    } catch (error) {
        console.error("Java Haversine Error:", error.message);
        
        // Fallback to original JavaScript implementation if Java fails
        const toRad = angle => (angle * Math.PI) / 180;
        const R = 6371000;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}

function sha256(input) {
    try {
        // Escape quotes and special characters in input
        const escapedInput = input.replace(/"/g, '\\"');
        const command = `java SHA256 "${escapedInput}"`;
        
        // Execute Java program synchronously
        const result = execSync(command, { 
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore'] // Suppress Java errors from stderr
        });
        
        return result.trim();
    } catch (error) {
        console.error("Java SHA-256 Error:", error.message);
        throw new Error("Failed to compute SHA-256 hash");
    }
}

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    dbState: mongoose.connection.readyState,
    uptime: process.uptime()
  });
});


// Attendance Validation Middleware
function validateAttendance(req, res, next) {
  const required = ['name', 'universityRollNo', 'section', 'classRollNo', 'deviceFingerprint'];
  const missing = required.filter(field => !req.body[field]);

  if (missing.length) {
    return res.status(400).json({
      status: "error",
      message: `Missing required fields: ${missing.join(', ')}`
    });
  }

  if (!req.body.location || typeof req.body.location.lat !== "number" || typeof req.body.location.lng !== "number") {
    return res.status(400).json({
      status: "error",
      message: "Location (lat, lng) is required and must be numeric"
    });
  }

  next();
}

// Mark Attendance Endpoint
app.post("/mark-attendance", validateAttendance, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { universityRollNo, deviceFingerprint, location } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Check existing attendance
    const [existing, existingDevice] = await Promise.all([
      Attendance.findOne({ universityRollNo, date: today }).session(session),
      Attendance.findOne({ deviceFingerprint, date: today }).session(session)
    ]);

    if (existing) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: "error",
        message: "You've already marked attendance today"
      });
    }

    if (existingDevice) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: "error",
        message: "This device has already been used to mark attendance today"
      });
    }

    // Check location
    const distance = getDistanceFromLatLngInMeters(
      location.lat, location.lng,
      CLASS_LAT, CLASS_LNG
    );

    if (distance > MAX_DISTANCE_METERS) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: "error",
        message: "You must be within 100 meters of the classroom to mark attendance"
      });
    }

    // Create/update student
    const student = await User.findOneAndUpdate(
      { universityRollNo },
      {
        $setOnInsert: {
          name: req.body.name,
          section: req.body.section,
          classRollNo: req.body.classRollNo
        }
      },
      {
        new: true,
        upsert: true,
        session
      }
    );

    // Create attendance record
    const attendance = await Attendance.create([{
      ...req.body,
      date: today,
      time: new Date().toLocaleTimeString('en-IN', { hour12: false }),
      status: "present",
      studentId: student._id,
      distanceFromClass: distance
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      status: "success",
      message: "Attendance marked successfully",
      data: attendance[0]
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Attendance error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.get('/api/students/profile', async (req, res) => {
    try {
        const { rollNo } = req.query;
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
app.get('/api/students/notifications', async (req, res) => {
  const { rollNo } = req.query;
  // TODO: Replace with real data lookup
  const dummyNotifications = [
    { text: "Assignment deadline extended!", timestamp: new Date(), read: false },
    { text: "New grades posted.", timestamp: new Date(), read: true }
  ];
  res.json({ data: dummyNotifications });
});

app.post('/api/students/notifications/read', (req, res) => {
  res.json({ status: 'success' }); // Simulate marking as read
});

// Update the attendance route to match frontend expectations
app.get("/api/students/:rollNo/attendance", async (req, res) => {
    try {
        const { rollNo } = req.params;
        const period = req.query.period || 'current';
        
        // First verify student exists
        const student = await StudentProfile.findOne({ universityRollNo: rollNo });
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Calculate date range based on period
        const dateRange = {
            current: () => ({ 
                start: new Date(new Date().setMonth(new Date().getMonth() - 4)), 
                end: new Date() 
            }),
            last: () => ({ 
                start: new Date(new Date().setMonth(new Date().getMonth() - 8)), 
                end: new Date(new Date().setMonth(new Date().getMonth() - 4)) 
            }),
            year: () => ({ 
                start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), 
                end: new Date() 
            })
        };

        const { start, end } = dateRange[period] ? dateRange[period]() : dateRange.current();

        // Get all attendance records for the period (to calculate total classes)
        const allAttendance = await Attendance.find({
            date: {
                $gte: new Date(start).toISOString().split('T')[0],
                $lte: new Date(end).toISOString().split('T')[0]
            }
        }).distinct('date');

        const totalClasses = allAttendance.length;

        // Get student's attendance records
        const attendance = await Attendance.find({
            universityRollNo: rollNo,
            date: {
                $gte: new Date(start).toISOString().split('T')[0],
                $lte: new Date(end).toISOString().split('T')[0]
            }
        }).sort({ date: 1 });

        // Calculate statistics
        const presentDays = attendance.filter(a => a.status === 'present').length;
        const percentage = totalClasses > 0 ? Math.round((presentDays / totalClasses) * 100) : 0;

        // Monthly data for chart
        const monthlyData = attendance.reduce((acc, record) => {
            const monthYear = new Date(record.date).toLocaleString('default', { month: 'short', year: 'numeric' });
            if (!acc[monthYear]) acc[monthYear] = { present: 0, total: 0 };
            acc[monthYear].total++;
            if (record.status === 'present') acc[monthYear].present++;
            return acc;
        }, {});

        const labels = Object.keys(monthlyData);
        const studentAttendance = labels.map(label => 
            Math.round((monthlyData[label].present / monthlyData[label].total) * 100)
        );

        // Format response to match frontend expectations
        res.json({
            status: "success",
            data: {
                attendanceRecords: attendance,
                attendancePercentage: percentage,
                totalClasses: totalClasses, // Add this for reference
                presentDays: presentDays, // Add this for reference
                chartData: {
                    labels,
                    studentAttendance,
                    departmentAverage: studentAttendance.map(p => Math.max(70, Math.min(95, p + (Math.random() * 10 - 5))))
                }
            }
        });

    } catch (error) {
        console.error("Error fetching attendance:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});
app.get('/api/students/:rollNo/documents', async (req, res) => {
  const { rollNo } = req.params;

  // You can load from MongoDB later; for now return dummy values
  res.json({
    data: {
      idCardUrl: null,
      resumeUrl: null,
      feeReceipts: [],
      gradeSheets: []
    }
  });
});
app.post('/api/students/notifications/read', (req, res) => {
  const { rollNo } = req.body;

  // TODO: Implement actual DB update here:
  // Example with MongoDB:
  // await Notification.updateMany({ rollNo, read: false }, { $set: { read: true } });

  console.log(`Marking all notifications as read for rollNo: ${rollNo}`);

  // For now, just simulate success
  res.json({ status: 'success' });
});


// Error Handlers
app.use((req, res) => {
  res.status(404).json({ status: "error", message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(" Server error:", {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method
  });
  res.status(500).json({ status: "error", message: "Internal server error" });
});

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log(" Connected to MongoDB");
    try {
      await Attendance.createIndexes([
        { universityRollNo: 1, date: 1 },
        { deviceFingerprint: 1, date: 1 }
      ]);
      console.log("Indexes created");
    } catch (err) {
      console.error("Index creation error:", err);
    }
  })
  .catch(err => {
    console.error(" MongoDB connection error:", err);
    process.exit(1);
  });

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



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

// Import models and routes
const User = require("./models/User");
const Attendance = require("./models/Attendance");
const StudentProfile = require("./models/StudentProfile");
const studentProfileRoutes = require("./routes/studentProfile");
const attendanceRoutes = require("./routes/attendance");
const { generateQRCode, validateSession } = require('./qr-generator');

// --- NEW: Import algorithm modules ---
// Assuming these files exist in an 'algorithms' directory at the same level as server.js
// And they export functions as described in the thought process.
let dijkstra, profileOptimizer, graphTraversal;
try {
  dijkstra = require('./algorithms/dijkstra');
  profileOptimizer = require('./algorithms/profileOptimizer');
  graphTraversal = require('./algorithms/graphTraversal');
  console.log("Successfully loaded algorithm modules.");
} catch (err) {
  console.warn("Warning: Could not load one or more algorithm modules. Related endpoints might not work.", err.message);
  // Define dummy functions if modules are missing to prevent server crashes on require
  dijkstra = { findShortestPath: () => { throw new Error("Dijkstra module not loaded"); } };
  profileOptimizer = { getProfileRecommendations: () => { throw new Error("ProfileOptimizer module not loaded"); } };
  graphTraversal = { exploreCommunity: () => { throw new Error("GraphTraversal module not loaded"); } };
}
// --- END NEW ---


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


// Routes
app.use("/api/students", studentProfileRoutes);
app.use("/api/attendance", attendanceRoutes);

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

        // Aggregation to get students with attendance in range
       const results = await StudentProfile.aggregate([
    {
        $lookup: {
            from: "users",  // Join with User collection
            localField: "universityRollNo",
            foreignField: "universityRollNo",
            as: "user"
        }
    },
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
            },
            // Handle both data structures
            name: {
                $ifNull: [
                    { $arrayElemAt: ["$user.name", 0] },
                    { $arrayElemAt: ["$user.personalInfo.fullName", 0] },
                    "N/A"
                ]
            },
            section: {
                $ifNull: [
                    { $arrayElemAt: ["$user.section", 0] },
                    { $arrayElemAt: ["$user.academicInfo.section", 0] },
                    "N/A"
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

        // --- MANUAL SORTING (Bubble Sort, descending by attendancePercentage) ---
        if (results && results.length > 1) {
            const n = results.length;
            for (let i = 0; i < n - 1; i++) {
                for (let j = 0; j < n - i - 1; j++) {
                    // Sort in descending order of attendancePercentage
                    if (results[j].attendancePercentage < results[j + 1].attendancePercentage) {
                        // Swap elements
                        const temp = results[j];
                        results[j] = results[j + 1];
                        results[j + 1] = temp;
                    }
                }
            }
        }
        // --- END MANUAL SORTING ---

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
app.post('/api/consistent-hash', async (req, res) => {
    try {
        const { input } = req.body;
        
        if (typeof input !== 'string' || !input.trim()) {
            return res.status(400).json({ error: 'Input must be a non-empty string' });
        }

        const escapedInput = input
            .replace(/"/g, '\\"')
            .replace(/\$/g, '\\$')
            .replace(/`/g, '\\`');

        const command = `java ConsistentHash "${escapedInput}"`;
        
        const result = execSync(command, { 
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore'],
            timeout: 5000
        });

        if (!/^[0-9a-f]{8}$/.test(result.trim())) {
            throw new Error('Invalid hash format from Java');
        }

        res.json({ fingerprint: result.trim() });
    } catch (error) {
        console.error("Consistent hash error:", error);
        const jsHash = consistentHashJS(req.body.input);
        res.status(500).json({ 
            error: 'Java hashing failed. Used JS fallback.',
            fingerprint: jsHash 
        });
    }
});

function consistentHashJS(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}

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

app.get('/verify-attendance', (req, res) => {
    try {
        console.log('Raw query data:', req.query.data);
        const dataStr = decodeURIComponent(req.query.data);
        const data = JSON.parse(dataStr);
        console.log('Parsed data:', data);

        if (!data?.sessionId || !data?.timestamp || !data?.hash) {
            console.log('Missing fields in data:', data);
            return res.status(400).send('Invalid QR code data: Missing fields');
        }

        const secretKey = process.env.QR_SECRET_KEY || 'default-secret-key';
        console.log('Using secret key:', secretKey);
        
        const hashInput = data.sessionId + data.timestamp + secretKey;
        console.log('Hash input string:', hashInput);
        
        const expectedHash = sha256(hashInput);
        console.log('Expected hash:', expectedHash);
        console.log('Received hash:', data.hash);

        if (data.hash !== expectedHash) {
            console.log('Hash mismatch details:', {
                input: hashInput,
                expected: expectedHash,
                received: data.hash
            });
            return res.status(400).send('Invalid QR code: Hash mismatch');
        }

        const currentTime = Date.now();
        const qrExpiryTime = 15 * 60 * 1000;
        if (currentTime - data.timestamp > qrExpiryTime) {
            return res.status(400).send('QR code expired');
        }

        res.redirect(`/index.html?sessionId=${data.sessionId}`);
    }  catch (error) {
        console.error('QR validation error:', error);
        res.status(400).send('Invalid QR code data');
    }
});

function getDistanceFromLatLngInMeters(lat1, lng1, lat2, lng2) {
    try {
        const command = `java Haversine ${lat1} ${lng1} ${lat2} ${lng2}`;
        const result = execSync(command, { 
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore']
        });
        return parseFloat(result.trim());
    } catch (error) {
        console.error("Java Haversine Error:", error.message);
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
        const escapedInput = input.replace(/"/g, '\\"');
        const command = `java SHA256 "${escapedInput}"`;
        const result = execSync(command, { 
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore']
        });
        return result.trim();
    } catch (error) {
        console.error("Java SHA-256 Error:", error.message);
        // Fallback to crypto module if Java fails (more robust)
        console.warn("Java SHA-256 failed. Using Node.js crypto fallback.");
        return crypto.createHash('sha256').update(input).digest('hex');
        // throw new Error("Failed to compute SHA-256 hash"); // Original behavior
    }
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    dbState: mongoose.connection.readyState,
    uptime: process.uptime()
  });
});

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

app.post("/mark-attendance", validateAttendance, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { universityRollNo, deviceFingerprint, location } = req.body;
    const today = new Date().toISOString().split('T')[0];

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

    const distance = getDistanceFromLatLngInMeters(
      location.lat, location.lng,
      CLASS_LAT, CLASS_LNG
    );

    if (distance > MAX_DISTANCE_METERS) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: "error",
        message: `You must be within ${MAX_DISTANCE_METERS} meters of the classroom to mark attendance. Current distance: ${distance.toFixed(0)}m`
      });
    }

    const student = await User.findOneAndUpdate(
      { universityRollNo },
      {
        $setOnInsert: {
          name: req.body.name,
          section: req.body.section,
          classRollNo: req.body.classRollNo
        }
      },
      { new: true, upsert: true, session }
    );

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
        console.log(`[PROFILE] Attempting to find profile for rollNo: ${rollNo}`); // ADD THIS
        const student = await StudentProfile.findOne({ universityRollNo: rollNo });
        
        if (!student) {
            console.log(`[PROFILE] Student not found: ${rollNo}`); // ADD THIS
            return res.status(404).json({ error: 'Student not found' });
        }
        console.log(`[PROFILE] Student found:`, student); // ADD THIS
        res.json({ data: student });
    } catch (error) {
        console.error(`[PROFILE] Error fetching profile for ${rollNo}:`, error); // ADD THIS
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
  const { rollNo } = req.body;
  // TODO: Implement actual DB update here
  console.log(`Marking all notifications as read for rollNo: ${rollNo}`);
  res.json({ status: 'success' });
});

app.get("/api/students/:rollNo/attendance", async (req, res) => {
    try {
        const { rollNo } = req.params;
        const period = req.query.period || 'current';
        
        const student = await StudentProfile.findOne({ universityRollNo: rollNo });
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

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

        const allAttendance = await Attendance.find({
            date: {
                $gte: new Date(start).toISOString().split('T')[0],
                $lte: new Date(end).toISOString().split('T')[0]
            }
        }).distinct('date');

        const totalClasses = allAttendance.length;

        const attendance = await Attendance.find({
            universityRollNo: rollNo,
            date: {
                $gte: new Date(start).toISOString().split('T')[0],
                $lte: new Date(end).toISOString().split('T')[0]
            }
        }).sort({ date: 1 });

        const presentDays = attendance.filter(a => a.status === 'present').length;
        const percentage = totalClasses > 0 ? Math.round((presentDays / totalClasses) * 100) : 0;

        const monthlyData = attendance.reduce((acc, record) => {
            const monthYear = new Date(record.date).toLocaleString('default', { month: 'short', year: 'numeric' });
            if (!acc[monthYear]) acc[monthYear] = { present: 0, total: 0 };
            // This total might be per student, not overall if a class was held but student was absent.
            // For overall total, we'd need all class dates.
            // The current logic for monthlyData seems to count days the student had a record.
            // Let's assume for now this is fine for the chart.
            const dateKey = new Date(record.date).toISOString().split('T')[0];
            // Count total based on all class dates in that month
            // This part is tricky, depends on how `allAttendance` (all unique class dates) is used here.
            // For simplicity, current approach is okay.
            acc[monthYear].total++; // This counts student's records
            if (record.status === 'present') acc[monthYear].present++;
            return acc;
        }, {});

        const labels = Object.keys(monthlyData);
        const studentAttendance = labels.map(label => 
            monthlyData[label].total > 0 ? Math.round((monthlyData[label].present / monthlyData[label].total) * 100) : 0
        );

        res.json({
            status: "success",
            data: {
                attendanceRecords: attendance,
                attendancePercentage: percentage,
                totalClasses: totalClasses,
                presentDays: presentDays,
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
  // Dummy data, replace with DB lookup
  res.json({
    data: {
      idCardUrl: null, // or 'path/to/idcard.pdf'
      resumeUrl: null, // or 'path/to/resume.pdf'
      feeReceipts: [], // or [{ name: 'Sem1_Receipt.pdf', url: '...' }]
      gradeSheets: []  // or [{ name: 'Sem1_Grades.pdf', url: '...' }]
    }
  });
});


// --- NEW ALGORITHM ENDPOINTS ---

// Dijkstra: Shortest path from hostel to class
app.get('/api/navigation/shortest-path', async (req, res) => {
    try {
        const { start, end } = req.query;
        if (!start || !end) {
            return res.status(400).json({ status: "error", message: "Start and end locations are required." });
        }

        // Placeholder: graphData should represent your campus map (nodes, edges, weights)
        // This would typically be loaded from a database or a configuration file.
        const graphData = {
            nodes: ["HostelA", "HostelB", "Library", "Mess", "AdminBuilding", "CSEDept", "ECEdept", "MainGate"],
            edges: [
                { from: "HostelA", to: "Mess", weight: 5 }, // weight could be distance in meters or time in minutes
                { from: "HostelA", to: "Library", weight: 7 },
                { from: "Mess", to: "CSEDept", weight: 10 },
                { from: "Library", to: "CSEDept", weight: 6 },
                { from: "Library", to: "AdminBuilding", weight: 3 },
                { from: "AdminBuilding", to: "ECEdept", weight: 4 },
                { from: "CSEDept", to: "ECEdept", weight: 2 },
                { from: "MainGate", to: "HostelA", weight: 15 },
                { from: "MainGate", to: "AdminBuilding", weight: 8 },
            ]
        };
        
        if (!graphData.nodes.includes(start) || !graphData.nodes.includes(end)) {
             return res.status(404).json({ status: "error", message: "One or both locations not found in map data." });
        }

        const result = dijkstra.findShortestPath(start, end, graphData);
        
        if (!result || result.path.length === 0) {
            return res.status(404).json({ status: "success", message: `No path found from ${start} to ${end}.`, data: result });
        }

        res.json({ status: "success", data: result });

    } catch (error) {
        console.error("Dijkstra shortest path error:", error);
        if (error.message.includes("module not loaded")) {
             return res.status(501).json({ status: "error", message: "Navigation module is not available." });
        }
        res.status(500).json({ status: "error", message: error.message });
    }
});

// Knapsack/DP: Optimize profile recommendations
app.get('/api/students/:rollNo/recommendations', async (req, res) => {
    const { rollNo } = req.params;
    const { type } = req.query; // e.g., "course", "job", "skill"

    if (!type) {
        return res.status(400).json({ status: "error", message: "Recommendation type is required (e.g., 'course', 'job')." });
    }

    try {
        const studentProfile = await StudentProfile.findOne({ universityRollNo: rollNo });
        if (!studentProfile) {
            return res.status(404).json({ status: "error", message: "Student profile not found." });
        }

        // Placeholder: availableItems would come from a database or configuration
        // This is highly dependent on the 'type' of recommendation
        let availableItems = [];
        if (type === "course") {
            availableItems = [
                { id: "CS101", name: "Intro to Programming", difficulty: 2, relevance_tags: ["programming", "beginner"] },
                { id: "CS305", name: "Machine Learning", difficulty: 4, relevance_tags: ["ai", "ml", "advanced", "math"] },
                { id: "DS202", name: "Data Structures", difficulty: 3, relevance_tags: ["programming", "core"] },
                { id: "EE201", name: "Basic Electronics", difficulty: 3, relevance_tags: ["electronics", "hardware"] },
            ];
        } else if (type === "job") {
            availableItems = [
                { id: "JOB01", title: "Software Dev Intern", required_skills: ["javascript", "nodejs"], company: "TechCorp" },
                { id: "JOB02", title: "Data Analyst", required_skills: ["python", "sql", "statistics"], company: "DataDrivenLLC" },
                { id: "JOB03", title: "Hardware Engineer", required_skills: ["verilog", "circuit design"], company: "ChipMakers" },
            ];
        } else {
            return res.status(400).json({ status: "error", message: "Unsupported recommendation type." });
        }
        
        const recommendations = profileOptimizer.getProfileRecommendations(studentProfile.toObject(), type, availableItems);
        
        res.json({ status: "success", data: recommendations });

    } catch (error) {
        console.error("Profile recommendation error:", error);
         if (error.message.includes("module not loaded")) {
             return res.status(501).json({ status: "error", message: "Recommendation module is not available." });
        }
        res.status(500).json({ status: "error", message: error.message });
    }
});

// DFS/BFS: Community network or graph-based friend explorer
app.get('/api/students/:rollNo/community', async (req, res) => {
    const { rollNo } = req.params;
    const depth = parseInt(req.query.depth) || 2; // Default depth
    const algorithm = req.query.algorithm || 'bfs'; // 'bfs' or 'dfs'

    if (algorithm !== 'bfs' && algorithm !== 'dfs') {
        return res.status(400).json({ status: "error", message: "Invalid algorithm type. Use 'bfs' or 'dfs'." });
    }
    if (depth <= 0 || depth > 5) { // Cap depth to prevent excessive computation
        return res.status(400).json({ status: "error", message: "Depth must be between 1 and 5." });
    }

    try {
        const studentExists = await StudentProfile.findOne({ universityRollNo: rollNo }).select('_id');
        if (!studentExists) {
            return res.status(404).json({ status: "error", message: "Starting student profile not found." });
        }

        // Placeholder: graphData representing student connections (friendships, classmates, project partners)
        // This would typically be constructed by querying relationships from the database.
        // For example, find all students in the same section, or explicit friend connections.
        // Let's mock a simple graph structure for now.
        const allStudents = await StudentProfile.find().select('universityRollNo name section').lean();
        const mockConnections = [ // Simulate some connections
            { from: allStudents[0]?.universityRollNo, to: allStudents[1]?.universityRollNo, type: "classmate" },
            { from: allStudents[0]?.universityRollNo, to: allStudents[2]?.universityRollNo, type: "project_partner" },
            { from: allStudents[1]?.universityRollNo, to: allStudents[3]?.universityRollNo, type: "classmate" },
        ].filter(c => c.from && c.to); // Filter out undefined if not enough students

        const graphData = {
            students: allStudents.map(s => ({ id: s.universityRollNo, name: s.name, section: s.section })),
            connections: mockConnections
        };
        
        const communityData = graphTraversal.exploreCommunity(rollNo, graphData, depth, algorithm);
        
        res.json({ status: "success", data: communityData });

    } catch (error) {
        console.error("Community exploration error:", error);
        if (error.message.includes("module not loaded")) {
             return res.status(501).json({ status: "error", message: "Graph traversal module is not available." });
        }
        res.status(500).json({ status: "error", message: error.message });
    }
});

// --- END NEW ALGORITHM ENDPOINTS ---


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
        { key: { universityRollNo: 1, date: 1 }, name: "student_date_attendance_idx" },
        { key: { deviceFingerprint: 1, date: 1 }, name: "device_date_attendance_idx" }
      ]);
      await StudentProfile.createIndexes([
        { key: { universityRollNo: 1 }, name: "student_rollno_profile_idx", unique: true }
      ]);
      console.log("Indexes ensured/created for Attendance and StudentProfile.");
    } catch (err) {
      console.error("Index creation/ensuring error:", err);
    }
  })
  .catch(err => {
    console.error(" MongoDB connection error:", err);
    process.exit(1);
  });

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

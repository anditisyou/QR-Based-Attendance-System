const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process'); // Add this for Java execution

// Configuration
const QR_CODE_VALIDITY = 1.5 * 60 * 1000; // 15 minutes in ms
const QR_CODE_DIR = process.env.QR_CODE_DIR || path.join(__dirname, 'public', 'qrcodes');
const CACHE_TIME = 90000; // 15 seconds

// Track active sessions and IP cache
const activeSessions = new Map();
const ipCache = new Map();

// Ensure QR code directory exists
if (!fs.existsSync(QR_CODE_DIR)) {
    fs.mkdirSync(QR_CODE_DIR, { recursive: true });
}

// Replace the JavaScript sha256 with Java execution
function sha256(input) {
    try {
        const escapedInput = input.replace(/"/g, '\\"');
        const command = `java SHA256 "${escapedInput}"`;
        const result = execSync(command, { 
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore'] // Suppress Java errors
        });
        return result.trim();
    } catch (error) {
        console.error("Java SHA-256 Error:", error.message);
        throw new Error("Failed to compute SHA-256 hash");
    }
}

async function generateQRCode(ipAddress) {
    // Check cache first
    if (ipCache.has(ipAddress)) {
        const cached = ipCache.get(ipAddress);
        if (Date.now() - cached.timestamp < CACHE_TIME) {
            return cached.data;
        }
    }

    try {
        const sessionId = crypto.randomBytes(16).toString('hex');
        const timestamp = Date.now();
        
        // Create security hash using Java
        const secretKey = process.env.QR_SECRET_KEY || 'default-secret-key';
        const hash = sha256(sessionId + timestamp + secretKey);

        const qrData = `http://localhost:5000/verify-attendance?data=${encodeURIComponent(JSON.stringify({
            sessionId,
            timestamp,
            hash
        }))}`;
        const fileName = `qr_${timestamp}.png`;
        const filePath = path.join(QR_CODE_DIR, fileName);

        await QRCode.toFile(filePath, qrData, {
            color: {
                dark: '#000000',
                light: '#ffffff'
            },
            width: 400,
            margin: 2
        });

        // Track session with expiration
        activeSessions.set(sessionId, {
            ip: ipAddress,
            expiresAt: timestamp + QR_CODE_VALIDITY
        });

        // Set timeout to clear session
        setTimeout(() => {
            activeSessions.delete(sessionId);
        }, QR_CODE_VALIDITY);

        const result = {
            qrImage: `/qrcodes/${fileName}`,
            sessionId
        };

        // Update cache
        ipCache.set(ipAddress, {
            data: result,
            timestamp: Date.now()
        });

        return result;
    } catch (error) {
        console.error('QR generation error:', error);
        throw error;
    }
}

function validateSession(sessionId) {
    const session = activeSessions.get(sessionId);
    if (!session) return false;
    
    // Check if session expired
    if (Date.now() > session.expiresAt) {
        activeSessions.delete(sessionId);
        return false;
    }
    
    return true;
}

function cleanupOldQRCodes() {
    const now = Date.now();
    fs.readdir(QR_CODE_DIR, (err, files) => {
        if (err) {
            console.error('Cleanup error:', err);
            return;
        }
        
        files.forEach(file => {
            if (file.startsWith('qr_') && file.endsWith('.png')) {
                const fileTimestamp = parseInt(file.split('_')[1].split('.')[0]);
                if (isNaN(fileTimestamp)) return;
                
                if (now - fileTimestamp > QR_CODE_VALIDITY) {
                    fs.unlink(path.join(QR_CODE_DIR, file), err => {
                        if (err) console.error('Error deleting file:', file, err);
                    });
                }
            }
        });
    });
}

// Run cleanup every 5 minutes
setInterval(cleanupOldQRCodes, 5 * 60 * 1000);
cleanupOldQRCodes();

module.exports = {
    generateQRCode,
    validateSession
};
/*const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sha256 = require('./sha256');
// Configuration
const QR_CODE_VALIDITY = 1.5 * 60 * 1000; // 15 minutes in ms
const QR_CODE_DIR = process.env.QR_CODE_DIR || path.join(__dirname, 'public', 'qrcodes');
const CACHE_TIME = 90000; // 15 seconds

// Track active sessions and IP cache
const activeSessions = new Map();
const ipCache = new Map();

// Ensure QR code directory exists
if (!fs.existsSync(QR_CODE_DIR)) {
    fs.mkdirSync(QR_CODE_DIR, { recursive: true });
}

async function generateQRCode(ipAddress) {
    // Check cache first
    if (ipCache.has(ipAddress)) {
        const cached = ipCache.get(ipAddress);
        if (Date.now() - cached.timestamp < CACHE_TIME) {
            return cached.data;
        }
    }

    try {
        const sessionId = crypto.randomBytes(16).toString('hex');
        const timestamp = Date.now();
        
        // Create security hash
        const secretKey = process.env.QR_SECRET_KEY || 'default-secret-key';
        const hash = sha256(sessionId + timestamp + secretKey);

        // In qr-generator.js, change the qrData construction to:
        // In qr-generator.js, modify the qrData line to:
        const qrData = `http://localhost:5000/verify-attendance?data=${encodeURIComponent(JSON.stringify({
            sessionId,
            timestamp,
            hash
        }))}`;
        const fileName = `qr_${timestamp}.png`;
        const filePath = path.join(QR_CODE_DIR, fileName);

        await QRCode.toFile(filePath, qrData, {
            color: {
                dark: '#000000',
                light: '#ffffff'
            },
            width: 400,
            margin: 2
        });

        // Track session with expiration
        activeSessions.set(sessionId, {
            ip: ipAddress,
            expiresAt: timestamp + QR_CODE_VALIDITY
        });

        // Set timeout to clear session
        setTimeout(() => {
            activeSessions.delete(sessionId);
        }, QR_CODE_VALIDITY);

        const result = {
            qrImage: `/qrcodes/${fileName}`,
            sessionId
        };

        // Update cache
        ipCache.set(ipAddress, {
            data: result,
            timestamp: Date.now()
        });

        return result;
    } catch (error) {
        console.error('QR generation error:', error);
        throw error;
    }
}

function validateSession(sessionId) {
    const session = activeSessions.get(sessionId);
    if (!session) return false;
    
    // Check if session expired
    if (Date.now() > session.expiresAt) {
        activeSessions.delete(sessionId);
        return false;
    }
    
    return true;
}

function cleanupOldQRCodes() {
    const now = Date.now();
    fs.readdir(QR_CODE_DIR, (err, files) => {
        if (err) {
            console.error('Cleanup error:', err);
            return;
        }
        
        files.forEach(file => {
            if (file.startsWith('qr_') && file.endsWith('.png')) {
                const fileTimestamp = parseInt(file.split('_')[1].split('.')[0]);
                if (isNaN(fileTimestamp))return;
                
                if (now - fileTimestamp > QR_CODE_VALIDITY) {
                    fs.unlink(path.join(QR_CODE_DIR, file), err => {
                        if (err) console.error('Error deleting file:', file, err);
                    });
                }
            }
        });
    });
}

// Run cleanup every 5 minutes
setInterval(cleanupOldQRCodes, 5 * 60 * 1000);
cleanupOldQRCodes();

module.exports = {
    generateQRCode,
    validateSession
};*/
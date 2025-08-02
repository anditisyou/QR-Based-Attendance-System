const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Configuration
const QR_CODE_VALIDITY = 1.5 * 60 * 1000; // 1.5 minutes in ms
const QR_CODE_DIR = process.env.QR_CODE_DIR || path.join(__dirname, 'public', 'qrcodes');
const CACHE_TIME = 90000; // 90 seconds (1.5 minutes), corrected comment

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
        
        const secretKey = process.env.QR_SECRET_KEY || 'default-secret-key';
        const hash = crypto.createHash('sha256')
                         .update(sessionId + timestamp + secretKey)
                         .digest('hex');

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

        activeSessions.set(sessionId, {
            ip: ipAddress,
            expiresAt: timestamp + QR_CODE_VALIDITY
        });

        setTimeout(() => {
            activeSessions.delete(sessionId);
        }, QR_CODE_VALIDITY);

        const result = {
            qrImage: `/qrcodes/${fileName}`,
            sessionId,
            expiresIn: QR_CODE_VALIDITY // <<< MODIFIED: Added expiresIn
        };

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

setInterval(cleanupOldQRCodes, 5 * 60 * 1000);
cleanupOldQRCodes();

module.exports = {
    generateQRCode,
    validateSession
};
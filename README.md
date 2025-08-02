# 📸 QR-Based Attendance System 🧑‍🎓

A secure, geolocation-verified student attendance management system using **QR codes**, **device fingerprinting**, and **real-time GPS validation**. Built using **Node.js**, **MongoDB**, and **Tailwind CSS** for modern web-based attendance tracking.

---

## 🚀 Features

- ✅ Secure QR Code Generation (valid for 15 minutes)
- 📍 Geofencing: Marks attendance only if within 100 meters of class
- 🧠 Device Fingerprinting to prevent multiple entries
- 📅 Attendance Dashboard with analytics
- 🛡 Rate-limited QR generation to prevent abuse
- 🎨 Clean, responsive UI with Tailwind CSS
- 🧾 MongoDB-based persistent storage

---

## 📂 Project Structure

```

📦 qr-attendance-system/
├── backend/
│   ├── server.js
│   ├── qr-generator.js
│   ├── models/
│   └── routes/
├── frontend/
│   ├── index.html
│   ├── qr-scanner.html
│   ├── script.js
│   └── styles/
└── README.md

````

---

## 🛠 Tech Stack

| Layer       | Tech/Library                        |
|-------------|-------------------------------------|
| Frontend    | HTML, TailwindCSS, JavaScript       |
| Backend     | Node.js, Express.js                 |
| Database    | MongoDB (via Mongoose)              |
| Security    | Helmet.js, SHA-256 (crypto), CORS   |
| Features    | QR Code (`qrcode`), Geo Validation  |
| Extras      | Device FingerprintJS, Haversine Algo|

---

## 🔐 Core Algorithms

- **Haversine Formula** – Validates student is within campus radius
- **SHA-256 Hashing** – Signs QR code session payload
- **Canvas Fingerprinting** – Tracks device identity
- **Rate Limiting** – Protects QR endpoint (max 5/minute/IP)
- **Session Validation** – Ensures QR isn't reused or expired

---

## 📸 How It Works

1. Admin generates a time-limited QR code via `/qr-scanner.html`
2. Student scans the QR → redirected to `/index.html?sessionId=...`
3. System captures:
   - GPS coordinates
   - Device fingerprint
   - Student details
4. Backend checks:
   - If student is near classroom
   - If attendance already marked today
   - If QR session is valid
5. Attendance is stored and can be viewed from the dashboard.

---

## 📦 Setup Instructions

### 🖥 Prerequisites

- Node.js & npm
- MongoDB (local or Atlas)
- `.env` file with the following:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/attendance
QR_SECRET_KEY=supersecret123
````

---

### 📁 Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/qr-based-attendance-system.git
cd qr-based-attendance-system

# Install dependencies
npm install

# Start the backend server
node server.js
```

---

### 🌐 Frontend Access

Open these in your browser:

* `http://localhost:5000/qr-scanner.html` → Generate QR code
* `http://localhost:5000/index.html?sessionId=...` → Mark attendance

---

## 📊 Dashboard (Optional)

You can extend the system with a dashboard page (`dashboard.html`) to visualize:

* Attendance %
* Dates present
* Department vs student average

---

## 🧪 Testing Tips

* Spoof location with browser dev tools
* Use different devices or browsers to check fingerprint tracking
* Try scanning expired QR to validate session handling

---

## 🤝 Contributing

Pull requests are welcome! For major changes, open an issue first to discuss what you’d like to improve.

---

## 📃 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👩‍💻 Author

**Vaishnavi Khandelwal**
B.Tech CSE Student | QR Attendance System Developer

---

## 📌 Academic Relevance

This project is part of a DAA-based PBL focusing on:

* Secure Hashing (SHA-256)
* Haversine Formula (spatial validation)
* Algorithm optimization (QR reuse prevention, rate limiting)

---

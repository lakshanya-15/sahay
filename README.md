# 🩺 SAHAY - Intelligent Rural Healthcare & Triage Assistant

**SAHAY** (Smart Access to Healthcare & Assistance for You) is a high-impact, AI-driven teleconsultation and triage management system. It is designed to modernize rural healthcare clinics by automating patient intake, prioritizing critical cases through intelligent triage, and enabling seamless teleconsultations between patients and specialists.

---

## 🚀 Vision
In rural areas, overcrowded clinics often lack a structured prioritization system. SAHAY bridges this gap by ensuring **"The right patient gets treated at the right time."**

---

## ✨ Key Features

### 🧠 Intelligent AI Triage
- **Conversational Intake**: Replaces static forms with a state-driven clinical chat engine.
- **Adaptive Questioning**: Deep-dives into symptoms (e.g., Cardiac vs. Respiratory) using medical branching logic.
- **Confidence-Score Triage**: Calculates risk scores and provides clinical reasoning for every patient.
- **Multimodal (Voice) Support**: Speech-to-text integration for hands-free symptom reporting.

### 🏥 Specialist Discovery & Booking
- **Doctor Portal**: Geolocation-aware specialist discovery and hospital identification.
- **Instant Booking**: One-click request system to join a specific doctor's priority queue.

### 📹 Seamless Teleconsultation
- **Integrated Video Call Interface**: Native-looking teleconsultation modal with audio/video controls.
- **Real-time Signaling**: Instant "Call Started" notifications via WebSockets.

### 🚨 Emergency SOS System
- **Neon Pulse SOS**: Dedicated emergency button on the dashboard for instant alerts to nearby hospitals.
- **Geolocation-Ready**: Broadcasts patient coordinates to emergency responders.

### 👩‍⚕️ Clinical Insights for Doctors
- **Automated Summaries**: Generates structured clinical profiles for every patient, highlighting "Warning Flags."
- **Priority Queue**: Dynamically re-orders patients based on clinical severity and wait time.

---

## 🛠️ Technical Stack

- **Frontend**: Vite + React, Lucide-React Icons, Glassmorphic CSS.
- **Backend**: Node.js, Express, Socket.io (Real-time), SQLite (Database).
- **Communication**: Web Speech API (Voice), WebSocket (Signaling).
- **Architecture**: Modular Service-Oriented (Triage, Questionnaire, Queueing).

---

## 📦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [npm](https://www.npmjs.com/)

### Installation & Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/lakshanya-15/sahay.git
   cd sahay
   ```

2. **Setup Backend**:
   ```bash
   cd backend
   npm install
   node src/index.js
   ```

3. **Setup Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

---

## 🏗️ Project Structure
```text
SAHAY/
├── backend/
│   ├── src/
│   │   ├── services/ (Triage & Questionnaire Logic)
│   │   ├── index.js (Express Server & Sockets)
│   ├── database.db (SQLite Storage)
│   └── prisma/ (Schema Definition)
└── frontend/
    ├── src/
    │   ├── App.jsx (Unified Business Logic)
    │   ├── index.css (Premium Design System)
```

---

## 🏆 Hackathon Notes
This MVP is **Hackathon-Ready** with:
- **Explainable AI**: Triage confidence scores and medical reasoning logs.
- **Aesthetic Excellence**: Premium glassmorphic UI designed for "Wow-factor."
- **Robust Failure Handling**: Centralized error middleware and socket persistence.

---

## 📞 Support & Community
**Developer**: Lakshanya (lakshanya15c@gmail.com)  
**License**: MIT License  
**GitHub**: [https://github.com/lakshanya-15/sahay](https://github.com/lakshanya-15/sahay)

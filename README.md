# 🎓 EduPulse - Interactive Learning Platform

**EduPulse** is a real-time, interactive virtual classroom platform built for the future of education. Combining video conferencing, live engagement tracking, and instant feedback mechanisms, EduPulse creates an immersive online learning experience.

[![Made with Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)](https://socket.io/)
[![LiveKit](https://img.shields.io/badge/LiveKit-3D3D3D?style=for-the-badge&logo=webrtc&logoColor=white)](https://livekit.io/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## ✨ Key Features

### 🎥 Live Video Conferencing
- **HD Video & Audio** powered by LiveKit.
- **Screen Sharing** for seamless presentations.
- **Active Speaker Detection** & dynamic grid layouts.

### 👥 Classroom Management
- **Teacher Dashboard**: Create/Delete classes, admit students, and monitor attendance.
- **Waiting Room**: Security feature requiring teacher approval for students to join.
- **Real-Time Attention Tracking**: Detects if students are attentive (tab focus) or distracted.

### 💬 Interactive Tools
- **In-Class Chat**: Ephemeral real-time chat (privacy-focused).
- **Hand Raise**: Students can digitally raise their hands for questions.
- **Micro-Quizzes**: Teachers can launch instant polls to gauge understanding.

### 🎨 Modern UI/UX
- **Glassmorphism Design**: sleek, translucent interfaces.
- **Responsive**: Fully functional on desktop and tablet.
- **Visual Feedback**: Skeleton loaders, toast notifications, and smooth transitions.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- **Node.js** (v18+)
- **npm** (v9+)
- **MongoDB** (Running locally on default port `27017` or a cloud URI)
- **Redis** (Optional but recommended for optimal state management)

### 📦 Installation

Clone the repository and install dependencies for **both** backend and frontend.

```bash
# Clone the repo
git clone https://github.com/yourusername/EduPulse.git
cd EduPulse

# 1. Setup Backend
cd backend
npm install

# 2. Setup Frontend
cd ../frontend
npm install
```

### 🔑 Environment Variables

You must configure the environment variables for the backend. Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=5001
CLIENT_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/attendance_monitoring_system

# Security
JWT_SECRET=your_super_secret_jwt_key_here

# LiveKit (Video Infrastructure)
# Sign up at livekit.io to get these keys
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# OAuth (Optional - for Google/GitHub Login)
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
GITHUB_CLIENT_ID=your_github_id
GITHUB_CLIENT_SECRET=your_github_secret
```

### 🏃‍♂️ Running the Application

You need to run the **Backend** and **Frontend** in separate terminal windows.

**Terminal 1: Backend**
```bash
cd backend
npm run dev
# Expected Output:
# Server running on port 5001
# MongoDB Connected
```

**Terminal 2: Frontend**
```bash
cd frontend
npm run dev
# Opens at http://localhost:5173
```

---

## 🛠️ Troubleshooting

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| **Registration Failed (Network Error)** | Backend is not running. | Open a terminal, `cd backend`, and run `npm run dev`. |
| **500 Internal Server Error** | Missing `.env` variables or DB issue. | Check `backend/.env` exists and has `JWT_SECRET`. Ensure MongoDB is running. |
| **Video/Audio Permissions Denied** | Browser blocking Localhost. | Ensure you grant camera/mic permissions. For network access, HTTPS is required. |
| **"teacherId is not allowed"** | Payload mismatch. | This is fixed in the latest version. Update your code via `git pull`. |

---

## 🗂️ Project Structure

```bash
EduPulse/
├── backend/
│   ├── models/           # Mongoose Schemas (User, Class, Quiz)
│   ├── controllers/      # Business Logic
│   ├── routes/           # API Endpoints
│   ├── middleware/       # Auth & Validation (Joi)
│   └── server.js         # Entry Point
│
frontend/
├── src/
│   ├── components/       # Reusable UI (Button, Card, Modal)
│   ├── pages/            # Views (Dashboard, LiveClass, Login)
│   ├── context/          # State (SocketProvider, Auth)
│   └── styles/           # Tailwind & Global CSS
```

---

## 🤝 Contributing

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/NewFeature`).
3. Commit your changes.
4. Push to the branch.
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ for modern education.**
*Author: Atul Premnarayan*


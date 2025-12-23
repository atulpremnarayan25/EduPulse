import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentPanel from './pages/StudentPanel';
import LiveClass from './pages/LiveClass';
import StudentLiveClass from './pages/StudentLiveClass';
import Register from './pages/Register';
import PrivateRoute from './components/PrivateRoute';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col font-sans">
          <Navbar />
          <BottomNav />
          <main className="flex-grow container mx-auto px-4 py-6 md:p-8 w-full max-w-7xl pb-24 md:pb-8">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route
                path="/teacher"
                element={
                  <PrivateRoute role="teacher">
                    <TeacherDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/teacher/class/:classId"
                element={
                  <PrivateRoute role="teacher">
                    <LiveClass />
                  </PrivateRoute>
                }
              />

              <Route
                path="/student"
                element={
                  <PrivateRoute role="student">
                    <StudentPanel />
                  </PrivateRoute>
                }
              />
              <Route
                path="/student/class/:classId"
                element={
                  <PrivateRoute role="student">
                    <StudentLiveClass />
                  </PrivateRoute>
                }
              />

              <Route path="/" element={<Home />} />
            </Routes>
          </main>
          <Analytics />
          <SpeedInsights />
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;

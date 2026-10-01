import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from './pages/Home.jsx';
import Discover from './pages/Discover.jsx';
import EventDetail from './pages/EventDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import UserProfile from "./pages/UserProfile.jsx";
import HostVerification from './pages/HostVerification.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateEvent from './pages/CreateEvent.jsx';
import EditEvent from './pages/EditEvent.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import RateEvent from './pages/RateEvent.jsx';
import RateParticipant from './pages/RateParticipant.jsx';
import RateParticipantsList from './pages/RateParticipantsList.jsx';
import BoostDetails from './pages/BoostDetails.jsx';
import AdminPanel from './pages/AdminPanel.jsx';

import './styles/main.css';
import './styles/mobile.css';

function App() {
  return (
    <div className="App">

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/host-verification" element={<HostVerification />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute requiredRole="Host">
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute requiredRole="Participant">
            <UserProfile />
          </ProtectedRoute>
        } />
        <Route path="/create-event" element={
          <ProtectedRoute requiredRole="Host">
            <CreateEvent />
          </ProtectedRoute>
        } />
        <Route path="/events/:id/edit" element={
          <ProtectedRoute requiredRole={["Host", "Admin"]}>
            <EditEvent />
          </ProtectedRoute>
        } />
        <Route path="/rate-event/:eventId/:registrationId" element={
          <ProtectedRoute requiredRole="Participant">
            <RateEvent />
          </ProtectedRoute>
        } />
        <Route path="/rate-participant/:eventId" element={
          <ProtectedRoute requiredRole="Host">
            <RateParticipantsList />
          </ProtectedRoute>
        } />
        <Route path="/rate-participant/:eventId/:registrationId" element={
          <ProtectedRoute requiredRole="Host">
            <RateParticipant />
          </ProtectedRoute>
        } />
        <Route
          path="/boost-details"
          element={
            <ProtectedRoute requiredRole="Host">
              <BoostDetails />
            </ProtectedRoute>
          }
        />
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="Admin">
            <AdminPanel />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}

export default App;

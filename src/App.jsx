import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { CustomAlertProvider } from './context/CustomAlertContext';

function App() {
  return (
    <CustomAlertProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
            <Navbar />
          </ProtectedRoute>
        } />
        <Route path="/calendar" element={
          <ProtectedRoute>
            <Calendar />
            <Navbar />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
            <Navbar />
          </ProtectedRoute>
        } />
      </Routes>
    </CustomAlertProvider>
  );
}

export default App;

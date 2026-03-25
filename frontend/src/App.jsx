import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LenisProvider } from './components/LenisProvider';
import Layout from './components/Layout';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import SchedulePage from './pages/Schedule';
import VirtualLabs from './pages/VirtualLabs';
import Syllabus from './pages/Syllabus';
import Admin from './pages/Admin';
import ResourceHub from './pages/ResourceHub';
import Login from './pages/Login';
import { Shield } from 'lucide-react';

// Protected route component for admin pages
const ProtectedRoute = ({ children, requiredRole = 'assistant' }) => {
  const { loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-lab-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!hasRole(requiredRole)) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
          <Shield className="inline-block mr-2" size={24} />
          Access Restricted
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          You need to be logged in as {requiredRole} or higher to access this page.
        </p>
        <a href="/login" className="text-lab-primary dark:text-lab-accent hover:underline mt-4 inline-block">
          Go to Login
        </a>
      </div>
    );
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Login page (outside layout) */}
      <Route path="/login" element={<Login />} />

      {/* Main layout routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="labs" element={<VirtualLabs />} />
        <Route path="resources" element={<ResourceHub />} />
        <Route path="syllabus" element={<Syllabus />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute requiredRole="hod">
              <Admin />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <LenisProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </LenisProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;

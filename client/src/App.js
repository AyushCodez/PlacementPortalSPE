// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CampaignsPage from './pages/CampaignsPage';
import CampaignDetails from './pages/CampaignDetails';
import TestManagement from './pages/TestManagement';
import AttendanceScanner from './pages/AttendanceScanner';
import UserManagementPage from './pages/UserManagementPage';
import CampaignStudentPage from './pages/CampaignStudentPage';
import SettingsPage from './pages/SettingsPage';
import TestSelectionPage from './pages/TestSelectionPage';
import StudentsPage from './pages/StudentsPage';
import LoginPage from './pages/LoginPage';
import VolunteersPage from './pages/VolunteersPage';

const PrivateRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div>Loading...</div>;

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (roles && !roles.includes(user.role)) {
        // Redirect volunteers to their allowed page if they try to access admin pages
        if (user.role === 'volunteer') {
            return <Navigate to="/mark-attendance" replace />;
        }
        return <Navigate to="/" replace />;
    }

    return children;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected Routes */}
                    <Route element={<Layout />}>
                        <Route path="/" element={
                            <PrivateRoute roles={['admin', 'master']}>
                                <Dashboard />
                            </PrivateRoute>
                        } />
                        <Route path="/campaigns" element={
                            <PrivateRoute roles={['admin', 'master']}>
                                <CampaignsPage />
                            </PrivateRoute>
                        } />
                        <Route path="/campaign/:campaignId" element={
                            <PrivateRoute roles={['admin', 'master']}>
                                <CampaignDetails />
                            </PrivateRoute>
                        } />
                        <Route path="/test/:testId" element={
                            <PrivateRoute roles={['admin', 'master']}>
                                <TestManagement />
                            </PrivateRoute>
                        } />
                        <Route path="/mark-attendance" element={
                            <PrivateRoute roles={['admin', 'master', 'volunteer']}>
                                <TestSelectionPage />
                            </PrivateRoute>
                        } />
                        <Route path="/scan/:testId" element={
                            <PrivateRoute roles={['admin', 'master', 'volunteer']}>
                                <AttendanceScanner />
                            </PrivateRoute>
                        } />
                        <Route path="/students" element={
                            <PrivateRoute roles={['admin', 'master']}>
                                <StudentsPage />
                            </PrivateRoute>
                        } />
                        <Route path="/user-management" element={
                            <PrivateRoute roles={['admin', 'master']}>
                                <UserManagementPage />
                            </PrivateRoute>
                        } />
                        <Route path="/volunteers" element={
                            <PrivateRoute roles={['admin', 'master']}>
                                <VolunteersPage />
                            </PrivateRoute>
                        } />
                        <Route path="/campaign/:campaignId/students" element={
                            <PrivateRoute roles={['admin', 'master']}>
                                <CampaignStudentPage />
                            </PrivateRoute>
                        } />
                        <Route path="/settings" element={
                            <PrivateRoute roles={['admin', 'master']}>
                                <SettingsPage />
                            </PrivateRoute>
                        } />
                    </Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
// src/components/Sidebar.js
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    MdDashboard, MdCampaign, MdQrCodeScanner,
    MdPeople, MdSettings, MdLogout, MdClose, MdSchool, MdVolunteerActivism
} from 'react-icons/md'; // Material Design icons

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div>
                <div className="sidebar-header">
                    <div className="logo-icon">
                        <MdSchool />
                    </div>
                    <div>
                        <h2>Placements</h2>
                        <p>Management System</p>
                    </div>
                    {/* Close button for mobile */}
                    <button className="close-sidebar-btn" onClick={toggleSidebar}>
                        <MdClose />
                    </button>
                </div>
                <nav className="sidebar-nav">
                    <ul>
                        <li>
                            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => isOpen && toggleSidebar()}>
                                <MdDashboard /> Dashboard
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/campaigns" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => isOpen && toggleSidebar()}>
                                <MdCampaign /> Campaigns
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/mark-attendance" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => isOpen && toggleSidebar()}>
                                <MdQrCodeScanner /> Mark Attendance
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/students" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => isOpen && toggleSidebar()}>
                                <MdSchool /> Students
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/user-management" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => isOpen && toggleSidebar()}>
                                <MdPeople /> User Management
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/volunteers" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => isOpen && toggleSidebar()}>
                                <MdVolunteerActivism /> Volunteers
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => isOpen && toggleSidebar()}>
                                <MdSettings /> Settings
                            </NavLink>
                        </li>
                    </ul>
                </nav>
            </div>
            <div className="sidebar-footer">
                <button onClick={handleLogout}>
                    <MdLogout /> Sign Out
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
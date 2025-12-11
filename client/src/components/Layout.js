// src/components/Layout.js
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { MdMenu, MdLogout, MdSchool } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Outlet } from 'react-router-dom';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isVolunteer = user?.role === 'volunteer';

    return (
        <div className="app-layout">
            {!isVolunteer && (
                <>
                    <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
                    {isSidebarOpen && (
                        <div
                            className="sidebar-overlay"
                            onClick={() => setIsSidebarOpen(false)}
                        ></div>
                    )}
                </>
            )}

            <div className="main-content">
                {/* App Header */}
                <header className={`app-header ${isVolunteer ? 'volunteer-header' : ''}`}>
                    <div className="header-left">
                        {!isVolunteer && (
                            <button className="menu-btn" onClick={toggleSidebar}>
                                <MdMenu />
                            </button>
                        )}
                        <div className="brand-logo">
                            <div className="logo-icon">
                                <MdSchool />
                            </div>
                            <span className="brand-text">Placement Manager</span>
                        </div>
                    </div>

                    {isVolunteer && (
                        <button className="logout-btn" onClick={handleLogout}>
                            <MdLogout />
                            <span>Sign Out</span>
                        </button>
                    )}
                </header>

                {/* Content Outlet */}
                <div className="content-area">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default Layout;
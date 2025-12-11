// src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StatsCard from '../components/StatsCard';
import {
    MdCampaign, MdAssignment, MdPeople,
    MdToday, MdUpcoming, MdLogout
} from 'react-icons/md';

const API_URL = process.env.REACT_APP_API_URL;

const Dashboard = () => {
    const [stats, setStats] = useState({
        testsTodayCount: 0,
        testsUpcomingCount: 0,
        testsToday: [],
        testsUpcoming: [],
        campaignDetails: [],
    });
    const navigate = useNavigate();
    const { logout } = useAuth();

    const fetchDashboardStats = async () => {
        try {
            const response = await axios.get(`${API_URL}/dashboard`);
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
            setStats({
                testsTodayCount: 0,
                testsUpcomingCount: 0,
                testsToday: [],
                testsUpcoming: [],
                campaignDetails: []
            });
        }
    };

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div>
            {/* --- Header --- */}
            <div className="page-header">
                <div className="header-content">
                    <div>
                        <h1>Dashboard</h1>
                        <p>Welcome back! Here's an overview of your active placement tests.</p>
                    </div>
                </div>
                <button className="btn text-btn" onClick={handleLogout}>
                    <MdLogout /> Sign Out
                </button>
            </div>

            {/* --- Global Stats Cards --- */}
            <div className="stats-grid" style={{ marginBottom: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                <StatsCard
                    title="Tests Today"
                    value={stats.testsTodayCount}
                    description="Tests scheduled across all campaigns"
                    icon={<MdToday />}
                    iconColor="icon-attendance"
                    details={stats.testsToday}
                />
                <StatsCard
                    title="Upcoming Tests"
                    value={stats.testsUpcomingCount}
                    description="Future tests across all campaigns"
                    icon={<MdUpcoming />}
                    iconColor="icon-tests"
                    details={stats.testsUpcoming}
                />
            </div>

            {/* --- Quick Actions --- */}
            <h3 style={{ marginBottom: '16px' }}>Quick Actions</h3>
            <div className="action-grid">
                <div className="action-card" onClick={() => navigate('/campaigns')}>
                    <div className="icon-wrapper" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
                        <MdCampaign />
                    </div>
                    <h3>Manage Campaigns</h3>
                    <p>View, create, or manage campaigns</p>
                </div>
                <div className="action-card" onClick={() => navigate('/mark-attendance')}>
                    <div className="icon-wrapper" style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
                        <MdAssignment />
                    </div>
                    <h3>Mark Attendance</h3>
                    <p>Scan student IDs and mark attendance</p>
                </div>
                <div className="action-card" onClick={() => navigate('/students')}>
                    <div className="icon-wrapper" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
                        <MdPeople />
                    </div>
                    <h3>Manage Students</h3>
                    <p>Update the master student list</p>
                </div>
            </div>

            {/* --- Detailed Campaign Table --- */}
            <div className="card table-container">
                <div className="table-header">
                    <h3>Active Campaign Details</h3>
                </div>
                <div className="table-responsive">
                    {stats.campaignDetails.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>Campaign Name</th>
                                    <th>Total Tests</th>
                                    <th>Total Unique Students</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.campaignDetails.map(detail => (
                                    <tr key={detail.campaignId}>
                                        <td style={{ fontWeight: '500' }}>{detail.campaignName}</td>
                                        <td>{detail.testCount}</td>
                                        <td>{detail.studentCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="empty-state">No active campaigns found.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
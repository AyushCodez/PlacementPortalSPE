// src/pages/SettingsPage.js
import React, { useState } from 'react';
import axios from 'axios';
import { MdLock, MdSave } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const SettingsPage = () => {
    const { user } = useAuth();
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (passwords.newPassword !== passwords.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        if (passwords.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
            return;
        }

        setLoading(true);
        try {
            await axios.put(`${API_URL}/users/change-password`, {
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword
            });
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error("Error changing password:", error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update password.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="settings-page">
            <div className="page-header">
                <div className="header-content">
                    <div>
                        <h1>Settings</h1>
                        <p>Manage your account security.</p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ maxWidth: '600px', padding: '32px' }}>
                <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.25rem', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <MdLock style={{ color: '#4f46e5' }} /> Change Password
                    </h2>
                    <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '0.9rem' }}>
                        Update your password to keep your account secure.
                    </p>
                </div>

                {message.text && (
                    <div style={{
                        padding: '14px',
                        borderRadius: '8px',
                        marginBottom: '24px',
                        backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                        color: message.type === 'success' ? '#065f46' : '#991b1b',
                        border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.95rem'
                    }}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151', fontSize: '0.95rem' }}>Current Password</label>
                        <input
                            type="password"
                            name="currentPassword"
                            value={passwords.currentPassword}
                            onChange={handleChange}
                            required
                            className="venue-input"
                            style={{ width: '100%', padding: '10px 12px', fontSize: '1rem' }}
                            placeholder="Enter current password"
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151', fontSize: '0.95rem' }}>New Password</label>
                        <input
                            type="password"
                            name="newPassword"
                            value={passwords.newPassword}
                            onChange={handleChange}
                            required
                            className="venue-input"
                            style={{ width: '100%', padding: '10px 12px', fontSize: '1rem' }}
                            placeholder="Enter new password (min. 6 chars)"
                        />
                    </div>
                    <div style={{ marginBottom: '32px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151', fontSize: '0.95rem' }}>Confirm New Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={passwords.confirmPassword}
                            onChange={handleChange}
                            required
                            className="venue-input"
                            style={{ width: '100%', padding: '10px 12px', fontSize: '1rem' }}
                            placeholder="Re-enter new password"
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn primary-btn" disabled={loading} style={{ padding: '10px 24px', fontSize: '1rem' }}>
                            {loading ? 'Updating...' : <><MdSave /> Update Password</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsPage;
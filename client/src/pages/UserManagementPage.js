// src/pages/UserManagementPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import { MdDelete, MdPerson, MdAdminPanelSettings, MdVolunteerActivism, MdAdd, MdSecurity, MdLockReset, MdSearch, MdCheck, MdAssignmentInd, MdNoAccounts, MdAccountCircle } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

Modal.setAppElement('#root');

const UserManagementPage = () => {
    const [users, setUsers] = useState([]); // For Admins
    const [volunteers, setVolunteers] = useState([]); // For Volunteers (from Volunteer model)
    const [loading, setLoading] = useState(true);
    const { user: currentUser } = useAuth();

    // Modal States
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [isVolunteerModalOpen, setIsVolunteerModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    // Form States
    const [newAdmin, setNewAdmin] = useState({ username: '', email: '', password: '' });
    const [newVolunteerEmail, setNewVolunteerEmail] = useState('');
    const [selectedTestId, setSelectedTestId] = useState('');
    const [availableTests, setAvailableTests] = useState([]);
    const [availableVolunteers, setAvailableVolunteers] = useState([]);
    const [volunteerSearchQuery, setVolunteerSearchQuery] = useState('');

    const [resetPasswordData, setResetPasswordData] = useState({ userId: '', username: '', newPassword: '' });

    const fetchData = async () => {
        try {
            const [usersRes, volunteersRes] = await Promise.all([
                axios.get(`${API_URL}/users`),
                axios.get(`${API_URL}/volunteers`)
            ]);
            setUsers(usersRes.data);
            setVolunteers(volunteersRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTests = async () => {
        try {
            const campaignsRes = await axios.get(`${API_URL}/campaigns`);
            const campaigns = campaignsRes.data;
            const testsPromises = campaigns.map(c => axios.get(`${API_URL}/tests/campaign/${c._id}`));
            const testsResponses = await Promise.all(testsPromises);
            const allTests = testsResponses.flatMap(res => res.data);
            setAvailableTests(allTests);
            if (allTests.length > 0) setSelectedTestId(allTests[0]._id);
        } catch (error) {
            console.error("Error fetching tests:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Fetch volunteers when test is selected
    useEffect(() => {
        if (selectedTestId) {
            const test = availableTests.find(t => t._id === selectedTestId);
            if (test && test.campaign) {
                const fetchVolunteers = async () => {
                    try {
                        const response = await axios.get(`${API_URL}/volunteers/campaign/${test.campaign}`);
                        setAvailableVolunteers(response.data);
                    } catch (error) {
                        console.error("Error fetching volunteers:", error);
                        setAvailableVolunteers([]);
                    }
                };
                fetchVolunteers();
            }
        } else {
            setAvailableVolunteers([]);
        }
    }, [selectedTestId, availableTests]);

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/users/register`, { ...newAdmin, role: 'admin' });
            alert('Admin created successfully!');
            setNewAdmin({ username: '', email: '', password: '' });
            setIsAdminModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Error creating admin:", error);
            alert('Failed to create admin.');
        }
    };

    const handleAssignVolunteer = async (e) => {
        e.preventDefault();
        if (!newVolunteerEmail || !selectedTestId) {
            alert("Please select a test and a volunteer.");
            return;
        }

        try {
            const selectedVolunteer = availableVolunteers.find(v => v.email === newVolunteerEmail);
            if (!selectedVolunteer) return alert("Invalid volunteer selected.");

            await axios.post(`${API_URL}/volunteers/assign-test`, {
                volunteerId: selectedVolunteer._id,
                testId: selectedTestId
            });
            alert('Volunteer assigned to test successfully!');
            setNewVolunteerEmail('');
            setSelectedTestId('');
            setVolunteerSearchQuery('');
            setIsVolunteerModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Error assigning volunteer:", error);
            alert(error.response?.data?.message || 'Failed to assign volunteer.');
        }
    };

    const handleDeleteUser = async (userId, username, role) => {
        if (window.confirm(`Are you sure you want to delete ${role} "${username}"?`)) {
            try {
                await axios.delete(`${API_URL}/users/${userId}`);
                fetchData();
            } catch (error) {
                console.error("Error deleting user:", error);
                alert("Failed to delete user. You might not have permission.");
            }
        }
    };

    const handleUnassignTest = async (volunteerId, testId, testName) => {
        if (window.confirm(`Are you sure you want to unassign "${testName}" from this volunteer?`)) {
            try {
                await axios.post(`${API_URL}/volunteers/remove-test`, {
                    volunteerId,
                    testId
                });
                alert('Test unassigned successfully.');
                fetchData();
            } catch (error) {
                console.error("Error unassigning test:", error);
                alert("Failed to unassign test.");
            }
        }
    };

    const handleEnableCredentials = async (volunteerId) => {
        if (window.confirm(`Generate new credentials for this volunteer? They will receive an email.`)) {
            try {
                await axios.post(`${API_URL}/volunteers/enable-creds`, { volunteerId });
                alert('Credentials enabled and email sent.');
                fetchData();
            } catch (error) {
                console.error("Error enabling credentials:", error);
                alert("Failed to enable credentials.");
            }
        }
    };

    const openResetModal = (user) => {
        setResetPasswordData({ userId: user._id, username: user.username, newPassword: '' });
        setIsResetModalOpen(true);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (resetPasswordData.newPassword.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }
        try {
            await axios.put(`${API_URL}/users/${resetPasswordData.userId}/password`, {
                newPassword: resetPasswordData.newPassword
            });
            alert(`Password for ${resetPasswordData.username} reset successfully.`);
            setIsResetModalOpen(false);
            setResetPasswordData({ userId: '', username: '', newPassword: '' });
        } catch (error) {
            console.error("Error resetting password:", error);
            alert(error.response?.data?.message || 'Failed to reset password.');
        }
    };

    const openVolunteerModal = () => {
        setIsVolunteerModalOpen(true);
        setVolunteerSearchQuery('');
        fetchTests();
    };

    const admins = users.filter(u => u.role === 'admin' || u.role === 'master');

    // Filter volunteers: Show if they have assigned tests that are NOT completed
    const activeVolunteers = volunteers.filter(v => {
        if (!v.assignedTests || v.assignedTests.length === 0) return false;
        // Check if any assigned test is NOT completed
        return v.assignedTests.some(t => t.status !== 'completed');
    });

    const isMaster = currentUser?.role === 'master';
    const isAdmin = currentUser?.role === 'admin';

    return (
        <div>
            <div className="page-header">
                <div className="header-content">
                    <div>
                        <h1>User Management</h1>
                        <p>Manage system users, roles, and permissions.</p>
                    </div>
                </div>
            </div>

            {/* Admins Section */}
            <div className="card table-container" style={{ marginBottom: '32px' }}>
                <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MdSecurity /> Administrators
                    </h3>
                    {isMaster && (
                        <button className="btn primary-btn" onClick={() => setIsAdminModalOpen(true)}>
                            <MdAdd /> Add Admin
                        </button>
                    )}
                </div>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {admins.map(user => (
                                <tr key={user._id}>
                                    <td style={{ fontWeight: '500' }}>{user.username}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`status-badge ${user.role === 'master' ? 'success' : 'primary'}`}>
                                            {user.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        {isMaster && user.role !== 'master' && (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    className="btn icon-btn"
                                                    onClick={() => openResetModal(user)}
                                                    title="Reset Password"
                                                    style={{ color: '#4f46e5' }}
                                                >
                                                    <MdLockReset />
                                                </button>
                                                <button
                                                    className="btn icon-btn delete-btn"
                                                    onClick={() => handleDeleteUser(user._id, user.username, user.role)}
                                                    title="Delete Admin"
                                                >
                                                    <MdDelete />
                                                </button>
                                            </div>
                                        )}
                                        {user.role === 'master' && <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Master Account</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Volunteers Section */}
            <div className="card table-container">
                <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MdVolunteerActivism /> Volunteers (Active Tests)
                    </h3>
                    {(isMaster || isAdmin) && (
                        <button className="btn primary-btn" onClick={openVolunteerModal}>
                            <MdAssignmentInd /> Assign Volunteer to Test
                        </button>
                    )}
                </div>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Assigned Tests</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeVolunteers.map(vol => (
                                <tr key={vol._id}>
                                    <td style={{ fontWeight: '500' }}>{vol.name}</td>
                                    <td>{vol.email}</td>
                                    <td>
                                        {vol.assignedTests && vol.assignedTests.filter(t => t.status !== 'completed').length > 0
                                            ? (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    {vol.assignedTests.filter(t => t.status !== 'completed').map(t => (
                                                        <span key={t._id} className="status-badge pending" style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingRight: '4px' }}>
                                                            {t.name}
                                                            {(isMaster || isAdmin) && (
                                                                <button
                                                                    onClick={() => handleUnassignTest(vol._id, t._id, t.name)}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        cursor: 'pointer',
                                                                        color: '#ef4444',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        padding: '2px',
                                                                        marginLeft: '4px'
                                                                    }}
                                                                    title="Unassign Test"
                                                                >
                                                                    <MdDelete size={14} />
                                                                </button>
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                            )
                                            : <span style={{ color: '#9ca3af' }}>None</span>}
                                    </td>
                                    <td>
                                        {(isMaster || isAdmin) && (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {vol.user ? (
                                                    <>
                                                        <button
                                                            className="btn icon-btn"
                                                            onClick={() => openResetModal(vol.user)}
                                                            title="Reset Password"
                                                            style={{ color: '#4f46e5' }}
                                                        >
                                                            <MdLockReset />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        className="btn icon-btn"
                                                        onClick={() => handleEnableCredentials(vol._id)}
                                                        title="Enable Credentials"
                                                        style={{ color: '#059669' }}
                                                    >
                                                        <MdAccountCircle />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {activeVolunteers.length === 0 && (
                                <tr><td colSpan="4" className="empty-state">No volunteers found with active test assignments.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Admin Modal */}
            <Modal
                isOpen={isAdminModalOpen}
                onRequestClose={() => setIsAdminModalOpen(false)}
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <div className="modal-header">
                    <h2>Add New Admin</h2>
                    <button onClick={() => setIsAdminModalOpen(false)} className="close-modal-btn">&times;</button>
                </div>
                <form onSubmit={handleCreateAdmin}>
                    <div className="modal-body">
                        <div style={{ marginBottom: '16px' }}>
                            <label>Username</label>
                            <input type="text" required className="venue-input" style={{ width: '100%' }}
                                value={newAdmin.username} onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })} />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label>Email</label>
                            <input type="email" required className="venue-input" style={{ width: '100%' }}
                                value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label>Password</label>
                            <input type="password" required className="venue-input" style={{ width: '100%' }}
                                value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" onClick={() => setIsAdminModalOpen(false)} className="btn secondary-btn">Cancel</button>
                        <button type="submit" className="btn primary-btn">Create Admin</button>
                    </div>
                </form>
            </Modal>

            {/* Assign Volunteer Modal */}
            <Modal
                isOpen={isVolunteerModalOpen}
                onRequestClose={() => setIsVolunteerModalOpen(false)}
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <div className="modal-header">
                    <h2>Assign Volunteer to Test</h2>
                    <button onClick={() => setIsVolunteerModalOpen(false)} className="close-modal-btn">&times;</button>
                </div>
                <form onSubmit={handleAssignVolunteer}>
                    <div className="modal-body">
                        <p style={{ marginBottom: '16px' }}>Select a test and then choose a volunteer from that campaign.</p>

                        <div style={{ marginBottom: '16px' }}>
                            <label>Select Test</label>
                            <select
                                className="venue-input"
                                style={{ width: '100%' }}
                                value={selectedTestId}
                                onChange={(e) => {
                                    setSelectedTestId(e.target.value);
                                    // Reset volunteer selection when test changes
                                    setNewVolunteerEmail('');
                                }}
                                required
                            >
                                <option value="">-- Select Test --</option>
                                {availableTests.map(test => (
                                    <option key={test._id} value={test._id}>
                                        {test.name} ({new Date(test.date).toLocaleDateString()})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedTestId && (
                            <div style={{ marginBottom: '16px' }}>
                                <label>Select Volunteer</label>
                                {availableVolunteers.length > 0 ? (
                                    <>
                                        <div style={{ position: 'relative', marginBottom: '8px' }}>
                                            <MdSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                            <input
                                                type="text"
                                                placeholder="Search volunteer by name or email..."
                                                value={volunteerSearchQuery}
                                                onChange={(e) => setVolunteerSearchQuery(e.target.value)}
                                                className="venue-input"
                                                style={{ width: '100%', paddingLeft: '32px' }}
                                            />
                                        </div>
                                        <select
                                            className="venue-input"
                                            style={{ width: '100%' }}
                                            value={newVolunteerEmail}
                                            onChange={(e) => setNewVolunteerEmail(e.target.value)}
                                            required
                                            size={5} // Show multiple options to make it look like a list
                                        >
                                            <option value="" disabled>-- Select Volunteer --</option>
                                            {availableVolunteers
                                                .filter(v =>
                                                    v.name.toLowerCase().includes(volunteerSearchQuery.toLowerCase()) ||
                                                    v.email.toLowerCase().includes(volunteerSearchQuery.toLowerCase())
                                                )
                                                .map(v => (
                                                    <option key={v._id} value={v.email}>
                                                        {v.name} ({v.email})
                                                    </option>
                                                ))}
                                        </select>
                                        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                                            Showing volunteers for this campaign.
                                        </p>
                                    </>
                                ) : (
                                    <p style={{ color: 'red', fontSize: '0.9rem' }}>
                                        No volunteers found for this test's campaign. Please add volunteers in the Volunteers page first.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" onClick={() => setIsVolunteerModalOpen(false)} className="btn secondary-btn">Cancel</button>
                        <button type="submit" className="btn primary-btn" disabled={!selectedTestId || !newVolunteerEmail}>Assign</button>
                    </div>
                </form>
            </Modal>

            {/* Reset Password Modal */}
            <Modal
                isOpen={isResetModalOpen}
                onRequestClose={() => setIsResetModalOpen(false)}
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <div className="modal-header">
                    <h2>Reset Password</h2>
                    <button onClick={() => setIsResetModalOpen(false)} className="close-modal-btn">&times;</button>
                </div>
                <form onSubmit={handleResetPassword}>
                    <div className="modal-body">
                        <p>Resetting password for <strong>{resetPasswordData.username}</strong>.</p>
                        <div style={{ marginBottom: '16px' }}>
                            <label>New Password</label>
                            <input type="password" required className="venue-input" style={{ width: '100%' }}
                                value={resetPasswordData.newPassword} onChange={e => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                                placeholder="Enter new password"
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" onClick={() => setIsResetModalOpen(false)} className="btn secondary-btn">Cancel</button>
                        <button type="submit" className="btn primary-btn">Reset Password</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default UserManagementPage;
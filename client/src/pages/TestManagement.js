// src/pages/TestManagement.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import Modal from 'react-modal'; // Import Modal
import { FaArrowLeft, FaQrcode, FaUpload, FaChair, FaTrash, FaEnvelope, FaSort, FaSortUp, FaSortDown, FaCheck, FaTimes, FaDownload, FaUserMinus, FaCheckCircle, FaUserPlus } from 'react-icons/fa'; // Import Icons

const API_URL = process.env.REACT_APP_API_URL;
const SOCKET_URL = API_URL.replace('/api', '');

// Bind modal to your appElement (https://reactcommunity.org/react-modal/accessibility/)
Modal.setAppElement('#root');

const TestManagement = () => {
    const { testId } = useParams();
    const [test, setTest] = useState(null);
    const [file, setFile] = useState(null);
    const [venues, setVenues] = useState([{ name: '', capacity: '' }]);
    const [sortConfig, setSortConfig] = useState({ key: 'rollNumber', direction: 'ascending' });
    const [emailMessage, setEmailMessage] = useState('');
    const [sendingEmails, setSendingEmails] = useState(false);
    const navigate = useNavigate();

    // Modal States
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isSeatingModalOpen, setIsSeatingModalOpen] = useState(false);
    const [isVolunteerModalOpen, setIsVolunteerModalOpen] = useState(false);
    const [volunteerEmail, setVolunteerEmail] = useState('');
    const [availableVolunteers, setAvailableVolunteers] = useState([]);
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [addStudentRollNumber, setAddStudentRollNumber] = useState('');

    const fetchTestDetails = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/tests/${testId}`);
            setTest(response.data);
        } catch (error) {
            console.error("Error fetching test details:", error);
        }
    }, [testId]);

    useEffect(() => {
        fetchTestDetails();
    }, [fetchTestDetails]);

    useEffect(() => {
        console.log(`[Socket] Connecting to ${SOCKET_URL}`);
        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            console.log('[Socket] Connected with ID:', socket.id);
        });

        socket.on('attendance_updated', (data) => {
            console.log('[Socket] Received attendance_updated event:', data);
            if (data && data.testId === testId) {
                console.log('[Socket] Event matches current testId. Refreshing data...');
                fetchTestDetails();
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        return () => {
            console.log('[Socket] Disconnecting...');
            socket.disconnect();
        };
    }, [testId, fetchTestDetails]);

    // Fetch volunteers when modal opens
    useEffect(() => {
        if (isVolunteerModalOpen && test && test.campaign) {
            const fetchVolunteers = async () => {
                try {
                    // Fetch volunteers for the specific campaign of this test
                    const response = await axios.get(`${API_URL}/volunteers/campaign/${test.campaign}`);
                    setAvailableVolunteers(response.data);
                } catch (error) {
                    console.error("Error fetching volunteers:", error);
                }
            };
            fetchVolunteers();
        }
    }, [isVolunteerModalOpen, test]);

    const handleClearApplicants = async () => {
        const isConfirmed = window.confirm(
            'Are you sure you want to delete all applicants for this test? This cannot be undone.'
        );

        if (isConfirmed) {
            try {
                await axios.delete(`${API_URL}/tests/${testId}/applicants`);
                alert('Applicants cleared successfully!');
                fetchTestDetails();
            } catch (error) {
                alert('Failed to clear applicants. Please try again.');
                console.error("Error clearing applicants:", error);
            }
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) {
            alert("Please select a file");
            return;
        }
        const formData = new FormData();
        formData.append('applicantsFile', file);
        try {
            const response = await axios.post(`${API_URL}/tests/${testId}/applicants`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            let alertMsg = response.data.message;
            if (response.data.ineligibleCount > 0) {
                alertMsg += `\n\n⚠️ ${response.data.ineligibleCount} students were skipped because they are not eligible.`;
            }

            alert(alertMsg);
            fetchTestDetails();
            setIsUploadModalOpen(false); // Close modal on success
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Error uploading applicants. Check the file format or console for details.';
            alert(errorMsg);
            console.error("Error uploading applicants:", error);
        }
    };

    const handleSendAdmitCards = async () => {
        if (!window.confirm('Are you sure you want to send admit cards to ALL applicants? This action cannot be undone.')) {
            return;
        }

        setSendingEmails(true);
        try {
            const response = await axios.post(`${API_URL}/tests/${testId}/send-admit-cards`, {
                customMessage: emailMessage
            });
            alert(response.data.message);
            setEmailMessage('');
            setIsEmailModalOpen(false); // Close modal on success
        } catch (error) {
            console.error("Error sending emails:", error);
            alert('Failed to send emails. Check console for details.');
        } finally {
            setSendingEmails(false);
        }
    };
    const handleVenueChange = (index, field, value) => {
        const newVenues = [...venues];
        newVenues[index][field] = value;
        setVenues(newVenues);
    };
    const handleAddVenue = () => {
        setVenues([...venues, { name: '', capacity: '' }]);
    };
    const handleRemoveVenue = (index) => {
        const newVenues = venues.filter((_, i) => i !== index);
        setVenues(newVenues);
    };
    const handleGenerateSeating = async () => {
        const validVenues = venues.filter(v => v.name && v.capacity > 0);

        if (validVenues.length === 0) {
            alert("Please add at least one valid venue with a name and positive capacity.");
            return;
        }

        const totalCapacity = validVenues.reduce((sum, venue) => sum + venue.capacity, 0);
        const totalApplicants = test.applicants.length;

        if (totalCapacity < totalApplicants) {
            alert(`⚠️ Warning: Total venue capacity (${totalCapacity}) is less than the number of applicants (${totalApplicants}). Please add more venues or increase capacity.`);
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/tests/${testId}/seating`, { venues: validVenues });
            setTest(response.data);
            alert('Venue assignment generated successfully!');
            setIsSeatingModalOpen(false); // Close modal on success
        } catch (error) {
            alert('Error generating venue assignment. Please try again.');
            console.error("Error generating seating:", error);
        }
    };

    const handleAddVolunteer = async () => {
        if (!volunteerEmail) return alert("Please select a volunteer.");

        try {
            // Find the selected volunteer object to get their ID
            const selectedVolunteer = availableVolunteers.find(v => v.email === volunteerEmail);
            if (!selectedVolunteer) return alert("Invalid volunteer selected.");

            await axios.post(`${API_URL}/volunteers/assign-test`, {
                volunteerId: selectedVolunteer._id,
                testId
            });
            alert('Volunteer assigned and email sent successfully!');
            setVolunteerEmail('');
            setIsVolunteerModalOpen(false);
            fetchTestDetails(); // Refresh to show new volunteer
        } catch (error) {
            console.error("Error adding volunteer:", error);
            alert('Failed to add volunteer. ' + (error.response?.data?.message || ''));
        }
    };

    const handleUnassignVolunteer = async (volunteerId, volunteerName) => {
        if (window.confirm(`Are you sure you want to unassign ${volunteerName} from this test?`)) {
            try {
                await axios.post(`${API_URL}/volunteers/remove-test`, {
                    volunteerId,
                    testId
                });
                alert('Volunteer unassigned successfully.');
                fetchTestDetails();
            } catch (error) {
                console.error("Error unassigning volunteer:", error);
                alert('Failed to unassign volunteer.');
            }
        }
    };

    const handleToggleComplete = async () => {
        const action = test.status === 'completed' ? 'mark as incomplete' : 'mark as completed';
        if (window.confirm(`Are you sure you want to ${action}?`)) {
            try {
                const response = await axios.put(`${API_URL}/tests/${testId}/toggle-complete`);
                alert(response.data.message);
                fetchTestDetails();
            } catch (error) {
                console.error("Error toggling test completion:", error);
                alert('Failed to update test status.');
            }
        }
    };

    const handleAddStudent = async () => {
        if (!addStudentRollNumber) {
            alert('Please enter a roll number.');
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/tests/${testId}/add-student`, {
                rollNumber: addStudentRollNumber
            });
            alert(response.data.message);
            setAddStudentRollNumber('');
            setIsAddStudentModalOpen(false);
            fetchTestDetails();
        } catch (error) {
            console.error("Error adding student:", error);
            const msg = error.response?.data?.message || 'Failed to add student.';
            alert(msg);
        }
    };

    const sortedApplicants = useMemo(() => {
        if (!test || !test.applicants) return [];

        let sortableItems = [...test.applicants];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let valA, valB;
                if (sortConfig.key === 'rollNumber' || sortConfig.key === 'name') {
                    valA = a.student ? (a.student[sortConfig.key] || '') : '';
                    valB = b.student ? (b.student[sortConfig.key] || '') : '';
                } else {
                    valA = a[sortConfig.key] === true ? 1 : (a[sortConfig.key] === false ? 0 : (a[sortConfig.key] || ''));
                    valB = b[sortConfig.key] === true ? 1 : (b[sortConfig.key] === false ? 0 : (b[sortConfig.key] || ''));
                }

                if (typeof valA === 'number' && typeof valB === 'number') {
                    if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                } else {
                    valA = String(valA).toLowerCase();
                    valB = String(valB).toLowerCase();
                    if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [test, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return <FaSort className="sort-icon placeholder" />;
        return sortConfig.direction === 'ascending' ? <FaSortUp className="sort-icon" /> : <FaSortDown className="sort-icon" />;
    };

    const stats = useMemo(() => {
        if (!test || !test.applicants) return null;
        const total = test.applicants.length;
        const present = test.applicants.filter(a => a.attended).length;
        const absent = total - present;

        const venueStats = {};
        test.applicants.forEach(app => {
            const v = app.venue || 'Unassigned';
            if (!venueStats[v]) venueStats[v] = { count: 0, present: 0, absent: 0 };
            venueStats[v].count++;
            if (app.attended) venueStats[v].present++;
            else venueStats[v].absent++;
        });

        return { total, present, absent, venueStats };
    }, [test]);

    const downloadTemplate = () => {
        const csvContent = "Roll Number\n101\n102";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'applicants_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };


    if (!test) return <div className="loading-spinner">Loading...</div>;

    return (
        <div className="test-management-container">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate(`/campaign/${test.campaign}`)}>
                    <FaArrowLeft /> Back
                </button>
                <div className="header-content">
                    <h2>{test.name} {test.status === 'completed' && <span className="status-badge success" style={{ fontSize: '0.8rem', marginLeft: '8px' }}>Completed</span>}</h2>
                    <span className="badge">{test.applicants.length} Applicants</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className={`btn ${test.status === 'completed' ? 'secondary-btn' : 'primary-btn'}`}
                        onClick={handleToggleComplete}
                        style={{ backgroundColor: test.status === 'completed' ? '#f3f4f6' : '', color: test.status === 'completed' ? '#374151' : '' }}
                    >
                        {test.status === 'completed' ? <><FaTimes /> Mark Incomplete</> : <><FaCheckCircle /> Mark Completed</>}
                    </button>
                    <button className="btn primary-btn" onClick={() => navigate(`/scan/${testId}`)}>
                        <FaQrcode /> Attendance Scanner
                    </button>
                </div>
            </div>

            {/* Action Cards Grid */}
            <div className="action-grid">
                <div className={`action-card ${test.status === 'completed' ? 'disabled-card' : ''}`} onClick={() => test.status !== 'completed' && setIsUploadModalOpen(true)}>
                    <div className="icon-wrapper upload-icon">
                        <FaUpload />
                    </div>
                    <h3>Upload Applicants</h3>
                    <p>Import student data from Excel</p>
                </div>

                <div className={`action-card ${test.status === 'completed' ? 'disabled-card' : ''}`} onClick={() => test.status !== 'completed' && setIsEmailModalOpen(true)}>
                    <div className="icon-wrapper email-icon">
                        <FaEnvelope />
                    </div>
                    <h3>Send Admit Cards</h3>
                    <p>Email QR codes to students</p>
                </div>

                <div className={`action-card ${test.status === 'completed' ? 'disabled-card' : ''}`} onClick={() => test.status !== 'completed' && setIsSeatingModalOpen(true)}>
                    <div className="icon-wrapper seating-icon">
                        <FaChair />
                    </div>
                    <h3>Seating Plan</h3>
                    <p>Generate venue assignments</p>
                </div>

                <div className={`action-card ${test.status === 'completed' ? 'disabled-card' : ''}`} onClick={() => test.status !== 'completed' && setIsVolunteerModalOpen(true)}>
                    <div className="icon-wrapper" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                        <FaEnvelope />
                    </div>
                    <h3>Assign Volunteer</h3>
                    <p>Invite volunteer via email</p>
                </div>

                {/* Only show Clear Applicants if there are any */}
                {test.applicants.length > 0 && (
                    <div className={`action-card danger-card ${test.status === 'completed' ? 'disabled-card' : ''}`} onClick={() => test.status !== 'completed' && handleClearApplicants()}>
                        <div className="icon-wrapper delete-icon">
                            <FaTrash />
                        </div>
                        <h3>Clear Applicants</h3>
                        <p>Remove all student data</p>
                    </div>
                )}
            </div>

            {/* Statistics Section */}
            {stats && (
                <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.25rem', color: '#111827' }}>Test Statistics</h3>

                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #dbeafe' }}>
                            <h4 style={{ margin: '0 0 8px', color: '#1e40af', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Applicants</h4>
                            <span style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1e3a8a', lineHeight: 1 }}>{stats.total}</span>
                        </div>
                        <div style={{ backgroundColor: '#ecfdf5', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #d1fae5' }}>
                            <h4 style={{ margin: '0 0 8px', color: '#065f46', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Present</h4>
                            <span style={{ fontSize: '2.5rem', fontWeight: '700', color: '#059669', lineHeight: 1 }}>{stats.present}</span>
                        </div>
                        <div style={{ backgroundColor: '#fef2f2', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #fee2e2' }}>
                            <h4 style={{ margin: '0 0 8px', color: '#991b1b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Absent</h4>
                            <span style={{ fontSize: '2.5rem', fontWeight: '700', color: '#dc2626', lineHeight: 1 }}>{stats.absent}</span>
                        </div>
                    </div>

                    {/* Venue Breakdown Table */}
                    <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: '#374151' }}>Venue Breakdown</h4>
                    <div className="table-responsive" style={{ boxShadow: 'none', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#4b5563' }}>Venue</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#4b5563' }}>Total Assigned</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#4b5563' }}>Present</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#4b5563' }}>Absent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(stats.venueStats).map(([venue, data]) => (
                                    <tr key={venue} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: '500' }}>{venue}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{data.count}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{data.present}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#dc2626', fontWeight: '600' }}>{data.absent}</td>
                                    </tr>
                                ))}
                                {Object.keys(stats.venueStats).length === 0 && (
                                    <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No venue data available. Generate seating arrangement to see venue stats.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Assigned Volunteers Section */}
            <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.25rem', color: '#111827' }}>Assigned Volunteers</h3>
                {test.volunteers && test.volunteers.length > 0 ? (
                    <div className="table-responsive" style={{ boxShadow: 'none', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#4b5563' }}>Name</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#4b5563' }}>Email</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#4b5563' }}>Roll Number</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', color: '#4b5563' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {test.volunteers.map(vol => (
                                    <tr key={vol._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: '500' }}>{vol.name}</td>
                                        <td style={{ padding: '12px 16px' }}>{vol.email}</td>
                                        <td style={{ padding: '12px 16px' }}>{vol.rollNumber}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <button
                                                className="btn icon-btn delete-btn"
                                                onClick={() => handleUnassignVolunteer(vol._id, vol.name)}
                                                title="Unassign Volunteer"
                                                disabled={test.status === 'completed'}
                                                style={{ opacity: test.status === 'completed' ? 0.5 : 1, cursor: test.status === 'completed' ? 'not-allowed' : 'pointer' }}
                                            >
                                                <FaUserMinus />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No volunteers assigned to this test yet.</p>
                )}
            </div>

            {/* Applicants Table */}
            <div className="table-container card">
                <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Applicant List</h3>
                    <button
                        className="btn primary-btn"
                        onClick={() => setIsAddStudentModalOpen(true)}
                        disabled={test.status === 'completed'}
                        style={{
                            padding: '6px 12px',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: test.status === 'completed' ? 0.6 : 1,
                            cursor: test.status === 'completed' ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <FaUserPlus /> Add Student
                    </button>
                </div>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th onClick={() => requestSort('rollNumber')}>
                                    Roll Number {getSortIndicator('rollNumber')}
                                </th>
                                <th onClick={() => requestSort('name')}>
                                    Name {getSortIndicator('name')}
                                </th>
                                <th onClick={() => requestSort('attended')}>
                                    Attended {getSortIndicator('attended')}
                                </th>
                                <th onClick={() => requestSort('venue')}>
                                    Venue {getSortIndicator('venue')}
                                </th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedApplicants.map(app => (
                                <tr key={app._id}>
                                    <td>{app.student?.rollNumber}</td>
                                    <td>{app.student?.name}</td>
                                    <td>
                                        <span className={`status-badge ${app.attended ? 'success' : 'pending'}`}>
                                            {app.attended ? <><FaCheck /> Yes</> : <><FaTimes /> No</>}
                                        </span>
                                    </td>
                                    <td>
                                        <select
                                            value={app.venue || 'Unassigned'}
                                            onChange={(e) => {
                                                const newVenue = e.target.value;
                                                axios.put(`${API_URL}/tests/${testId}/applicants/${app.student?._id}/venue`, { venue: newVenue })
                                                    .then(() => {
                                                        // Optimistic update or refetch
                                                        fetchTestDetails();
                                                    })
                                                    .catch(err => {
                                                        console.error(err);
                                                        alert('Failed to update venue.');
                                                    });
                                            }}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                border: '1px solid #d1d5db',
                                                backgroundColor: app.venue && app.venue !== 'Unassigned' ? '#f0fdf4' : '#fff',
                                                color: app.venue && app.venue !== 'Unassigned' ? '#166534' : '#374151',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            <option value="Unassigned">Unassigned</option>
                                            {Object.keys(stats?.venueStats || {}).filter(v => v !== 'Unassigned').map(v => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <button
                                            className="btn icon-btn delete-btn"
                                            onClick={() => {
                                                if (window.confirm(`Are you sure you want to remove ${app.student?.name} from this test?`)) {
                                                    axios.delete(`${API_URL}/tests/${testId}/applicants/${app.student?._id}`)
                                                        .then(() => {
                                                            alert('Applicant removed successfully.');
                                                            fetchTestDetails();
                                                        })
                                                        .catch(err => {
                                                            console.error(err);
                                                            alert('Failed to remove applicant.');
                                                        });
                                                }
                                            }}
                                            title="Remove from Test"
                                            disabled={test.status === 'completed'}
                                            style={{
                                                color: '#ef4444',
                                                background: 'none',
                                                border: 'none',
                                                cursor: test.status === 'completed' ? 'not-allowed' : 'pointer',
                                                fontSize: '1.2rem',
                                                opacity: test.status === 'completed' ? 0.5 : 1
                                            }}
                                        >
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {sortedApplicants.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="empty-state">No applicants found. Upload an Excel file to get started.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* Upload Modal */}
            <Modal
                isOpen={isUploadModalOpen}
                onRequestClose={() => setIsUploadModalOpen(false)}
                contentLabel="Upload Applicants"
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <div className="modal-header">
                    <h2>Upload Applicants</h2>
                    <button onClick={() => setIsUploadModalOpen(false)} className="close-modal-btn">&times;</button>
                </div>
                <div className="modal-body">
                    <p>Select an Excel file (.xlsx, .xls) containing the student list.</p>

                    <button
                        onClick={downloadTemplate}
                        className="btn text-btn"
                        style={{ marginBottom: '16px', padding: '0', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <FaDownload /> Download Template (CSV)
                    </button>

                    <div className="file-upload-wrapper">
                        <input type="file" onChange={handleFileChange} accept=".xlsx, .xls, .csv" id="file-upload" />
                        <label htmlFor="file-upload" className="file-upload-label">
                            {file ? file.name : "Choose File"}
                        </label>
                    </div>
                </div>
                <div className="modal-footer">
                    <button onClick={() => setIsUploadModalOpen(false)} className="btn secondary-btn">Cancel</button>
                    <button onClick={handleUpload} className="btn primary-btn">Upload</button>
                </div>
            </Modal>

            {/* Email Modal */}
            <Modal
                isOpen={isEmailModalOpen}
                onRequestClose={() => setIsEmailModalOpen(false)}
                contentLabel="Send Admit Cards"
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <div className="modal-header">
                    <h2>Send Admit Cards</h2>
                    <button onClick={() => setIsEmailModalOpen(false)} className="close-modal-btn">&times;</button>
                </div>
                <div className="modal-body">
                    <p>Send an email with a unique QR code to all registered applicants.</p>
                    <label>Custom Message (Optional):</label>
                    <textarea
                        placeholder="Add a note to the email..."
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        className="modal-textarea"
                    />
                </div>
                <div className="modal-footer">
                    <button onClick={() => setIsEmailModalOpen(false)} className="btn secondary-btn">Cancel</button>
                    <button
                        onClick={handleSendAdmitCards}
                        disabled={sendingEmails}
                        className="btn primary-btn"
                    >
                        {sendingEmails ? 'Sending...' : 'Send Emails'}
                    </button>
                </div>
            </Modal>

            {/* Seating Modal */}
            <Modal
                isOpen={isSeatingModalOpen}
                onRequestClose={() => setIsSeatingModalOpen(false)}
                contentLabel="Generate Seating"
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <div className="modal-header">
                    <h2>Seating Arrangement</h2>
                    <button onClick={() => setIsSeatingModalOpen(false)} className="close-modal-btn">&times;</button>
                </div>
                <div className="modal-body">
                    <p>Define venues and their capacities to automatically assign seats.</p>
                    {venues.map((venue, index) => (
                        <div key={index} className="venue-row">
                            <input
                                type="text"
                                placeholder="Venue Name"
                                value={venue.name}
                                onChange={(e) => handleVenueChange(index, 'name', e.target.value)}
                                className="venue-input"
                            />
                            <input
                                type="number"
                                placeholder="Capacity"
                                value={venue.capacity}
                                onChange={(e) => handleVenueChange(index, 'capacity', parseInt(e.target.value, 10))}
                                className="venue-input capacity-input"
                            />
                            {venues.length > 1 && (
                                <button onClick={() => handleRemoveVenue(index)} className="btn icon-btn delete-btn">
                                    <FaTrash />
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={handleAddVenue} className="btn text-btn">+ Add Another Venue</button>
                </div>
                <div className="modal-footer">
                    <button onClick={() => setIsSeatingModalOpen(false)} className="btn secondary-btn">Cancel</button>
                    <button onClick={handleGenerateSeating} className="btn primary-btn">Generate</button>
                </div>
            </Modal>

            {/* Volunteer Modal */}
            <Modal
                isOpen={isVolunteerModalOpen}
                onRequestClose={() => setIsVolunteerModalOpen(false)}
                contentLabel="Assign Volunteer"
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <div className="modal-header">
                    <h2>Assign Volunteer</h2>
                    <button onClick={() => setIsVolunteerModalOpen(false)} className="close-modal-btn">&times;</button>
                </div>
                <div className="modal-body">
                    <p>Select a volunteer to assign to this test.</p>
                    {availableVolunteers.length > 0 ? (
                        <select
                            value={volunteerEmail}
                            onChange={(e) => setVolunteerEmail(e.target.value)}
                            className="venue-input"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        >
                            <option value="">-- Select Volunteer --</option>
                            {availableVolunteers.map(v => (
                                <option key={v._id} value={v.email}>
                                    {v.name} ({v.email})
                                </option>
                            ))}
                        </select>
                    ) : (
                        <p style={{ color: 'red' }}>No volunteers found. Please add volunteers in the User Management or Volunteers page first.</p>
                    )}
                </div>
                <div className="modal-footer">
                    <button onClick={() => setIsVolunteerModalOpen(false)} className="btn secondary-btn">Cancel</button>
                    <button onClick={handleAddVolunteer} className="btn primary-btn">Assign</button>
                </div>
            </Modal>

            {/* Add Student Modal */}
            <Modal
                isOpen={isAddStudentModalOpen}
                onRequestClose={() => setIsAddStudentModalOpen(false)}
                contentLabel="Add Student"
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <div className="modal-header">
                    <h2>Add Student</h2>
                    <button onClick={() => setIsAddStudentModalOpen(false)} className="close-modal-btn">&times;</button>
                </div>
                <div className="modal-body">
                    <p>Enter the Roll Number of the student to add.</p>
                    <input
                        type="text"
                        placeholder="Roll Number (e.g., 12345)"
                        value={addStudentRollNumber}
                        onChange={(e) => setAddStudentRollNumber(e.target.value)}
                        className="venue-input"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                </div>
                <div className="modal-footer">
                    <button onClick={() => setIsAddStudentModalOpen(false)} className="btn secondary-btn">Cancel</button>
                    <button onClick={handleAddStudent} className="btn primary-btn">Add Student</button>
                </div>
            </Modal>

        </div>
    );
};

export default TestManagement;
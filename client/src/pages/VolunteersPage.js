// src/pages/VolunteersPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MdVolunteerActivism, MdExpandMore, MdExpandLess, MdAdd, MdSearch, MdDelete } from 'react-icons/md';
import Modal from 'react-modal';

const API_URL = process.env.REACT_APP_API_URL;

Modal.setAppElement('#root');

const VolunteersPage = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState('');
    const [volunteers, setVolunteers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedVolunteerId, setExpandedVolunteerId] = useState(null);

    // Add Volunteer Modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    useEffect(() => {
        if (selectedCampaignId) {
            fetchVolunteers(selectedCampaignId);
        } else {
            setVolunteers([]);
        }
    }, [selectedCampaignId]);

    const fetchCampaigns = async () => {
        try {
            const response = await axios.get(`${API_URL}/campaigns`);
            setCampaigns(response.data);
            if (response.data.length > 0) {
                setSelectedCampaignId(response.data[0]._id);
            }
        } catch (error) {
            console.error("Error fetching campaigns:", error);
        }
    };

    const fetchVolunteers = async (campaignId) => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/volunteers/campaign/${campaignId}`);
            setVolunteers(response.data);
        } catch (error) {
            console.error("Error fetching volunteers:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Search Logic ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length > 2) {
                try {
                    const response = await axios.get(`${API_URL}/students/search?query=${searchQuery}`);
                    setSearchResults(response.data);
                } catch (error) {
                    console.error("Error searching students:", error);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleAddVolunteer = async (student) => {
        if (!student.email) {
            alert("This student does not have an email address and cannot be added as a volunteer.");
            return;
        }
        try {
            await axios.post(`${API_URL}/volunteers`, {
                campaignId: selectedCampaignId,
                studentId: student._id
            });
            alert(`Added ${student.name} as volunteer.`);
            fetchVolunteers(selectedCampaignId);
            setIsAddModalOpen(false);
            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            console.error("Error adding volunteer:", error);
            alert(error.response?.data?.message || "Failed to add volunteer.");
        }
    };

    const handleRemoveVolunteer = async (volunteerId) => {
        if (!window.confirm("Are you sure you want to remove this volunteer from the campaign?")) return;
        try {
            await axios.delete(`${API_URL}/volunteers/${volunteerId}`);
            fetchVolunteers(selectedCampaignId);
        } catch (error) {
            console.error("Error removing volunteer:", error);
            alert("Failed to remove volunteer.");
        }
    };

    const handleRemoveTestFromVolunteer = async (volunteerId, testId, testName) => {
        if (window.confirm(`Are you sure you want to remove the test "${testName}" from this volunteer?`)) {
            try {
                await axios.post(`${API_URL}/volunteers/remove-test`, {
                    volunteerId,
                    testId
                });
                alert('Test removed from volunteer successfully.');
                fetchVolunteers(selectedCampaignId);
            } catch (error) {
                console.error("Error removing test from volunteer:", error);
                alert(error.response?.data?.message || 'Failed to remove test from volunteer.');
            }
        }
    };

    const toggleExpand = (id) => {
        setExpandedVolunteerId(expandedVolunteerId === id ? null : id);
    };

    return (
        <div>
            <div className="page-header">
                <div className="header-content">
                    <div>
                        <h1>Volunteers</h1>
                        <p>Manage volunteers for your campaigns.</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <select
                        value={selectedCampaignId}
                        onChange={(e) => setSelectedCampaignId(e.target.value)}
                        className="venue-input"
                        style={{ minWidth: '200px' }}
                    >
                        {campaigns.map(c => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                    </select>
                    <button className="btn primary-btn" onClick={() => setIsAddModalOpen(true)} disabled={!selectedCampaignId}>
                        <MdAdd /> Add Volunteer
                    </button>
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div style={{ padding: '24px', textAlign: 'center' }}>Loading volunteers...</div>
                ) : (
                    <div className="table-responsive">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                    <th style={{ padding: '16px', textAlign: 'left' }}>Name</th>
                                    <th style={{ padding: '16px', textAlign: 'left' }}>Email</th>
                                    <th style={{ padding: '16px', textAlign: 'left' }}>Roll Number</th>
                                    <th style={{ padding: '16px', textAlign: 'center' }}>Assigned Tests</th>
                                    <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {volunteers.map(volunteer => (
                                    <React.Fragment key={volunteer._id}>
                                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                            <td style={{ padding: '16px', fontWeight: '500' }}>{volunteer.name}</td>
                                            <td style={{ padding: '16px' }}>{volunteer.email}</td>
                                            <td style={{ padding: '16px' }}>{volunteer.rollNumber}</td>
                                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                                <span className="badge" style={{ fontSize: '0.9rem' }}>
                                                    {volunteer.assignedTests ? volunteer.assignedTests.length : 0}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right' }}>
                                                <button
                                                    className="btn icon-btn delete-btn"
                                                    onClick={() => handleRemoveVolunteer(volunteer._id)}
                                                    title="Remove Volunteer"
                                                    style={{ marginRight: '8px' }}
                                                >
                                                    <MdDelete />
                                                </button>
                                                <button
                                                    className="btn secondary-btn"
                                                    onClick={() => toggleExpand(volunteer._id)}
                                                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                                >
                                                    {expandedVolunteerId === volunteer._id ? <MdExpandLess /> : <MdExpandMore />} Details
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedVolunteerId === volunteer._id && (
                                            <tr style={{ backgroundColor: '#f9fafb' }}>
                                                <td colSpan="5" style={{ padding: '24px' }}>
                                                    <h4 style={{ margin: '0 0 16px 0', color: '#4b5563' }}>Assigned Tests</h4>
                                                    {volunteer.assignedTests && volunteer.assignedTests.length > 0 ? (
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                                                            {volunteer.assignedTests.map(test => (
                                                                <div key={test._id} style={{
                                                                    backgroundColor: 'white',
                                                                    padding: '12px',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid #e5e7eb',
                                                                    position: 'relative'
                                                                }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                                        <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{test.name}</div>
                                                                        <button
                                                                            onClick={() => handleRemoveTestFromVolunteer(volunteer._id, test._id, test.name)}
                                                                            style={{
                                                                                background: 'none',
                                                                                border: 'none',
                                                                                cursor: 'pointer',
                                                                                color: '#ef4444',
                                                                                padding: '0',
                                                                                marginLeft: '8px'
                                                                            }}
                                                                            title="Remove Test Assignment"
                                                                        >
                                                                            <MdDelete />
                                                                        </button>
                                                                    </div>
                                                                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                                        {new Date(test.date).toLocaleDateString()}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No tests assigned.</p>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                {volunteers.length === 0 && (
                                    <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No volunteers found for this campaign.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Volunteer Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onRequestClose={() => setIsAddModalOpen(false)}
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <div className="modal-header">
                    <h2>Add Volunteer to Campaign</h2>
                    <button onClick={() => setIsAddModalOpen(false)} className="close-modal-btn">&times;</button>
                </div>
                <div className="modal-body">
                    <div className="search-bar" style={{ marginBottom: '16px' }}>
                        <MdSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or roll number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {searchResults.length > 0 && (
                        <ul className="search-results" style={{ listStyle: 'none', padding: 0, border: '1px solid #e5e7eb', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                            {searchResults.map(student => (
                                <li key={student._id} style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: '500' }}>{student.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{student.email} | {student.rollNumber}</div>
                                    </div>
                                    <button className="btn primary-btn" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleAddVolunteer(student)}>
                                        Add
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default VolunteersPage;

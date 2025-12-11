// src/pages/CampaignDetails.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MdCalendarToday, MdDelete, MdArrowBack, MdPeople } from 'react-icons/md';

const API_URL = process.env.REACT_APP_API_URL;

const CampaignDetails = () => {
    const { campaignId } = useParams();
    const [campaignName, setCampaignName] = useState('');
    const [tests, setTests] = useState([]);
    const [testName, setTestName] = useState('');
    const [testDate, setTestDate] = useState('');
    const navigate = useNavigate();

    const fetchCampaignAndTests = useCallback(async () => {
        try {
            const campaignRes = await axios.get(`${API_URL}/campaigns/${campaignId}`);
            setCampaignName(campaignRes.data.name);

            const testsRes = await axios.get(`${API_URL}/tests/campaign/${campaignId}`);
            setTests(testsRes.data);
        } catch (error) {
            console.error("Error fetching campaign details or tests:", error);
            setCampaignName('Unknown Campaign');
        }
    }, [campaignId]);

    useEffect(() => {
        fetchCampaignAndTests();
    }, [fetchCampaignAndTests]);

    const handleCreateTest = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/tests`, {
                name: testName,
                date: testDate,
                campaign: campaignId,
                cycleName: 'Cycle 1'
            });
            setTestName('');
            setTestDate('');
            fetchCampaignAndTests();
        } catch (error) {
            console.error("Error creating test:", error);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const handleDeleteTest = async (testId, testName) => {
        if (window.confirm(`Are you sure you want to delete "${testName}"? This cannot be undone.`)) {
            try {
                await axios.delete(`${API_URL}/tests/${testId}`);
                fetchCampaignAndTests();
            } catch (error) {
                console.error("Error deleting test:", error);
            }
        }
    };

    return (
        <div>
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate('/campaigns')}>
                    <MdArrowBack /> Back to Campaigns
                </button>
                <div className="header-content">
                    <div>
                        <h1>{campaignName}</h1>
                        <p>Manage scheduled tests for this campaign</p>
                    </div>
                </div>
                <button
                    className="btn primary-btn"
                    onClick={() => navigate(`/students?campaignId=${campaignId}`)}
                >
                    <MdPeople /> Manage Students
                </button>
            </div>

            <div className="card" style={{ maxWidth: '800px', marginBottom: '40px', padding: '32px' }}>
                <h3 style={{ marginBottom: '20px' }}>Create New Test</h3>
                <form onSubmit={handleCreateTest} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flexGrow: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Test Name</label>
                        <input
                            type="text"
                            placeholder="e.g., Aptitude Round 1"
                            value={testName}
                            onChange={e => setTestName(e.target.value)}
                            required
                            className="venue-input"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div style={{ minWidth: '150px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>Date</label>
                        <input
                            type="date"
                            value={testDate}
                            onChange={e => setTestDate(e.target.value)}
                            required
                            className="venue-input"
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>
                    <button type="submit" className="btn primary-btn" style={{ marginBottom: '1px' }}>Create Test</button>
                </form>
            </div>

            <h3 style={{ marginBottom: '24px' }}>Scheduled Tests</h3>

            <div className="action-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {tests.length === 0 ? (
                    <div className="empty-state" style={{ gridColumn: '1 / -1' }}>No tests scheduled for this campaign yet.</div>
                ) : (
                    tests.map(test => (
                        <div key={test._id} className="action-card" style={{ alignItems: 'flex-start', textAlign: 'left' }}>
                            <h3 style={{ marginTop: 0 }}>{test.name}</h3>
                            <p style={{ marginBottom: '16px', flexGrow: 1 }}>Ready to configure.</p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '0.9rem', marginBottom: '20px' }}>
                                <MdCalendarToday />
                                <span>{formatDate(test.date)}</span>
                                <span className={`status-badge ${test.status === 'completed' ? 'success' : (test.status === 'active' ? 'warning' : 'primary')}`} style={{ marginLeft: 'auto' }}>
                                    {test.status ? test.status.toUpperCase() : 'UPCOMING'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: 'auto' }}>
                                <button
                                    className="btn secondary-btn"
                                    style={{ flexGrow: 1 }}
                                    onClick={() => navigate(`/test/${test._id}`)}
                                >
                                    Manage Test
                                </button>
                                <button
                                    className="btn icon-btn delete-btn"
                                    onClick={() => handleDeleteTest(test._id, test.name)}
                                    title="Delete Test"
                                >
                                    <MdDelete />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CampaignDetails;
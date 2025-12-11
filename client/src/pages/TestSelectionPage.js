// src/pages/TestSelectionPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MdQrCodeScanner, MdCalendarToday, MdAssignment, MdCheckCircle } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const TestSelectionPage = () => {
    const [allTests, setAllTests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const fetchAllTests = async () => {
            try {
                // First, get all campaigns
                const campaignsResponse = await axios.get(`${API_URL}/campaigns`);
                const campaigns = campaignsResponse.data;

                // Then, for each campaign, fetch its tests
                const testsPromises = campaigns.map(campaign =>
                    axios.get(`${API_URL}/tests/campaign/${campaign._id}`).then(res =>
                        // Add campaign name to each test for better display
                        res.data.map(test => ({ ...test, campaignName: campaign.name }))
                    )
                );

                // Wait for all test fetches to complete
                const testsByCampaign = await Promise.all(testsPromises);

                // Flatten the array of arrays into a single array of tests
                const flattenedTests = testsByCampaign.flat();

                // Sort by date (newest first)
                flattenedTests.sort((a, b) => new Date(b.date) - new Date(a.date));

                // Filter for volunteers
                if (user?.role === 'volunteer' && user?.assignedTests) {
                    const assignedTestIds = user.assignedTests;
                    const filteredTests = flattenedTests.filter(test => assignedTestIds.includes(test._id));
                    setAllTests(filteredTests);
                } else {
                    setAllTests(flattenedTests);
                }
            } catch (error) {
                console.error("Error fetching tests:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllTests();
    }, [user]);

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#6b7280' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #4f46e5', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
                    <p>Loading your assignments...</p>
                </div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="page-header" style={{ marginBottom: '32px', textAlign: 'center', display: 'block' }}>
                <h1 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Welcome, {user?.username?.split('_')[0] || 'Volunteer'}!</h1>
                <p style={{ color: '#6b7280', maxWidth: '500px', margin: '0 auto' }}>
                    Here are the tests assigned to you. Select one to start marking attendance.
                </p>
            </div>

            {allTests.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                    {allTests.map((test) => (
                        <div
                            key={test._id}
                            onClick={() => navigate(`/scan/${test._id}`)}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                padding: '24px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                border: '1px solid #e5e7eb',
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{
                                    backgroundColor: '#e0e7ff',
                                    color: '#4f46e5',
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2rem'
                                }}>
                                    <MdAssignment />
                                </div>
                                <span style={{
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151',
                                    padding: '4px 12px',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    {test.campaignName}
                                </span>
                            </div>

                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>{test.name}</h3>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '0.95rem', marginBottom: '24px' }}>
                                <MdCalendarToday />
                                <span>{new Date(test.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>

                            <button className="btn primary-btn" style={{ width: '100%', marginTop: 'auto', padding: '12px', fontSize: '1rem', justifyContent: 'center' }}>
                                <MdQrCodeScanner size={20} /> Start Scanning
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                    <div style={{ color: '#9ca3af', fontSize: '4rem', marginBottom: '16px' }}><MdCheckCircle /></div>
                    <h3 style={{ fontSize: '1.25rem', color: '#374151', marginBottom: '8px' }}>All Caught Up!</h3>
                    <p style={{ color: '#6b7280' }}>You don't have any assigned tests at the moment.</p>
                </div>
            )}
        </div>
    );
};

export default TestSelectionPage;
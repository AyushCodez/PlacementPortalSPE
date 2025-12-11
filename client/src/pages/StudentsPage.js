// src/pages/StudentsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import { useLocation } from 'react-router-dom';
import { MdUpload, MdCheckCircle, MdPerson, MdSearch, MdClose, MdSchool, MdHistory, MdGrade, MdCampaign, MdDownload, MdDelete } from 'react-icons/md';

const API_URL = process.env.REACT_APP_API_URL;

Modal.setAppElement('#root');

const StudentsPage = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState('');
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const location = useLocation();

    // Modal States
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isEligibleModalOpen, setIsEligibleModalOpen] = useState(false);
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

    // Form States
    const [uploadFile, setUploadFile] = useState(null);
    const [bulkRollNumbers, setBulkRollNumbers] = useState('');
    const [bulkEligibleStatus, setBulkEligibleStatus] = useState(true);
    const [selectedStudentStats, setSelectedStudentStats] = useState(null);

    // Fetch Campaigns on Load
    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const response = await axios.get(`${API_URL}/campaigns`);
                setCampaigns(response.data);

                // Check for query param
                const searchParams = new URLSearchParams(location.search);
                const campaignIdFromUrl = searchParams.get('campaignId');

                if (campaignIdFromUrl) {
                    setSelectedCampaignId(campaignIdFromUrl);
                } else if (response.data.length > 0) {
                    // Default to the first active campaign or just the first one
                    const active = response.data.find(c => c.status === 'active');
                    setSelectedCampaignId(active ? active._id : response.data[0]._id);
                }
            } catch (error) {
                console.error("Error fetching campaigns:", error);
            }
        };
        fetchCampaigns();
    }, [location.search]);

    // Fetch Students when Campaign Changes
    const fetchStudents = useCallback(async () => {
        if (!selectedCampaignId) return;
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/students/campaign/${selectedCampaignId}`);
            setStudents(response.data);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedCampaignId]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    // --- Handlers ---

    const handleUpload = async () => {
        if (!uploadFile) return alert("Please select a file");
        const formData = new FormData();
        formData.append('studentsFile', uploadFile);

        try {
            await axios.post(`${API_URL}/students/campaign/${selectedCampaignId}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Students uploaded successfully!');
            setIsUploadModalOpen(false);
            fetchStudents();
        } catch (error) {
            alert('Upload failed.');
            console.error(error);
        }
    };

    const handleBulkEligible = async () => {
        if (!bulkRollNumbers.trim()) return alert("Enter roll numbers");

        const rollNumbers = bulkRollNumbers.split(/[\n,]+/).map(r => r.trim()).filter(r => r);

        try {
            const response = await axios.post(`${API_URL}/students/campaign/${selectedCampaignId}/bulk-eligible`, {
                rollNumbers,
                isEligible: bulkEligibleStatus
            });
            alert(response.data.message);
            setIsEligibleModalOpen(false);
            fetchStudents();
        } catch (error) {
            alert('Failed to update eligibility.');
            console.error(error);
        }
    };

    const handleViewStats = async (studentId) => {
        try {
            const response = await axios.get(`${API_URL}/students/${studentId}/stats`);
            setSelectedStudentStats(response.data);
            setIsStatsModalOpen(true);
        } catch (error) {
            console.error("Error fetching stats:", error);
            alert("Could not fetch student stats.");
        }
    };

    // Filter students
    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const downloadTemplate = () => {
        const csvContent = "Roll Number,Name,Email,Department,CGPA,Eligible\n101,John Doe,john@example.com,CSE,8.5,Yes";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'students_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div>
            <div className="page-header">
                <div className="header-content">
                    <div>
                        <h1>Student Management</h1>
                        <p>Manage student database, eligibility, and track performance.</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select
                        value={selectedCampaignId}
                        onChange={(e) => setSelectedCampaignId(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
                    >
                        {campaigns.map(c => (
                            <option key={c._id} value={c._id}>{c.name} ({c.status})</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Action Grid */}
            <div className="action-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                <div className="action-card" onClick={() => setIsUploadModalOpen(true)}>
                    <div className="icon-wrapper" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
                        <MdUpload />
                    </div>
                    <h3>Bulk Upload Students</h3>
                    <p>Import Excel with Roll No, Name, CGPA, etc.</p>
                </div>
                <div className="action-card" onClick={() => setIsEligibleModalOpen(true)}>
                    <div className="icon-wrapper" style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
                        <MdCheckCircle />
                    </div>
                    <h3>Bulk Mark Eligible</h3>
                    <p>Update eligibility for a list of Roll Numbers</p>
                </div>
            </div>

            {/* Student Table */}
            <div className="card table-container">
                <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Student List ({filteredStudents.length})</h3>
                    <div style={{ position: 'relative' }}>
                        <MdSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Search by Name or Roll No"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '8px 12px 8px 36px', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
                        />
                    </div>
                </div>
                <div className="table-responsive">
                    {loading ? <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div> : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Roll Number</th>
                                    <th>Name</th>
                                    <th>Department</th>
                                    <th>CGPA</th>
                                    <th>Eligible</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map(student => (
                                    <tr key={student._id}>
                                        <td style={{ fontWeight: '500' }}>{student.rollNumber}</td>
                                        <td>{student.name}</td>
                                        <td>{student.department}</td>
                                        <td>{student.cgpa}</td>
                                        <td>
                                            <span className={`status-badge ${student.isEligible ? 'success' : 'pending'}`}>
                                                {student.isEligible ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn text-btn" onClick={() => handleViewStats(student._id)}>
                                                View Stats
                                            </button>
                                            <button
                                                className="btn icon-btn delete-btn"
                                                onClick={() => {
                                                    if (window.confirm(`Are you sure you want to remove ${student.name} from this campaign?`)) {
                                                        axios.delete(`${API_URL}/students/campaign/${selectedCampaignId}/student/${student._id}`)
                                                            .then(() => {
                                                                alert('Student removed successfully.');
                                                                fetchStudents();
                                                            })
                                                            .catch(err => {
                                                                console.error(err);
                                                                alert('Failed to remove student.');
                                                            });
                                                    }
                                                }}
                                                title="Remove from Campaign"
                                                style={{ marginLeft: '8px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                            >
                                                <MdDelete />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredStudents.length === 0 && (
                                    <tr><td colSpan="6" className="empty-state">No students found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* Upload Modal */}
            <Modal
                isOpen={isUploadModalOpen}
                onRequestClose={() => setIsUploadModalOpen(false)}
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <div className="modal-header">
                    <h2>Upload Students</h2>
                    <button onClick={() => setIsUploadModalOpen(false)} className="close-modal-btn">&times;</button>
                </div>
                <div className="modal-body">
                    <p>Upload an Excel file with columns: <strong>Roll Number, Name, Email, Department, CGPA, Eligible (Yes/No)</strong>.</p>

                    <button
                        onClick={downloadTemplate}
                        className="btn text-btn"
                        style={{ marginBottom: '16px', padding: '0', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <MdDownload /> Download Template (CSV)
                    </button>

                    <div className="file-upload-wrapper">
                        <input type="file" onChange={(e) => setUploadFile(e.target.files[0])} accept=".xlsx, .xls, .csv" id="student-upload" />
                        <label htmlFor="student-upload" className="file-upload-label">
                            {uploadFile ? uploadFile.name : "Choose File"}
                        </label>
                    </div>
                </div>
                <div className="modal-footer">
                    <button onClick={() => setIsUploadModalOpen(false)} className="btn secondary-btn">Cancel</button>
                    <button onClick={handleUpload} className="btn primary-btn">Upload</button>
                </div>
            </Modal>

            {/* Bulk Eligible Modal */}
            <Modal
                isOpen={isEligibleModalOpen}
                onRequestClose={() => setIsEligibleModalOpen(false)}
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <div className="modal-header">
                    <h2>Bulk Mark Eligibility</h2>
                    <button onClick={() => setIsEligibleModalOpen(false)} className="close-modal-btn">&times;</button>
                </div>
                <div className="modal-body">
                    <p>Enter Roll Numbers (separated by commas or new lines) to update their eligibility status.</p>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ marginRight: '12px', fontWeight: '500' }}>Set Status To:</label>
                        <select
                            value={bulkEligibleStatus}
                            onChange={(e) => setBulkEligibleStatus(e.target.value === 'true')}
                            style={{ padding: '6px', borderRadius: '4px' }}
                        >
                            <option value="true">Eligible</option>
                            <option value="false">Not Eligible</option>
                        </select>
                    </div>
                    <textarea
                        className="modal-textarea"
                        placeholder="e.g. 101, 102, 103..."
                        value={bulkRollNumbers}
                        onChange={(e) => setBulkRollNumbers(e.target.value)}
                        rows="6"
                    />
                </div>
                <div className="modal-footer">
                    <button onClick={() => setIsEligibleModalOpen(false)} className="btn secondary-btn">Cancel</button>
                    <button onClick={handleBulkEligible} className="btn primary-btn">Update Status</button>
                </div>
            </Modal>

            {/* Student Stats Modal */}
            <Modal
                isOpen={isStatsModalOpen}
                onRequestClose={() => setIsStatsModalOpen(false)}
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <div className="modal-header">
                    <h2>Student Profile</h2>
                    <button onClick={() => setIsStatsModalOpen(false)} className="close-modal-btn">&times;</button>
                </div>
                {selectedStudentStats && (
                    <div className="modal-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#4f46e5' }}>
                                <MdPerson />
                            </div>
                            <div>
                                <h3 style={{ margin: 0 }}>{selectedStudentStats.student.name}</h3>
                                <p style={{ margin: 0, color: '#6b7280' }}>{selectedStudentStats.student.rollNumber} | {selectedStudentStats.student.department}</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div className="card" style={{ padding: '16px', backgroundColor: '#f9fafb', border: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#4f46e5' }}><MdSchool /> Academic Stats</div>
                                <div style={{ fontSize: '0.9rem' }}><strong>CGPA:</strong> {selectedStudentStats.student.cgpa}</div>
                                <div style={{ fontSize: '0.9rem' }}><strong>Eligibility:</strong> {selectedStudentStats.student.isEligible ? 'Yes' : 'No'}</div>
                            </div>
                            <div className="card" style={{ padding: '16px', backgroundColor: '#f9fafb', border: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#059669' }}><MdHistory /> Placement Activity</div>
                                <div style={{ fontSize: '0.9rem' }}><strong>Tests Applied:</strong> {selectedStudentStats.totalTestsApplied}</div>
                                <div style={{ fontSize: '0.9rem' }}><strong>Tests Attended:</strong> {selectedStudentStats.testsAttended}</div>
                            </div>
                        </div>

                        {/* Removed Enrolled Campaigns Section */}

                        <h4>Test History ({campaigns.find(c => c._id === selectedCampaignId)?.name || 'Current Campaign'})</h4>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                            <table style={{ margin: 0 }}>
                                <thead style={{ position: 'sticky', top: 0 }}>
                                    <tr>
                                        <th style={{ padding: '8px 12px' }}>Test Name</th>
                                        <th style={{ padding: '8px 12px' }}>Date</th>
                                        <th style={{ padding: '8px 12px' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedStudentStats.applications
                                        .filter(app => app.campaignId === selectedCampaignId) // Filter by selected campaign
                                        .map((app, idx) => (
                                            <tr key={idx}>
                                                <td style={{ padding: '8px 12px' }}>{app.testName}</td>
                                                <td style={{ padding: '8px 12px' }}>{new Date(app.date).toLocaleDateString()}</td>
                                                <td style={{ padding: '8px 12px' }}>
                                                    {app.attended ? <span style={{ color: 'green' }}>Attended</span> : <span style={{ color: 'red' }}>Absent</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    {selectedStudentStats.applications.filter(app => app.campaignId === selectedCampaignId).length === 0 && (
                                        <tr><td colSpan="3" style={{ textAlign: 'center', padding: '12px' }}>No history found for this campaign.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StudentsPage;

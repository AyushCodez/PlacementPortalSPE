// src/pages/CampaignStudentPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Import useParams
import axios from 'axios';
import { MdOutlineFileUpload } from 'react-icons/md'; // Example icon for upload

const API_URL = process.env.REACT_APP_API_URL;

const CampaignStudentPage = () => {
    // Get campaignId from the URL parameters
    const { campaignId } = useParams();
    // State for campaign details
    const [campaignName, setCampaignName] = useState('');
    // State for the list of students in this campaign
    const [students, setStudents] = useState([]);
    // State for the file selected for upload
    const [file, setFile] = useState(null);
    // State for displaying messages (e.g., upload status)
    const [message, setMessage] = useState('');
    // Hook for navigation
    const navigate = useNavigate();

    // Function to fetch campaign name and student list
    const fetchData = useCallback(async () => {
        // Only fetch if campaignId is available
        if (!campaignId) return;
        setMessage('Loading data...'); // Provide loading feedback
        try {
            // Fetch campaign details (specifically the name)
            const campaignRes = await axios.get(`${API_URL}/campaigns/${campaignId}`);
            setCampaignName(campaignRes.data.name);

            // Fetch students belonging to this specific campaign
            const studentsRes = await axios.get(`${API_URL}/students/campaign/${campaignId}`);
            setStudents(studentsRes.data);
            setMessage(''); // Clear loading message on success
        } catch (error) {
            console.error("Error fetching campaign/student data:", error);
            setMessage('Failed to load campaign or student data. Please try again.');
            setCampaignName('Unknown Campaign'); // Provide fallback name
            setStudents([]); // Clear student list on error
        }
    }, [campaignId]); // Dependency array includes campaignId

    // Fetch data when the component mounts or campaignId changes
    useEffect(() => {
        fetchData();
    }, [fetchData]); // Use fetchData as the dependency

    // Handler for file input changes
    const handleFileChange = (e) => {
        setFile(e.target.files[0]); // Get the selected file
        setMessage(''); // Clear previous messages
    };

    // Handler for the upload button click
    const handleUpload = async () => {
        if (!file) {
            alert("Please select an Excel file (.xlsx or .xls) to upload.");
            return;
        }
        if (!campaignId) {
            alert("Campaign ID is missing. Cannot upload students.");
            return;
        }

        // Create form data to send the file
        const formData = new FormData();
        formData.append('studentsFile', file);
        setMessage('Uploading, please wait...'); // Provide feedback

        try {
            // Make the POST request to the campaign-specific upload endpoint
            const response = await axios.post(`${API_URL}/students/campaign/${campaignId}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data' // Header required for file uploads
                }
            });
            setMessage(response.data.message || 'Upload processed successfully.'); // Display success message from backend
            setFile(null); // Clear the selected file input
            document.getElementById('student-file-input').value = null; // Reset file input visually
            fetchData(); // Refresh the student list to show changes
        } catch (error) {
            // Display error message from backend or a generic one
            setMessage(error.response?.data?.message || 'Upload failed. Check console for details.');
            console.error("Error uploading students file:", error.response?.data || error.message);
        }
    };

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1>Students for: {campaignName}</h1>
                    <p>Manage the student list specific to this campaign.</p>
                </div>
                {/* Button to navigate back */}
                <button
                    onClick={() => navigate(`/campaign/${campaignId}`)}
                    style={{ backgroundColor: '#6c757d' }}
                >
                    ← Back to Campaign Details
                </button>
            </div>

            {/* Upload Section */}
            <div className="card" style={{ marginBottom: '30px' }}>
                <h3>Upload/Update Student List (Excel)</h3>
                <p>
                    Ensure your Excel file has columns: <strong>Name</strong>, <strong>Roll Number</strong>, <strong>Email</strong>, <strong>Department</strong>.
                    Existing students (matched by Roll Number within this campaign) will be updated. New students will be added.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '15px' }}>
                    <input
                        id="student-file-input" // Added ID to allow resetting
                        type="file"
                        onChange={handleFileChange}
                        accept=".xlsx, .xls" // Accept only Excel file types
                        style={{ flexGrow: 1 }}
                    />
                    <button onClick={handleUpload} disabled={!file || message === 'Uploading, please wait...'}>
                        <MdOutlineFileUpload style={{ marginRight: '5px' }} />
                        {message === 'Uploading, please wait...' ? 'Uploading...' : 'Upload and Update'}
                    </button>
                </div>
                {/* Display feedback messages */}
                {message && (
                    <p style={{
                        marginTop: '15px',
                        padding: '10px',
                        borderRadius: '5px',
                        backgroundColor: message.includes('failed') || message.includes('Failed') ? '#f8d7da' : '#d4edda', // Red or green background
                        color: message.includes('failed') || message.includes('Failed') ? '#721c24' : '#155724', // Dark red or green text
                        border: `1px solid ${message.includes('failed') || message.includes('Failed') ? '#f5c6cb' : '#c3e6cb'}`
                    }}>
                        {message}
                    </p>
                )}
            </div>

            {/* Student List Table */}
            <h3>Student List ({students.length})</h3>
            {students.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Roll Number</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Department</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map(student => (
                            <tr key={student._id}>
                                <td>{student.rollNumber}</td>
                                <td>{student.name}</td>
                                <td>{student.email || 'N/A'}</td> {/* Display N/A if email is missing */}
                                <td>{student.department || 'N/A'}</td> {/* Display N/A if department is missing */}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                // Message shown when no students are found for this campaign
                !message.includes('Loading') && <p>No students found for this campaign. Upload a list to get started.</p>
            )}
        </div>
    );
};

export default CampaignStudentPage;
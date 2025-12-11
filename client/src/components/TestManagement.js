// src/components/TestManagement.js
import React, { useState, useEffect, useCallback } from 'react'; // 1. Import useCallback
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const TestManagement = () => {
    const { testId } = useParams();
    const [test, setTest] = useState(null);
    const [file, setFile] = useState(null);
    const [venues, setVenues] = useState([{ name: '', capacity: '' }]);

    // 2. Wrap the function in useCallback
    const fetchTestDetails = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/tests/${testId}`);
            setTest(response.data);
        } catch (error) {
            console.error("Error fetching test details:", error);
        }
    }, [testId]); // It depends on testId, so we add it here

    useEffect(() => {
        fetchTestDetails();
    }, [fetchTestDetails]); // 3. Add the function to the dependency array

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
            await axios.post(`${API_URL}/tests/${testId}/applicants`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Applicants uploaded successfully!');
            fetchTestDetails(); // Refresh data
        } catch (error) {
            console.error("Error uploading applicants:", error);
        }
    };

    const handleGenerateSeating = async () => {
        try {
            const response = await axios.post(`${API_URL}/tests/${testId}/seating`, { venues });
            setTest(response.data);
            alert('Seating arrangement generated!');
        } catch (error) {
            console.error("Error generating seating:", error);
        }
    };
    
    // ... UI for venue input fields would go here

    if (!test) return <div>Loading...</div>;

    return (
        <div>
            <h2>Manage Test: {test.name}</h2>
            
            <div>
                <h3>Upload Applicants (Excel)</h3>
                <input type="file" onChange={handleFileChange} />
                <button onClick={handleUpload}>Upload</button>
            </div>

            <hr />

            <div>
                <h3>Generate Seating Arrangement</h3>
                {/* Simplified venue input */}
                <input type="text" placeholder="Venue Name" onChange={(e) => setVenues([{...venues[0], name: e.target.value}])} />
                <input type="number" placeholder="Capacity" onChange={(e) => setVenues([{...venues[0], capacity: parseInt(e.target.value, 10)}])} />
                <button onClick={handleGenerateSeating}>Generate</button>
            </div>

            <hr />
            
            <h3>Applicant List</h3>
            <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{ border: '1px solid black', padding: '8px' }}>Roll Number</th>
                        <th style={{ border: '1px solid black', padding: '8px' }}>Name</th>
                        <th style={{ border: '1px solid black', padding: '8px' }}>Attended</th>
                        <th style={{ border: '1px solid black', padding: '8px' }}>Venue</th>
                        <th style={{ border: '1px solid black', padding: '8px' }}>Seat</th>
                    </tr>
                </thead>
                <tbody>
                    {test.applicants.map(app => (
                        <tr key={app._id}>
                            <td style={{ border: '1px solid black', padding: '8px' }}>{app.rollNumber}</td>
                            <td style={{ border: '1px solid black', padding: '8px' }}>{app.name}</td>
                            <td style={{ border: '1px solid black', padding: '8px' }}>{app.attended ? 'Yes' : 'No'}</td>
                            <td style={{ border: '1px solid black', padding: '8px' }}>{app.venue}</td>
                            <td style={{ border: '1px solid black', padding: '8px' }}>{app.seatNumber}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TestManagement;
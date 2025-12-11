// src/components/AttendanceScanner.js
import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner'; // Import the new component
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const AttendanceScanner = () => {
    const { testId } = useParams();
    const [message, setMessage] = useState('');

    const handleDecode = async (result) => {
        const rollNumber = result;
        try {
            const response = await axios.put(`${API_URL}/tests/${testId}/attendance/${rollNumber}`);
            setMessage(response.data.message);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error marking attendance');
        }
    };

    const handleError = (error) => {
        console.error(error);
        setMessage('QR code scanning error. Please try again.');
    };

    return (
        <div>
            <h2>Scan Student ID Card</h2>
            <div style={{ width: '300px' }}>
                <Scanner
                    onScan={handleDecode}
                    onError={handleError}
                    allowMultiple={false} // Scan only one code at a time
                />
            </div>
            <h3>Status: {message}</h3>
        </div>
    );
};

export default AttendanceScanner;
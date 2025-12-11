// src/pages/AttendanceScanner.js
import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, DecodeHintType } from '@zxing/library';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MdOutlineEdit, MdArrowBack } from 'react-icons/md';

const API_URL = process.env.REACT_APP_API_URL;

const AttendanceScanner = () => {
    const { testId } = useParams();
    const [message, setMessage] = useState('Initializing...');
    const [messageType, setMessageType] = useState('info'); // 'info', 'success', 'error', 'warning'
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [videoDevices, setVideoDevices] = useState([]);
    const [manualRollNumber, setManualRollNumber] = useState('');

    const videoRef = useRef(null);
    const codeReaderRef = useRef(null);
    const processingRef = useRef(false);
    const lastScannedRef = useRef({ code: '', time: 0 });
    const messageTimeoutRef = useRef(null);

    const navigate = useNavigate();

    const processAttendance = React.useCallback(async (scannedData) => {
        if (!scannedData || scannedData.trim() === '') {
            setMessage('Please enter or scan a valid QR Code.');
            setMessageType('error');
            return;
        }

        if (processingRef.current) return;
        processingRef.current = true;

        let rollNumberToMark = scannedData;

        // Try to parse as JSON (New QR Format)
        try {
            const parsedData = JSON.parse(scannedData);
            if (parsedData.testId && parsedData.rollNumber) {
                // Validate Test ID
                if (parsedData.testId !== testId) {
                    setMessage('⚠️ Invalid QR: Belongs to a different test.');
                    setMessageType('error');
                    processingRef.current = false;

                    // Clear error after delay
                    messageTimeoutRef.current = setTimeout(() => {
                        setMessage('Ready to scan next.');
                        setMessageType('info');
                    }, 3000);
                    return;
                }
                rollNumberToMark = parsedData.rollNumber;
            }
        } catch (e) {
            // Not JSON, treat as raw roll number (Legacy support or manual entry)
        }

        const cleanRollNumber = rollNumberToMark.trim().toUpperCase();

        setMessage(`Processing Roll Number: ${cleanRollNumber}...`);
        setMessageType('info');

        if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
        }

        try {
            const response = await axios.put(`${API_URL}/tests/${testId}/attendance/${cleanRollNumber}`);
            setMessage(`✅ ${response.data.message}`);
            setMessageType('success');

            const audio = new Audio('/success-beep.mp3');
            audio.play().catch(e => console.log("Audio play failed", e));

        } catch (error) {
            console.error("Attendance error:", error);

            let errorMsg = 'Error marking attendance.';
            let type = 'error';

            if (error.response) {
                if (error.response.status === 404) {
                    errorMsg = `⚠️ ${error.response.data.message || 'Student not registered for this test.'}`;
                    type = 'warning';
                } else if (error.response.status === 400) {
                    errorMsg = `⚠️ ${error.response.data.message || 'Student already marked present.'}`;
                    type = 'warning';
                } else {
                    errorMsg = `❌ ${error.response.data.message || 'Server Error'}`;
                }
            }

            setMessage(errorMsg);
            setMessageType(type);
        } finally {
            processingRef.current = false;
            messageTimeoutRef.current = setTimeout(() => {
                setMessage('Ready to scan next.');
                setMessageType('info');
            }, 5000);
        }
    }, [testId]);

    useEffect(() => {
        const findDevices = async () => {
            try {
                // Check if mediaDevices is supported
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    setMessage('Camera API not supported in this browser. Please use a modern browser or HTTPS.');
                    setMessageType('error');
                    return;
                }

                // Explicitly ask for permission first to trigger prompt
                await navigator.mediaDevices.getUserMedia({ video: true });

                codeReaderRef.current = new BrowserMultiFormatReader();
                const devices = await codeReaderRef.current.listVideoInputDevices();
                if (devices.length > 0) {
                    setVideoDevices(devices);
                    const backCamera = devices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('environment'));
                    setSelectedDeviceId(backCamera ? backCamera.deviceId : devices[0].deviceId);
                    setMessage('Ready to scan or enter Roll Number.');
                    setMessageType('info');
                } else {
                    setMessage('No camera devices found.');
                    setMessageType('error');
                }
            } catch (err) {
                console.error("Error listing devices:", err);
                setMessage('Error accessing camera. Please check permissions and ensure you are using HTTPS or localhost.');
                setMessageType('error');
            }
        };
        findDevices();
        return () => {
            if (codeReaderRef.current) {
                codeReaderRef.current.reset();
            }
        };
    }, []);

    useEffect(() => {
        if (selectedDeviceId && videoRef.current && codeReaderRef.current) {
            const hints = new Map();
            const formats = [
                DecodeHintType.CODE_128,
                DecodeHintType.QR_CODE,
                DecodeHintType.EAN_13,
                DecodeHintType.EAN_8,
                DecodeHintType.CODE_39,
                DecodeHintType.ITF
            ];
            hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);

            const reader = codeReaderRef.current;
            reader.hints = hints;

            if (message === 'Initializing...') {
                setMessage('Scanner active...');
                setMessageType('info');
            }

            reader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, error) => {
                if (result) {
                    const text = result.getText();
                    const now = Date.now();

                    const isSameCode = text === lastScannedRef.current.code;
                    const isRecent = (now - lastScannedRef.current.time) < 3000;

                    if (processingRef.current) return;
                    if (isSameCode && isRecent) return;

                    lastScannedRef.current = { code: text, time: now };
                    processAttendance(text);
                }
            });

            return () => {
                if (reader) {
                    reader.reset();
                }
                if (messageTimeoutRef.current) {
                    clearTimeout(messageTimeoutRef.current);
                }
            };
        }
    }, [selectedDeviceId, processAttendance]);

    const handleManualSubmit = (e) => {
        e.preventDefault();
        processAttendance(manualRollNumber);
    };

    const getMessageStyle = () => {
        switch (messageType) {
            case 'success':
                return { backgroundColor: '#d1fae5', color: '#065f46', borderColor: '#a7f3d0' };
            case 'warning':
                return { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fde68a' };
            case 'error':
                return { backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' };
            default:
                return { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#e5e7eb' };
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="page-header" style={{ marginBottom: '20px' }}>
                <button className="back-btn" onClick={() => navigate(`/test/${testId}`)}>
                    <MdArrowBack /> Back to Test
                </button>
            </div>

            <div className="card" style={{ padding: '24px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '24px', marginTop: 0 }}>Attendance Scanner</h2>

                {/* --- Camera Selection --- */}
                {videoDevices.length > 1 && (
                    <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                        <label style={{ marginRight: '10px', fontWeight: '500', color: '#6b7280' }}>Camera:</label>
                        <select
                            value={selectedDeviceId}
                            onChange={(e) => setSelectedDeviceId(e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
                        >
                            {videoDevices.map(device => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* --- Video Feed --- */}
                <div style={{
                    width: '100%',
                    maxWidth: '400px',
                    margin: '0 auto 24px auto',
                    border: `4px solid ${messageType === 'success' ? '#10b981' : messageType === 'error' ? '#ef4444' : messageType === 'warning' ? '#f59e0b' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative',
                    minHeight: '250px',
                    backgroundColor: '#000',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                    <video ref={videoRef} style={{ width: '100%', display: 'block' }} id="video" muted autoPlay playsInline />
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '15%',
                        right: '15%',
                        height: '2px',
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)'
                    }}></div>
                </div>

                {/* --- Manual Entry Form --- */}
                <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '12px', marginBottom: '24px', justifyContent: 'center' }}>
                    <input
                        type="text"
                        placeholder="Enter Roll Number"
                        value={manualRollNumber}
                        onChange={(e) => setManualRollNumber(e.target.value)}
                        className="venue-input"
                        style={{ flexGrow: 1, maxWidth: '200px' }}
                        required
                    />
                    <button
                        type="submit"
                        disabled={message.includes('Processing...')}
                        className="btn primary-btn"
                        style={{ opacity: message.includes('Processing...') ? 0.7 : 1 }}
                    >
                        <MdOutlineEdit /> Mark
                    </button>
                </form>

                {/* --- Status Message --- */}
                <div style={{
                    textAlign: 'center',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid',
                    fontWeight: '500',
                    transition: 'all 0.3s ease',
                    ...getMessageStyle()
                }}>
                    {message}
                </div>
            </div>
        </div>
    );
};

export default AttendanceScanner;
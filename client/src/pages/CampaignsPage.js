// src/pages/CampaignsPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import { MdAdd, MdCalendarToday, MdClose, MdDelete, MdCheckCircle, MdRefresh, MdArrowForward } from 'react-icons/md';

const API_URL = process.env.REACT_APP_API_URL;

Modal.setAppElement('#root');

const CampaignsPage = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [endDate, setEndDate] = useState('');

    const navigate = useNavigate();

    const fetchCampaigns = async () => {
        try {
            const response = await axios.get(`${API_URL}/campaigns`);
            setCampaigns(response.data);
        } catch (error) {
            console.error("Error fetching campaigns:", error);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/campaigns`, { name, description, startDate, endDate });
            setName('');
            setDescription('');
            setStartDate('');
            setEndDate('');
            handleCloseModal();
            fetchCampaigns();
        } catch (error) {
            console.error("Error creating campaign:", error);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const handleDeleteCampaign = async (campaignId, campaignName) => {
        if (window.confirm(`Are you sure you want to delete "${campaignName}"? This cannot be undone.`)) {
            try {
                await axios.delete(`${API_URL}/campaigns/${campaignId}`);
                fetchCampaigns();
            } catch (error) {
                console.error("Error deleting campaign:", error);
            }
        }
    };

    const handleMarkActive = async (campaignId, campaignName) => {
        if (window.confirm(`Mark "${campaignName}" as active?`)) {
            try {
                await axios.put(`${API_URL}/campaigns/${campaignId}/status`, { status: 'active' });
                fetchCampaigns();
            } catch (error) {
                console.error("Error marking campaign active:", error);
            }
        }
    };

    const handleMarkCompleted = async (campaignId, campaignName) => {
        if (window.confirm(`Mark "${campaignName}" as completed?`)) {
            try {
                await axios.put(`${API_URL}/campaigns/${campaignId}/status`, { status: 'completed' });
                fetchCampaigns();
            } catch (error) {
                console.error("Error marking campaign completed:", error);
            }
        }
    };

    const filteredCampaigns = campaigns.filter(campaign => {
        if (filterStatus === 'all') return true;
        return campaign.status === filterStatus;
    });

    return (
        <div>
            <div className="page-header">
                <div className="header-content">
                    <div>
                        <h1>Campaigns</h1>
                        <p>Manage placement campaigns and cycles</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '0.5rem', border: '1px solid #e5e7eb', fontSize: '0.95rem' }}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                    </select>
                    <button className="btn primary-btn" onClick={handleOpenModal}>
                        <MdAdd /> New Campaign
                    </button>
                </div>
            </div>

            <div className="action-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {filteredCampaigns.map((campaign) => (
                    <div key={campaign._id} className="action-card" style={{ alignItems: 'flex-start', textAlign: 'left', position: 'relative' }}>
                        <span className={`status-badge ${campaign.status === 'active' ? 'success' : 'pending'}`} style={{ position: 'absolute', top: '24px', right: '24px' }}>
                            {campaign.status}
                        </span>

                        <h3 style={{ marginTop: '0', paddingRight: '80px' }}>{campaign.name}</h3>
                        <p style={{ marginBottom: '16px', flexGrow: 1 }}>{campaign.description}</p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '0.9rem', marginBottom: '20px' }}>
                            <MdCalendarToday />
                            <span>{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: 'auto' }}>
                            <button
                                className="btn secondary-btn"
                                style={{ flexGrow: 1 }}
                                onClick={() => navigate(`/campaign/${campaign._id}`)}
                            >
                                View Details
                            </button>

                            {campaign.status === 'active' ? (
                                <button
                                    className="btn icon-btn"
                                    onClick={() => handleMarkCompleted(campaign._id, campaign.name)}
                                    title="Mark as Completed"
                                    style={{ color: '#f59e0b' }}
                                >
                                    <MdCheckCircle />
                                </button>
                            ) : (
                                <button
                                    className="btn icon-btn"
                                    onClick={() => handleMarkActive(campaign._id, campaign.name)}
                                    title="Mark as Active"
                                    style={{ color: '#10b981' }}
                                >
                                    <MdRefresh />
                                </button>
                            )}
                            <button
                                className="btn icon-btn delete-btn"
                                onClick={() => handleDeleteCampaign(campaign._id, campaign.name)}
                                title="Delete Campaign"
                            >
                                <MdDelete />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                onRequestClose={handleCloseModal}
                contentLabel="Create New Campaign"
                className="modal-content"
                overlayClassName="modal-overlay"
            >
                <div className="modal-header">
                    <h2>Create New Campaign</h2>
                    <button className="close-modal-btn" onClick={handleCloseModal}>&times;</button>
                </div>
                <div className="modal-body">
                    <p>Add a new placement campaign to organize your tests</p>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '0.9rem' }}>Campaign Name</label>
                            <input
                                type="text"
                                placeholder="e.g., Summer 2025 Placements"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="venue-input"
                                style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '0.9rem' }}>Description</label>
                            <textarea
                                placeholder="Brief description of the campaign"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="3"
                                className="modal-textarea"
                            ></textarea>
                        </div>

                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '0.9rem' }}>Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                    className="venue-input"
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '0.9rem' }}>End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                    className="venue-input"
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        <div className="modal-footer" style={{ marginTop: '16px', padding: 0, border: 'none', background: 'none' }}>
                            <button type="button" className="btn secondary-btn" onClick={handleCloseModal}>
                                Cancel
                            </button>
                            <button type="submit" className="btn primary-btn">
                                Create Campaign
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
};

export default CampaignsPage;
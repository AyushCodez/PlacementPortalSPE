// src/components/StatsCard.js
import React from 'react';

const StatsCard = ({ title, value, description, icon, iconColor, details }) => {
    return (
        <div className="stat-card">
            <div className="stat-card-header">
                <h3>{title}</h3>
                {React.cloneElement(icon, { className: iconColor })}
            </div>
            <div className="stat-card-value">{value}</div>
            <div className="stat-card-description">{description}</div>

            {details && details.length > 0 && (
                <div className="stat-card-details">
                    {details.slice(0, 3).map((item, index) => (
                        <div key={index} className="detail-item">
                            <span className="detail-name">{item.name}</span>
                            <span className="detail-info">
                                {new Date(item.date).toLocaleDateString()}
                            </span>
                        </div>
                    ))}
                    {details.length > 3 && (
                        <div className="detail-more">+{details.length - 3} more</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StatsCard;
// src/components/Header.js
import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
    return (
        <header>
            <Link to="/">Placement Test Attendance System</Link>
        </header>
    );
};

export default Header;
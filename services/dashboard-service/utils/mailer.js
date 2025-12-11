const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

// Create a transporter using SMTP
// Supports custom host/port (e.g. Office 365) or service fallback (e.g. Gmail)
const port = parseInt(process.env.EMAIL_PORT) || 587;
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Use App Password if MFA is enabled
    },
    tls: {
        ciphers: 'SSLv3',
        // Helps with some cloud providers blocking strict SSL checks or self-signed certs in chain
        rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10 seconds timeout
    greetingTimeout: 5000,
    socketTimeout: 10000
});

/**
 * Generates a QR code and sends it via email.
 * @param {string} toEmail - Recipient's email address.
 * @param {string} rollNumber - Student's roll number.
 * @param {string} testName - Name of the test.
 * @param {string} customMessage - Optional additional message.
 * @param {string} testId - The ID of the test (for validation).
 */
const sendQRCodeEmail = async (toEmail, rollNumber, testName, customMessage = '', testId, venue = 'N/A') => {
    try {
        // 1. Generate QR Code as Data URL (JSON encoded)
        // We encode both testId and rollNumber to ensure the QR is unique to this test
        const qrData = JSON.stringify({ testId, rollNumber });
        const qrCodeDataUrl = await QRCode.toDataURL(qrData);

        // 2. Define Email Options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: toEmail,
            subject: `Test Access: ${testName} - ${rollNumber}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007bff; text-align: center;">${testName} Access</h2>
                    <p>Dear Student,</p>
                    <p>Here is your unique QR code for attendance. Please present this code at the venue to mark your attendance.</p>
                    
                    <div style="text-align: center; margin: 20px 0;">
                        <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 200px; height: 200px;" />
                        <p style="font-weight: bold; font-size: 1.2em;">${rollNumber}</p>
                    </div>

                    <div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #166534; margin: 20px 0;">
                        <p style="margin: 0; font-size: 1.1em;"><strong>Venue:</strong> ${venue}</p>
                    </div>

                    ${customMessage ? `<div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px;"><strong>Note:</strong> ${customMessage}</div>` : ''}

                    <p>Good luck!</p>
                    <hr />
                    <p style="font-size: 0.8em; color: #777; text-align: center;">Placement Test Management System</p>
                </div>
            `,
            attachments: [
                {
                    filename: 'qrcode.png',
                    content: qrCodeDataUrl.split("base64,")[1],
                    encoding: 'base64'
                }
            ]
        };

        // 3. Send Email
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${toEmail}: ${info.response}`);
        return true;
    } catch (error) {
        console.error(`Error sending email to ${toEmail}:`, error);
        return false;
    }
};

/**
 * Sends an email notification about venue update.
 * @param {string} toEmail - Recipient's email address.
 * @param {string} studentName - Student's name.
 * @param {string} testName - Name of the test.
 * @param {string} newVenue - The new venue assigned.
 */
const sendVenueUpdateEmail = async (toEmail, studentName, testName, newVenue) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: toEmail,
            subject: `Venue Update: ${testName}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007bff; text-align: center;">Venue Update Notification</h2>
                    <p>Dear ${studentName},</p>
                    <p>Your venue for the test <strong>${testName}</strong> has been updated.</p>
                    
                    <div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #166534; margin: 20px 0;">
                        <p style="margin: 0; font-size: 1.1em;"><strong>New Venue:</strong> ${newVenue}</p>
                    </div>

                    <p>Please report to the new venue for your test.</p>
                    <p>Good luck!</p>
                    <hr />
                    <p style="font-size: 0.8em; color: #777; text-align: center;">Placement Test Management System</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Venue update email sent to ${toEmail}: ${info.response}`);
        return true;
    } catch (error) {
        console.error(`Error sending venue update email to ${toEmail}:`, error);
        return false;
    }
};

/**
 * Sends a welcome email to a new admin with login credentials.
 * @param {string} toEmail - Recipient's email address.
 * @param {string} username - The username.
 * @param {string} password - The password.
 */
const sendAdminWelcomeEmail = async (toEmail, username, password) => {
    try {
        const loginLink = 'http://localhost:3000/login'; // Adjust for production if needed, or make dynamic

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: toEmail,
            subject: 'Welcome to Placement Test Management System',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007bff; text-align: center;">Welcome, Admin!</h2>
                    <p>You have been added as an administrator to the Placement Test Management System.</p>
                    
                    <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
                        <p style="margin: 0; font-size: 1.1em;"><strong>Username:</strong> ${username}</p>
                        <p style="margin: 0; font-size: 1.1em;"><strong>Password:</strong> ${password}</p>
                    </div>

                    <p>Please login and change your password immediately.</p>
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="${loginLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a>
                    </div>
                    <hr />
                    <p style="font-size: 0.8em; color: #777; text-align: center;">Placement Test Management System</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Admin welcome email sent to ${toEmail}: ${info.response}`);
        return true;
    } catch (error) {
        console.error(`Error sending admin welcome email to ${toEmail}:`, error);
        return false;
    }
};

module.exports = { sendQRCodeEmail, sendVenueUpdateEmail, sendAdminWelcomeEmail };

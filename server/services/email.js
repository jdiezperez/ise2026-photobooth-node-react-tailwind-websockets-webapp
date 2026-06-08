const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Send an email with the generated photo attachment using Brevo API
 * @param {string} recipientEmail - User's email
 * @param {string} recipientName - User's name
 * @param {string} photoUrl - URL of the image file
 * @returns {Promise<boolean>} - True if successful
 */
async function sendPhotoEmail(recipientEmail, recipientName, photoUrl) {
    try {
        const apiKey = process.env.BREVO_API_KEY;
        const senderEmail = process.env.BREVO_SENDER_EMAIL || 'photobooth@example.com';
        const senderName = process.env.BREVO_SENDER_NAME || 'Photo Wizard';

        console.log(`[Email] Debug: API Key starts with: ${apiKey ? apiKey.substring(0, 10) : 'undefined'}`);

        if (!apiKey) {
            console.error('[Email] BREVO_API_KEY is missing in .env');
            return false;
        }

        if (!photoUrl) {
            console.error(`[Email] Photo URL is missing`);
            return false;
        }

        const emailData = {
            sender: { name: senderName, email: senderEmail },
            to: [{ email: recipientEmail, name: recipientName }],
            subject: 'Your photo from Framemov at ISE 2026',
            templateId: 1,
            params: {
                name: recipientName,
                imageUrl: photoUrl
            }
        };

        const response = await axios.post(BREVO_API_URL, emailData, {
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            }
        });

        console.log(`[Email] Sent successfully to ${recipientEmail}. Message ID: ${response.data.messageId}`);
        return true;

    } catch (error) {
        console.error('[Email] Failed to send email:', error.response ? error.response.data : error.message);
        return false;
    }
}

module.exports = {
    sendPhotoEmail
};

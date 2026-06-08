const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs-extra');

const storage = new Storage({
    keyFilename: process.env.GCS_KEY_FILE, // Path to your service account key file
});

const bucketName = process.env.GCS_BUCKET_NAME;

async function uploadToGCS(filePath, destination) {
    try {
        if (!bucketName) {
            console.warn('[GCS] bucketName not set, skipping upload (Check .env)');
            return null;
        }

        console.log(`[GCS] Uploading ${filePath} to ${destination}...`);

        await storage.bucket(bucketName).upload(filePath, {
            destination: destination,
            // public: true, // Removed due to Uniform Bucket-Level Access
            metadata: {
                cacheControl: 'public, max-age=31536000',
            },
        });

        const publicUrl = `https://storage.googleapis.com/${bucketName}/${destination}`;
        console.log(`[GCS] Upload successful: ${publicUrl}`);
        return publicUrl;
    } catch (error) {
        console.error('[GCS] Error uploading to GCS:', error);
        return null;
    }
}

async function saveLocal(base64Data, filename) {
    try {
        const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const filePath = path.join(__dirname, '../uploads', filename);
        await fs.outputFile(filePath, buffer);
        return filePath;
    } catch (error) {
        console.error('Error saving local file:', error);
        throw error;
    }
}

module.exports = { uploadToGCS, saveLocal };

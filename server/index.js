require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const fs = require('fs-extra');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');
const db = require('./database');
const { saveLocal, uploadToGCS } = require('./services/storage');

const { generateMasterpiece } = require('./services/ai');


const emailService = require('./services/email');
const sharp = require('sharp');
const os = require('os');

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const HOST_IP = process.env.HOST_IP || getLocalIP();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 1e8, // 100MB for base64 images
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PHOTOBOOTH_PORT || 3001;

// Keep track of current session state
let currentSession = {
    background: null,
    atmosphere: null,
    palette: null,
    light: null,
    capturedPhotoPath: null,
    generatedPhotoUrl: null
};

// Helper to log to DB
function logAction(action, details = '') {
    const stmt = db.prepare("INSERT INTO log (action, details) VALUES (?, ?)");
    stmt.run(action, JSON.stringify(details));
    stmt.finalize();
    console.log(`Action: ${action}, Details: ${JSON.stringify(details)}`);
}

io.on('connection', (socket) => {
    console.log('a user connected');
    logAction('connection', { socketId: socket.id });


    socket.on('start', () => {
        currentSession = { background: null, atmosphere: null, palette: null, light: null, capturedPhotoPath: null };
        io.emit('start');
        logAction('start');
    });

    socket.on('background', (id) => {
        currentSession.background = id;
        io.emit('background', id); // "background X"
        logAction('background', { id });
    });

    socket.on('atmosphere', (id) => {
        currentSession.atmosphere = id;
        io.emit('atmosphere', id);
        logAction('atmosphere', { id });
    });

    socket.on('palette', (id) => {
        currentSession.palette = id;
        io.emit('palette', id);
        logAction('palette', { id });
    });

    socket.on('light', (id) => {
        currentSession.light = id;
        io.emit('light', id);
        logAction('light', { id });
    });

    socket.on('takephoto', () => {
        io.emit('takephoto');
        logAction('takephoto');
    });

    socket.on('retake', () => {
        currentSession.capturedPhotoPath = null;
        io.emit('retake');
        logAction('retake');
    });

    socket.on('photo_captured', async (base64) => {
        try {
            // Convert base64 to buffer
            const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');

            // Rotate -90 degrees (270 degrees)
            const rotatedBuffer = await sharp(buffer).rotate(270).toBuffer();

            // Log dimensions for debugging
            const metadata = await sharp(rotatedBuffer).metadata();
            console.log(`[Server] Photo dimensions: ${metadata.width}x${metadata.height}`);

            // Convert back to base64 so saveLocal logic remains consistent 
            const rotatedBase64 = `data:image/jpeg;base64,${rotatedBuffer.toString('base64')}`;

            const filename = `photo_${Date.now()}.jpg`;
            const filePath = await saveLocal(rotatedBase64, filename);
            currentSession.capturedPhotoPath = filePath;
            console.log('Photo saved (rotated) to:', filePath);

            io.emit('photo_saved'); // Notify all clients (especially client_ui)
            logAction('photo_captured', { filename });

        } catch (error) {
            console.error('Error saving captured photo:', error);
        }
    });

    // --- Email Handling ---
    socket.on('send_email', async (data) => {
        console.log('[Socket] Send email requested:', data);
        const { email, name, company } = data;

        if (!currentSession.generatedPhotoPath) {
            console.error('[Socket] No generated photo to send!');
            socket.emit('email_error', 'No photo available to send.');
            return;
        }

        // Notify client sending started
        socket.emit('sending_email');
        logAction('send_email', { email, name, company });

        // Save to clients table
        // Save to clients table
        const photoLink = currentSession.generatedPhotoUrl || `http://${HOST_IP}:3001/uploads/${path.basename(currentSession.generatedPhotoPath)}`;

        try {
            const stmt = db.prepare("INSERT INTO clients (name, company, email, photo_link) VALUES (?, ?, ?, ?)");
            stmt.run(name, company, email, photoLink);
            stmt.finalize();
            console.log(`[DB] Client saved: ${name} (${company})`);
        } catch (dbErr) {
            console.error('[DB] Error saving to clients table:', dbErr);
        }

        const success = await emailService.sendPhotoEmail(email, name || 'Guest', photoLink);

        if (success) {
            socket.emit('email_sent');
            console.log(`[Socket] Email sent to ${email}`);
        } else {
            socket.emit('email_error', 'Failed to send email. Please try again.');
        }
    });

    // Load prompts (fail-safe)
    let prompts = {};
    try {
        prompts = require('./data/prompts.json');
    } catch (e) {
        console.error("Warning: Failed to load prompts.json", e);
    }

    let isGenerating = false;

    socket.on('generating', async () => {
        if (isGenerating) {
            console.log('[Gen] Generation already in progress, skipping request.');
            return;
        }
        isGenerating = true;

        logAction('generating');
        io.emit('generating'); // Notify everyone that we are generating

        try {
            const { background, atmosphere, palette, light, capturedPhotoPath } = currentSession;

            if (!capturedPhotoPath) {
                console.error("ERROR: capturedPhotoPath is missing. Aborting generation.");
                io.emit('error', 'Internal Error: Photo not found');
                return;
            }

            const bgKey = `background${background}_atmosphere${atmosphere}_light${light}`;
            const bgName = `bg_${bgKey}.png`;

            // Construct Paths
            const bgPath = path.resolve(__dirname, '../client_screen/public/assets/images', bgName);

            // Get Prompt
            const basePrompt = prompts[bgKey] || prompts['default'] || "Artistic portrait.";
            //const fullPrompt = `Add the person in the second image to the background in the first image. The background is ${basePrompt}. create a good photographic composition.`;
            //const fullPrompt = `Add the person in the second image to the background in the first image. Create a good photographic composition.`;
            const fullPrompt = 'Add the person in the second image to the background environment in the first image, maintaining space’s atmosphere and lighting atmosphere. Use the person exactly as seen in the second image — preserve face, pose, and outfit fully. Adjust perspective and framing of the composition slightly to create a more photogenic composition. Modify only environment lighting, reflections, and depth to harmonize realism. Follow the clean and high definition style of the background images and integrate the person within the space with proper scale and realistic integration.';
            //const fullPrompt = "Use the person exactly as seen in the input image — preserve face, pose, and outfit fully, keep the proportions of the person (width and height). Place them on a minimalist and organic interior space with a Mediterranean-Japandi aesthetic. A showroom-like setting, or architectural altar, composed of stepped platforms of light wood and travertine stone with gently rounded edges. Large sculptural wooden volumes float on the ceiling, creating a sense of lightness and contemporary architectural design. Warm natural light enters from a translucent lattice or mesh ceiling, projecting soft shadows and geometric patterns onto the surfaces. A neutral and earthy color palette: beige, sand, honey, light wood, and warm white. Elegantly integrated vegetation: small olive trees, dried branches, hanging plants, and minimalist floral arrangements in soft tones. A serene, luminous, and sophisticated atmosphere, with a sense of calm, natural luxury, and editorial design. Realistic textures of polished wood, porous stone, and matte ceramic. An architectural photography style: ultra-detailed, with soft morning light, moderate depth of field, and a clean, balanced composition. Correct scale and realistic ground shadows.";

            console.log(`--- GENERATION STARTED ---`);
            console.log(`Using Background: ${bgPath}`);
            console.log(`Using Capture: ${capturedPhotoPath}`);

            // 1. Call AI Service
            let resultBase64 = await generateMasterpiece(bgPath, capturedPhotoPath, fullPrompt);

            // Define filenames and paths
            const screenSavedDir = path.join(__dirname, '../client_screen/public/saved_photos');
            const resultFilename = `result_${Date.now()}.jpg`;

            let finalUrl = "";
            if (!resultBase64) {
                console.log('[Gen] Generation failed (No result returned from AI).');
                io.emit('error', 'AI Processing Failed. Please Try Again.');
                return;
            } else {
                // --- LOGO WATERMARK LOGIC ---
                try {
                    console.log('[Gen] Adding logo watermark...');
                    const logoPath = path.resolve(__dirname, '../client_screen/public/assets/logo/logo_framemov.png');
                    const imgBuffer = Buffer.from(resultBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');

                    const metadata = await sharp(imgBuffer).metadata();
                    const logoWidth = Math.round(metadata.width * 0.25);

                    const resizedLogoBuffer = await sharp(logoPath)
                        .resize({ width: logoWidth })
                        .toBuffer();

                    const logoMetadata = await sharp(resizedLogoBuffer).metadata();

                    const left = Math.round((metadata.width - logoMetadata.width) / 2);
                    const top = Math.round(metadata.height * 0.9 - (logoMetadata.height / 2)); // 10% from bottom (multiplier 0.9)

                    const watermarkedBuffer = await sharp(imgBuffer)
                        .composite([{ input: resizedLogoBuffer, top, left }])
                        .toBuffer();

                    resultBase64 = `data:image/jpeg;base64,${watermarkedBuffer.toString('base64')}`;
                    console.log('[Gen] Logo watermark added successfully.');
                } catch (logoError) {
                    console.error('[Gen] Failed to add logo watermark:', logoError);
                }

                // 2. Save result locally (uploads folder)
                const resultPath = await saveLocal(resultBase64, resultFilename);
                currentSession.generatedPhotoPath = resultPath;

                // 3. ALSO Save to client_screen/public/saved_photos for archival/display
                try {
                    const screenPath = path.join(screenSavedDir, resultFilename);
                    const buffer = Buffer.from(resultBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
                    await fs.outputFile(screenPath, buffer);
                    console.log('Extra copy saved to screen path:', screenPath);
                } catch (e) {
                    console.error('Failed to save extra copy to screen path:', e);
                }

                // 4. Upload to GCS
                finalUrl = await uploadToGCS(resultPath, `results/${resultFilename}`);
                if (!finalUrl) {
                    finalUrl = `http://${HOST_IP}:3001/uploads/${resultFilename}`; // Fallback to local
                }
                currentSession.generatedPhotoUrl = finalUrl;
            }

            io.emit('generated', finalUrl);
            logAction('generated', { url: finalUrl });
        } catch (error) {
            console.error('Error during generation process:', error);
            io.emit('error', 'Generation failed');
        } finally {
            isGenerating = false;
        }
    });

    socket.on('generated', (url) => {
        {
            io.emit('generated', url);
            logAction('generated', { url, source: 'external' });
        }
    });

    socket.on('idle', () => {
        io.emit('idle');
        logAction('idle');
    });





    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

server.listen(PORT, () => {
    console.log(`Server running at:`);
    console.log(`- Local:   http://localhost:${PORT}`);
    console.log(`- Network: http://${HOST_IP}:${PORT}`);
});

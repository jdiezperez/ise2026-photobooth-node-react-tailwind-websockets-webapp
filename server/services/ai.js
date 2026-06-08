const fs = require('fs');
const { GoogleGenAI, Modality } = require('@google/genai');

async function generateMasterpiece(backgroundPath, webcamPath, prompt) {
    try {
        console.log(`[AI] Preparing Gemini request...`);
        console.log(` - Background: ${backgroundPath}`);
        console.log(` - Webcam: ${webcamPath}`);

        // Read files
        const bgBuffer = fs.readFileSync(backgroundPath);
        const webcamBuffer = fs.readFileSync(webcamPath);

        // Base64 encoding
        const bgBase64 = bgBuffer.toString('base64');
        const webcamBase64 = webcamBuffer.toString('base64');

        // Initialize Gemini
        // Using the key provided by user or env
        const API_KEY = process.env.NANOBANANA_API_KEY || process.env.NANOBANANA_FALLBACK_KEY;

        if (!API_KEY) {
            throw new Error("API Key not configured.");
        }

        const ai = new GoogleGenAI({ apiKey: API_KEY });

        // Construct Parts
        const bgPart = {
            inlineData: {
                data: bgBase64,
                mimeType: 'image/png', // Backgrounds are PNGs
            },
        };

        const webcamPart = {
            inlineData: {
                data: webcamBase64,
                mimeType: 'image/jpeg', // Captures are JPGs
            },
        };

        const textPart = { text: prompt };

        console.log(`[AI] Sending request to gemini-2.5-flash-image...`);
        console.log(`[AI] Debug: BG detected (${bgBase64 ? bgBase64.length : 0} chars)`);
        console.log(`[AI] Debug: Webcam detected (${webcamBase64 ? webcamBase64.length : 0} chars). Header: ${webcamBase64 ? webcamBase64.substring(0, 50) : 'N/A'}`);

        const response = await ai.models.generateContent({
            //model: 'gemini-2.5-flash-image',
            model: 'gemini-3-pro-image-preview',
            contents: {
                role: 'user',
                parts: [bgPart, webcamPart, textPart], // Send both images + prompt
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
            config: {
                responseModalities: [Modality.IMAGE],
                imageConfig: {
                    aspectRatio: "9:16",
                },
                temperature: 0.4,
            },
        });

        // Parse Response
        if (response && response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];
            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData) {
                        console.log(`[AI] Success! Received generated image.`);
                        return part.inlineData.data; // Base64 string
                    }
                }
            } else {
                console.error('[AI] Candidate has no content or parts:', JSON.stringify(candidate));
            }
        } else {
            console.error('[AI] unexpected response structure:', JSON.stringify(response));
        }

        throw new Error('Gemini API returned no image data.');

    } catch (error) {
        console.error('[AI] Error in Gemini API call:', error);
        // Fallback or rethrow? 
        // If we throw, the index.js catch block handles it and sets a fallback image?
        // Let's return null to let index.js handle the fallback logic.
        return null;
    }
}

module.exports = { generateMasterpiece };

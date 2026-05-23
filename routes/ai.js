const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const router = express.Router();

// The SDK automatically grabs process.env.GEMINI_API_KEY out of thin air
const ai = new GoogleGenAI();

// Endpoint path will be: POST http://localhost:5000/api/ai/generate
router.post('/generate', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'A prompt string is required in the request body.' });
        }

        // Call the super-fast gemini-2.5-flash model
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return res.json({ success: true, text: response.text });

    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ 
            error: 'Failed to generate content from AI.', 
            details: error.message 
        });
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');

const isGenAIConfigured = () => {
    return process.env.GEMINI_API_KEY && 
           process.env.GEMINI_API_KEY.trim() !== '' &&
           process.env.GEMINI_API_KEY !== 'change_me_later';
};

const aiFallbackLogic = (query) => {
    const q = query.toLowerCase();
    let severity = 'Low';
    let ambType = 'BLS';
    let reason = 'Symptoms appear mild. BLS ambulance mapped based on keyword heuristics.';

    if (q.includes('unconscious') || q.includes('heart') || q.includes('chest') || q.includes('bleed') || q.includes('breath') || q.includes('broken')) {
        severity = 'Critical';
        ambType = 'ALS';
        reason = 'Critical keywords detected. Life-threatening condition suspected; dispatching Advanced Life Support immediately.';
    } else if (q.includes('pain') || q.includes('dizzy') || q.includes('faint')) {
        severity = 'Moderate';
        ambType = 'ALS';
        reason = 'Moderate risk indicators. Sending ALS as precaution.';
    }

    return { severity, ambType, reason };
};

router.post('/analyze', async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ status: 'error', error: 'Missing emergency query string.' });
    }

    if (!isGenAIConfigured()) {
        console.log(`[Triage AI] Using MOCK fallback for: "${query}"`);
        
        // Simulate real API latency so the UI loading animation looks natural
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        return res.status(200).json({
            status: 'success',
            mode: 'mock',
            data: aiFallbackLogic(query)
        });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const systemPrompt = `You are a highly trained Emergency Medical Dispatcher AI for EmergiX. Analyze the user's emergency description and classify it strictly into JSON format:
{
  "severity": "Critical" | "Moderate" | "Low",
  "ambType": "ALS" | "BLS",
  "reason": "1-2 short sentences explaining the clinical rationale. If Critical, explain why ALS is needed."
}
Do NOT include markdown block wrappers around the JSON. Only return raw JSON. 
Examples:
User: "Dad clutching chest and extremely sweaty" -> {"severity": "Critical", "ambType": "ALS", "reason": "Patient is exhibiting classic signs of acute myocardial infarction."}`;

        console.log(`[Triage AI] Prompting Gemini for: "${query}"`);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${systemPrompt}\n\nUser: "${query}"`,
        });

        let text = response.text || '';
        // Safely extract just the JSON
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(text);

        res.status(200).json({
            status: 'success',
            mode: 'live',
            data
        });

    } catch (error) {
        console.error('[Triage AI] GenAI API Error:', error);
        
        // Fallback gracefully instead of breaking the app during an emergency!
        return res.status(200).json({
            status: 'success',
            mode: 'fallback_error',
            data: aiFallbackLogic(query)
        });
    }
});

module.exports = router;

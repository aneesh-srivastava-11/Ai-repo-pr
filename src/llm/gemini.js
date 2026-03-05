const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('../config');
const { logger } = require('../utils/logger');

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

/**
 * Uses Gemini to analyze a code diff
 */
async function analyzeDiffWithAI(diffText, filesList) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        const prompt = `
      You are a senior security and backend engineer.
      Analyze the following GitHub Pull Request diff and provide a risk assessment in JSON format.

      Constraints:
      1. Focus on security, architectural integrity, and potential bugs.
      2. Return ONLY a valid JSON object.
      3. JSON schema:
      {
        "riskScore": number (0-10, where 10 is critical risk),
        "summary": "High level summary of the changes",
        "reasons": ["string explanation of risk factors"],
        "reviewChecklist": ["specific items for the human reviewer to check"]
      }

      FILES CHANGED:
      ${filesList.map(f => f.filename).join('\n')}

      DIFF:
      ${diffText.substring(0, 15000)} // Truncated to stay within limits
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON safely
        try {
            // Find the first { and last } to extract JSON if there's markdown fluff
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('No JSON found in response');
        } catch (parseError) {
            logger.error({ text, parseError }, 'Failed to parse Gemini JSON output');
            return {
                riskScore: 5,
                summary: 'AI analysis failed to parse. Manual review required.',
                reasons: ['AI output formatting error'],
                reviewChecklist: ['Perform full manual review'],
            };
        }
    } catch (error) {
        logger.error({ error }, 'Error calling Gemini API');
        throw error;
    }
}

module.exports = {
    analyzeDiffWithAI,
};

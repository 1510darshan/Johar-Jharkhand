const axios = require('axios');
const {
    OPENAI_API_KEY,
    OPENAI_API_BASE,
    MODEL_ID,
    SYSTEM_PROMPT,
    MAX_TOKENS,
    TEMPERATURE,
    FALLBACK_MESSAGE_BUSY,
    FALLBACK_MESSAGE_UNAVAILABLE
} = require('../config/config');

class LLMError extends Error {
    constructor(message) {
        super(message);
        this.name = 'LLMError';
    }
}

async function callLLM(prompt, maxTokens = MAX_TOKENS, temperature = TEMPERATURE) {
    /**
     * Calls the LLM API with the given prompt.
     * Throws LLMError if request fails.
     */
    const url = `${OPENAI_API_BASE}/chat/completions`;
    const headers = {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
    };
    
    const payload = {
        model: MODEL_ID,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens
    };

    try {
        const response = await axios.post(url, payload, {
            headers: headers,
            timeout: 60000
        });
        
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        if (error.response) {
            // HTTP error response
            if (error.response.status === 429) {
                throw new LLMError(FALLBACK_MESSAGE_BUSY);
            }
            throw new LLMError(`HTTP error: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
            // Request timeout or network error
            throw new LLMError(FALLBACK_MESSAGE_UNAVAILABLE);
        } else if (error.code === 'ECONNABORTED') {
            // Timeout error
            throw new LLMError(FALLBACK_MESSAGE_UNAVAILABLE);
        } else {
            // Unexpected response format or other error
            throw new LLMError(`Unexpected error: ${error.message}`);
        }
    }
}

async function getAnswer(query) {
    /**
     * Returns a clean, bot-like answer.
     * Uses fallback messages if LLM fails.
     */
    const prompt = `User question: ${query}`;
    
    try {
        return await callLLM(prompt);
    } catch (error) {
        if (error instanceof LLMError) {
            // Log for debugging
            console.log('LLM Error:', error.message);
            return error.message;
        } else {
            // Unexpected error
            console.error('Unexpected error:', error);
            return FALLBACK_MESSAGE_UNAVAILABLE;
        }
    }
}

module.exports = {
    LLMError,
    callLLM,
    getAnswer
};
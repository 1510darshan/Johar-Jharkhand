require('dotenv').config();

// -----------------------------
// Groq / OpenRouter API config
// -----------------------------
// Ideally, store your API key in .env file
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_BASE = "https://api.groq.com/openai/v1";

// Compatibility with OpenAI-style code
const OPENAI_API_KEY = GROQ_API_KEY;
const OPENAI_API_BASE = GROQ_API_BASE;

// -----------------------------
// Model settings
// -----------------------------
const MODEL_ID = "openai/gpt-oss-20b";
const MAX_TOKENS = 512;
const TEMPERATURE = 0.7;

// -----------------------------
// RAG / Retrieval settings (optional)
// -----------------------------
const MIN_SIMILARITY = 0.70;
const TOP_K = 3;

// -----------------------------
// System prompt & fallback
// -----------------------------
const SYSTEM_PROMPT = `
You are a professional AI assistant specialized ONLY in Jharkhand's culture, tourism, and eco-tourism.
Rules for answering:

- Keep responses short, sweet, and engaging (1-3 sentences max).
- Avoid *, #, -- or raw markdown.
- Include emojis when appropriate.
- If the user asks anything unrelated to Jharkhand, respond with:
  "Sorry, I cannot answer that directly, but Jharkhand has amazing cultural sites, waterfalls, and forests! 🌿🏞️"
- Respond in a conversational, human-like style.
- Use proper formatting with short paragraphs.
`;

const FALLBACK_MESSAGE_BUSY = "⚠️ Sorry, the server is busy due to too many requests. Please wait a few seconds and try again.";
const FALLBACK_MESSAGE_UNAVAILABLE = "⚠️ Sorry, the AI service is temporarily unavailable. Please try again later.";

module.exports = {
    GROQ_API_KEY,
    GROQ_API_BASE,
    OPENAI_API_KEY,
    OPENAI_API_BASE,
    MODEL_ID,
    MAX_TOKENS,
    TEMPERATURE,
    MIN_SIMILARITY,
    TOP_K,
    SYSTEM_PROMPT,
    FALLBACK_MESSAGE_BUSY,
    FALLBACK_MESSAGE_UNAVAILABLE
};
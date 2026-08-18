/**
 * The one place the model name lives.
 *
 * Groq retires model ids without warning — llama-3.3-70b-versatile vanished
 * from the account and both the trip planner and the venue suggester started
 * failing silently, one falling back to alphabetical order and the other to a
 * 500. Keeping the id here means a retirement is a one-line fix, and
 * GROQ_MODEL can override it without a deploy.
 *
 * Note: Groq requires the word "json" to appear in the prompt when using
 * response_format json_object. Every caller here already asks for JSON by name.
 */
const CHAT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

module.exports = { CHAT_MODEL };

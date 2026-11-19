/**
 * Runtime API key configuration for ASTRALENA AI.
 *
 * Keys are intentionally read from environment variables so credentials are
 * never committed to source control. Configure GROQ_API_KEY and/or
 * OPENROUTER_API_KEY in the deployment environment or through the bot's
 * owner-only variable management command.
 */
module.exports = {
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
};

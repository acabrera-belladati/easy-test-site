import express from "express";

export const elevenLabsRouter = express.Router();

elevenLabsRouter.get("/api/elevenlabs/token", async (req, res, next) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    if (!apiKey || !agentId) {
      return res.status(503).json({
        message: "ElevenLabs is not configured",
        configured: false
      });
    }

    const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/token");
    url.searchParams.set("agent_id", agentId);
    if (process.env.ELEVENLABS_ENVIRONMENT) url.searchParams.set("environment", process.env.ELEVENLABS_ENVIRONMENT);

    const response = await fetch(url, {
      headers: { "xi-api-key": apiKey }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({
        message: "Failed to obtain ElevenLabs conversation token",
        details: payload
      });
    }
    res.json({
      token: payload.token,
      conversationId: payload.conversation_id,
      configured: true
    });
  } catch (error) {
    next(error);
  }
});

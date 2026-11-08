require("dotenv").config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const OpenAI = require("openai");
const { getAUStatus, createImprovementReport } = require("./au");

const app = express();
const PORT = process.env.PORT || 3000;
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "12mb" }));
app.use(express.static(path.join(__dirname, "public")));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." }
});
app.use("/api/", apiLimiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 }
});

function requireOpenAI(req, res, next) {
  if (!openai) {
    return res.status(503).json({
      error: "The AI service is not configured yet. Add OPENAI_API_KEY to your hosting environment variables."
    });
  }
  next();
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "TALK AI",
    aiConfigured: Boolean(openai),
    au: getAUStatus()
  });
});

app.post("/api/chat", requireOpenAI, upload.single("file"), async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();
    const history = JSON.parse(req.body.history || "[]");

    if (!message && !req.file) {
      return res.status(400).json({ error: "Write a message or attach a file." });
    }
    if (!Array.isArray(history)) {
      return res.status(400).json({ error: "Chat history format is invalid." });
    }

    const input = [];
    for (const item of history.slice(-12)) {
      if (!item || !["user", "assistant"].includes(item.role)) continue;
      if (typeof item.content !== "string") continue;
      input.push({ role: item.role, content: item.content.slice(0, 6000) });
    }

    const userContent = [];
    if (message) userContent.push({ type: "input_text", text: message });

    if (req.file) {
      const mime = req.file.mimetype || "";
      const isImage = mime.startsWith("image/");
      const isText = mime.startsWith("text/") ||
        ["application/json", "application/javascript"].includes(mime);

      if (isImage) {
        const dataUrl = `data:${mime};base64,${req.file.buffer.toString("base64")}`;
        userContent.push({ type: "input_image", image_url: dataUrl });
      } else if (isText) {
        const text = req.file.buffer.toString("utf8").slice(0, 20000);
        userContent.push({
          type: "input_text",
          text: `Attached file: ${req.file.originalname}\n\n${text}`
        });
      } else {
        return res.status(415).json({
          error: "This version supports image and text-based attachments. Try PNG, JPG, WEBP, TXT, JSON, or JS."
        });
      }
    }

    input.push({ role: "user", content: userContent });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions:
        "You are TALK AI, a helpful, clear, safe assistant. Explain learning topics step by step, support understanding rather than cheating, and be honest about uncertainty. Keep answers appropriate for a broad audience.",
      input,
      ...(req.body.webSearch === "true" ? { tools: [{ type: "web_search_preview" }] } : {})
    });

    res.json({ reply: response.output_text || "I couldn't create a text response. Please try again." });
  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(500).json({ error: "TALK AI couldn't answer right now. Please try again." });
  }
});

app.post("/api/image", requireOpenAI, async (req, res) => {
  try {
    const prompt = String(req.body.prompt || "").trim();
    if (!prompt) return res.status(400).json({ error: "Describe the image you want." });

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt: prompt.slice(0, 2000),
      size: "1024x1024"
    });

    const image = result.data && result.data[0] && result.data[0].b64_json;
    if (!image) throw new Error("No image returned");
    res.json({ image: `data:image/png;base64,${image}` });
  } catch (error) {
    console.error("Image error:", error.message);
    res.status(500).json({ error: "Image creation failed. Check API access and try again." });
  }
});

app.get("/api/au/status", (req, res) => {
  res.json(getAUStatus());
});

app.post("/api/au/report", (req, res) => {
  const details = String(req.body.details || "").trim().slice(0, 1500);
  if (!details) return res.status(400).json({ error: "Describe the issue or improvement." });
  res.json(createImprovementReport(details));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`TALK AI running on port ${PORT}`);
});

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const systemInstruction = fs
  .readFileSync(path.join(__dirname, "system-instruction.txt"), "utf8")
  .trim();

const app = express();
const port = Number(process.env.PORT) || 3000;
const apiKey = process.env.GEMINI_API_KEY;

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_HISTORY_ITEMS = 12;

app.use(express.json({ limit: "8mb" }));
app.use(express.static("public"));

let genAI = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

// Status derived purely from chat results — zero extra RPD wasted on probes.
let aiStatusCache = {
  state: genAI ? "active" : "inactive",
  checkedAt: Date.now(),
  detail: genAI ? "API key terkonfigurasi" : "GEMINI_API_KEY belum diatur"
};

function setStatusFromChatResult(success, errorMsg) {
  const raw = errorMsg || "";
  aiStatusCache = {
    state: success ? "active" : (/429|quota|rate/i.test(raw) ? "busy" : "inactive"),
    checkedAt: Date.now(),
    detail: success ? "Permintaan terakhir berhasil" : (raw || "Permintaan terakhir gagal")
  };
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "DapurAI" });
});

app.get("/api/status", (req, res) => {
  res.json({
    ok: true,
    service: "DapurAI",
    aiReady: aiStatusCache.state === "active",
    state: aiStatusCache.state,
    checkedAt: aiStatusCache.checkedAt,
    detail: aiStatusCache.detail
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({
        error: "Konfigurasi server belum lengkap. GEMINI_API_KEY belum diatur."
      });
    }

    const { message, history, image } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Pesan tidak boleh kosong."
      });
    }

    if (history && !Array.isArray(history)) {
      return res.status(400).json({
        error: "Format history tidak valid."
      });
    }

    let imagePart = null;
    if (image) {
      if (
        typeof image !== "object" ||
        typeof image.data !== "string" ||
        typeof image.mimeType !== "string"
      ) {
        return res.status(400).json({
          error: "Format gambar tidak valid."
        });
      }

      const imageSize = Buffer.byteLength(image.data, "base64");
      if (imageSize > MAX_IMAGE_BYTES) {
        return res.status(413).json({
          error: "Ukuran gambar terlalu besar. Maksimal 2MB."
        });
      }

      imagePart = {
        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }
      };
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40
      }
    });

    const safeHistory = Array.isArray(history)
      ? history
          .filter((item) => item && (item.role === "user" || item.role === "model"))
          .slice(-MAX_HISTORY_ITEMS)
          .map((item) => {
            const text = typeof item.text === "string" ? item.text : "";
            return {
              role: item.role,
              parts: [{ text }]
            };
          })
      : [];

    const userParts = [{ text: message.trim() }];
    if (imagePart) {
      userParts.push(imagePart);
    }

    const result = await model.generateContent({
      contents: [...safeHistory, { role: "user", parts: userParts }]
    });

    const reply = result.response.text();
    setStatusFromChatResult(true, null);

    return res.json({
      reply,
      disclaimer: "Saran masak ini bersifat edukasi, perhatikan alergi Anda."
    });
  } catch (error) {
    const raw = error && error.message ? error.message : "Unknown error";

    setStatusFromChatResult(false, raw);

    if (/429|quota|rate/i.test(raw)) {
      return res.status(429).json({
        error: "Layanan sedang sibuk. Coba lagi sebentar ya."
      });
    }

    return res.status(500).json({
      error: "Terjadi masalah saat menghubungi Chef AI. Coba lagi.",
      detail: raw
    });
  }
});

app.listen(port, () => {
  console.log(`DapurAI running at http://localhost:${port}`);
});

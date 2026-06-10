import express from "express";
import { createServer } from "http";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { DeepgramClient } from "@deepgram/sdk";
import Groq from "groq-sdk";
import routes from "./routes/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.static(join(__dirname, "public")));
app.use("/api", routes);

// ── WebSocket ──────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", async (ws, req) => {
  console.log("[ws] client connected from", req.socket.remoteAddress);

  const groq = new Groq(); // reads GROQ_API_KEY from env

  let dgConnection = null;
  let fullTranscript = "";
  let speechFinalBuffer = "";

  function send(obj) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
  }

  async function openDeepgram() {
    const client = new DeepgramClient(); // reads DEEPGRAM_API_KEY from env

    dgConnection = await client.listen.v1.connect({
      model: "nova-3",
      language: "en",
      punctuate: "true",
      interim_results: "true",
      smart_format: "true",
      vad_events: "true",
      utterance_end_ms: "1500",
    });

    dgConnection.on("open", () => {
      console.log("[deepgram] connection open");
      send({ type: "ready", message: "Listening…" });
      dgConnection.connect();
    });

    dgConnection.on("message", async (data) => {
      if (data.type !== "Results") return;

      const alt = data.channel?.alternatives?.[0];
      const text = alt?.transcript ?? "";
      if (!text) return;

      send({ type: "transcript", text, is_final: data.is_final });

      if (data.is_final) {
        speechFinalBuffer += (speechFinalBuffer ? " " : "") + text;
        fullTranscript += (fullTranscript ? " " : "") + text;
      }

      // On speech_final, request a coaching tip for the last utterance
      if (data.speech_final && speechFinalBuffer.trim()) {
        const utterance = speechFinalBuffer.trim();
        speechFinalBuffer = "";
        send({ type: "coaching_loading" });
        try {
          const tip = await getCoachingTip(utterance);
          send({ type: "coaching", tip });
        } catch (err) {
          console.error("[groq] error:", err.message);
          send({ type: "coaching_error", message: err.message });
        }
      }
    });

    dgConnection.on("error", (err) => {
      console.error("[deepgram] error:", err);
      send({ type: "error", message: String(err) });
    });

    dgConnection.on("close", () => {
      console.log("[deepgram] connection closed");
      dgConnection = null;
    });

    await dgConnection.waitForOpen();
  }

  ws.on("message", async (data, isBinary) => {
    if (isBinary) {
      if (dgConnection) dgConnection.socket.send(data);
      return;
    }

    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }

    if (msg.type === "start") {
      fullTranscript = "";
      speechFinalBuffer = "";
      try {
        await openDeepgram();
      } catch (err) {
        console.error("[deepgram] failed to open:", err.message);
        send({ type: "error", message: "Could not connect to Deepgram: " + err.message });
      }
    } else if (msg.type === "stop") {
      if (dgConnection) {
        dgConnection.socket.close();
        dgConnection = null;
      }
      send({ type: "stopped", transcript: fullTranscript });
    } else if (msg.type === "get_feedback") {
      if (fullTranscript.trim()) {
        try {
          send({ type: "coaching_loading" });
          const tip = await getCoachingTip(fullTranscript);
          send({ type: "coaching", tip });
        } catch (err) {
          send({ type: "coaching_error", message: err.message });
        }
      }
    }
  });

  ws.on("close", () => {
    console.log("[ws] client disconnected");
    if (dgConnection) { dgConnection.socket.close(); dgConnection = null; }
  });

  async function getCoachingTip(transcript) {
    const chat = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content: `You are a real-time sales co-pilot on a live sales call. Read the transcript and give the sales rep ONE short confident line they can say right now to move the conversation forward. 

Rules:
- Maximum 2 sentences. Never more.
- Sound natural, never scripted
- Never say "you should" or "try saying" — just give the line
- No labels, no preamble, no explanation
- If objection: reframe around value not price
- If silence or stalling: give a soft pull question  
- If buying signal: give a gentle close line
- Output the suggestion text only`,
        },
        {
          role: "user",
          content: `Sales rep said: "${transcript}"\n\nGive one specific coaching tip.`,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    return chat.choices[0]?.message?.content ?? "No tip available.";
  }
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`sales-coach-ai listening on port ${PORT}`);
});

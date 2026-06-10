# Sales Coach AI

Real-time sales co-pilot using Deepgram (nova-3) for live transcription and Groq (llama3-8b) for instant coaching tips delivered via WebSocket.

## Stack
- Node.js + Express + WebSocket (ws)
- Deepgram SDK v5 — live speech-to-text (nova-3 model)
- Groq SDK — LLM coaching inference (llama3-8b-8192)

## Run
```bash
npm install
node server.js
```

## Required env vars
- `DEEPGRAM_API_KEY`
- `GROQ_API_KEY`
- `PORT` (optional, defaults to 3000)

## How it works
1. Browser captures mic audio via MediaRecorder
2. Audio chunks stream over WebSocket to Node server
3. Server pipes audio to Deepgram for live transcription
4. On each speech-final event, transcript is sent to Groq
5. Groq returns a one-line coaching tip shown instantly in the UI

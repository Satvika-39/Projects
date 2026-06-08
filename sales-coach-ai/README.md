# Sales Coach AI

A real-time sales call co-pilot. The browser streams microphone audio to an
Express/WebSocket server, which forwards it to Deepgram for live
transcription and periodically asks Groq (Llama 3 70B) for a short, natural
suggestion the rep can say next — all rendered in a mobile-first dark UI.

## Setup

```bash
cd sales-coach-ai
npm install
cp .env.example .env   # then fill in your API keys
npm start
```

Open http://localhost:8080, tap **Start Session**, and grant microphone access.

## How it works

1. The browser opens a WebSocket to `/ws` and streams 16kHz mono PCM16 audio
   captured via an `AudioWorklet`.
2. The server forwards the audio to Deepgram's streaming `listen` endpoint
   (via `@deepgram/sdk`) and relays transcripts back as
   `{ "type": "transcript", text, isFinal }`.
3. Final transcript text accumulates server-side. Every 10 seconds, the
   accumulated text is sent to Groq (`llama3-70b-8192`) along with the system
   prompt in `prompts/coach.js`. The streamed completion is relayed back as
   `{ "type": "suggestion", text, done }`.
4. The UI shows the live suggestion in a glass card (top 60%) and a scrolling
   transcript feed below (bottom 40%), with a smooth fade when suggestions
   update.

## Project structure

```
sales-coach-ai/
├── server.js           Express + WebSocket server, Deepgram + Groq wiring
├── routes/             REST scaffolding for reps, calls, and coaching data
├── prompts/coach.js    System prompt for the Groq sales co-pilot
├── public/index.html   Mobile-first dark UI (start → live → summary)
├── .env.example        Required environment variables
└── package.json
```

## Environment variables

Copy `.env.example` to `.env` and set:

- `DEEPGRAM_API_KEY` — your Deepgram API key (for live transcription)
- `GROQ_API_KEY` — your Groq API key (for real-time suggestions)
- `PORT` — port to listen on, defaults to `8080`

# sell-me

Real-time microphone transcription. The browser captures mic audio, streams raw
PCM16 chunks to an Express/WebSocket server, which forwards them to Deepgram's
streaming speech-to-text API and relays transcripts back in real time.

## Setup

```bash
cd sell-me
npm install
export DEEPGRAM_API_KEY=your_deepgram_api_key
npm start
```

Then open http://localhost:3000 and click **Start listening**.

## How it works

1. The browser opens a WebSocket to `/ws` and captures microphone audio with
   the Web Audio API, downsampling to 16kHz mono PCM16 via an `AudioWorklet`.
2. Each PCM chunk is sent over the WebSocket as a binary message.
3. The server opens its own WebSocket connection to Deepgram's streaming
   `listen` endpoint (authenticated with `DEEPGRAM_API_KEY`) and pipes the
   audio chunks through.
4. Deepgram streams back interim and final transcripts as JSON; the server
   relays the transcript text to the browser, which renders it live.

## Environment variables

- `DEEPGRAM_API_KEY` (required) — your Deepgram API key.
- `PORT` (optional) — port to listen on, defaults to `3000`.

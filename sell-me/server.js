const path = require('path');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const DEEPGRAM_URL =
  'wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&interim_results=true&smart_format=true';

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(PORT, () => {
  console.log(`sell-me server listening on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (browserSocket) => {
  console.log('Browser connected');

  if (!DEEPGRAM_API_KEY) {
    browserSocket.send(JSON.stringify({ error: 'DEEPGRAM_API_KEY is not set on the server' }));
    browserSocket.close();
    return;
  }

  const deepgramSocket = new WebSocket(DEEPGRAM_URL, {
    headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` },
  });

  // Buffer audio chunks that arrive before Deepgram's connection is open.
  const pendingChunks = [];

  deepgramSocket.on('open', () => {
    console.log('Connected to Deepgram');
    for (const chunk of pendingChunks) {
      deepgramSocket.send(chunk);
    }
    pendingChunks.length = 0;
  });

  deepgramSocket.on('message', (data) => {
    let parsed;
    try {
      parsed = JSON.parse(data.toString());
    } catch (err) {
      return;
    }

    const transcript = parsed?.channel?.alternatives?.[0]?.transcript;
    if (!transcript) return;

    if (browserSocket.readyState === WebSocket.OPEN) {
      browserSocket.send(
        JSON.stringify({
          transcript,
          isFinal: Boolean(parsed.is_final),
          speechFinal: Boolean(parsed.speech_final),
        })
      );
    }
  });

  deepgramSocket.on('error', (err) => {
    console.error('Deepgram socket error:', err.message);
    if (browserSocket.readyState === WebSocket.OPEN) {
      browserSocket.send(JSON.stringify({ error: 'Deepgram connection error' }));
    }
  });

  deepgramSocket.on('close', () => {
    console.log('Deepgram connection closed');
    if (browserSocket.readyState === WebSocket.OPEN) {
      browserSocket.close();
    }
  });

  browserSocket.on('message', (data, isBinary) => {
    if (!isBinary) return; // ignore non-audio control messages
    if (deepgramSocket.readyState === WebSocket.OPEN) {
      deepgramSocket.send(data);
    } else if (deepgramSocket.readyState === WebSocket.CONNECTING) {
      pendingChunks.push(data);
    }
  });

  browserSocket.on('close', () => {
    console.log('Browser disconnected');
    if (deepgramSocket.readyState === WebSocket.OPEN || deepgramSocket.readyState === WebSocket.CONNECTING) {
      deepgramSocket.close();
    }
  });

  browserSocket.on('error', (err) => {
    console.error('Browser socket error:', err.message);
  });
});

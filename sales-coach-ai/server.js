import 'dotenv/config';

console.log('GROQ key present:', !!process.env.GROQ_API_KEY);

import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import Groq from 'groq-sdk';

import { COACH_PROMPT } from './prompts/coach.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('Client connected');

  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const dgConnection = deepgram.listen.live({
    model: 'nova-3',
    language: 'en',
    encoding: 'linear16',
    sample_rate: 16000,
    channels: 1,
    interim_results: true,
    punctuate: true,
  });

  function send(obj) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }

  async function getGroqSuggestion(transcript) {
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 100,
        temperature: 0.7,
        messages: [
          { role: 'system', content: COACH_PROMPT },
          { role: 'user', content: transcript },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? '';
      send({ type: 'suggestion', text });
    } catch (err) {
      console.error('Groq error:', err.status, err.message, err.error ?? '');
    }
  }

  dgConnection.on(LiveTranscriptionEvents.Open, () => {
    console.log('Deepgram connected');
    send({ type: 'status', text: 'Ready' });
  });

  dgConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const transcript = data.channel.alternatives[0].transcript;
    const isFinal = data.is_final;
    const speechFinal = data.speech_final;

    if (!transcript || transcript.trim() === '') return;

    send({ type: 'transcript', text: transcript, is_final: isFinal });

    if (speechFinal) {
      console.log('speech_final fired:', transcript);
      getGroqSuggestion(transcript);
    }
  });

  dgConnection.on(LiveTranscriptionEvents.Error, (err) => {
    console.error('Deepgram error:', err);
  });

  dgConnection.on(LiveTranscriptionEvents.Close, () => {
    console.log('Deepgram closed');
  });

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      dgConnection.send(data);
      return;
    }

    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (msg.type === 'stop') {
      dgConnection.requestClose();
    }
  });

  ws.on('close', () => {
    dgConnection.requestClose();
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import 'dotenv/config';

import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import Groq from 'groq-sdk';

import { COACH_SYSTEM_PROMPT } from './prompts/coach.js';
import repsRouter from './routes/reps.js';
import callsRouter from './routes/calls.js';
import coachingRouter from './routes/coaching.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 8080;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api/reps', repsRouter);
app.use('/api/calls', callsRouter);
app.use('/api/coaching', coachingRouter);

const server = app.listen(PORT, () => {
  console.log(`sales-coach-ai server listening on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server, path: '/ws' });

const deepgram = DEEPGRAM_API_KEY ? createClient(DEEPGRAM_API_KEY) : null;
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

wss.on('connection', (browserSocket) => {
  console.log('Browser connected');

  if (!deepgram) {
    browserSocket.send(
      JSON.stringify({ type: 'error', message: 'DEEPGRAM_API_KEY is not set on the server' })
    );
    browserSocket.close();
    return;
  }

  const deepgramSocket = deepgram.listen.live({
    model: 'nova-3',
    encoding: 'linear16',
    sample_rate: 16000,
    channels: 1,
    interim_results: true,
    smart_format: true,
  });

  let pendingFinalTranscript = '';
  let suggestionInFlight = false;

  const send = (payload) => {
    if (browserSocket.readyState === WebSocket.OPEN) {
      browserSocket.send(JSON.stringify(payload));
    }
  };

  const requestSuggestion = async () => {
    const transcriptChunk = pendingFinalTranscript.trim();
    pendingFinalTranscript = '';

    if (!transcriptChunk || !groq || suggestionInFlight) return;
    suggestionInFlight = true;

    try {
      const stream = await groq.chat.completions.create({
        model: 'llama3-70b-8192',
        max_tokens: 100,
        temperature: 0.7,
        stream: true,
        messages: [
          { role: 'system', content: COACH_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Here is the latest stretch of the live call transcript:\n"""${transcriptChunk}"""\n\nGive the rep one line to say right now.`,
          },
        ],
      });

      let suggestion = '';
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (!delta) continue;
        suggestion += delta;
        send({ type: 'suggestion', text: suggestion.trim() });
      }
    } catch (err) {
      console.error('Groq error:', err.message);
      send({ type: 'error', message: 'Failed to generate suggestion' });
    } finally {
      suggestionInFlight = false;
    }
  };

  deepgramSocket.on(LiveTranscriptionEvents.Open, () => {
    console.log('Connected to Deepgram');
  });

  deepgramSocket.on(LiveTranscriptionEvents.Transcript, (data) => {
    const transcript = data?.channel?.alternatives?.[0]?.transcript;
    if (!transcript) return;

    const isFinal = Boolean(data.is_final);
    send({ type: 'transcript', text: transcript, is_final: isFinal });

    if (isFinal) {
      pendingFinalTranscript += `${transcript} `;
    }

    if (data.speech_final) {
      requestSuggestion();
    }
  });

  deepgramSocket.on(LiveTranscriptionEvents.Error, (err) => {
    console.error('Deepgram error:', err);
    send({ type: 'error', message: 'Deepgram connection error' });
  });

  deepgramSocket.on(LiveTranscriptionEvents.Close, () => {
    console.log('Deepgram connection closed');
    if (browserSocket.readyState === WebSocket.OPEN) browserSocket.close();
  });

  browserSocket.on('message', (data, isBinary) => {
    if (!isBinary) return;
    if (deepgramSocket.getReadyState() === 1) {
      deepgramSocket.send(data);
    }
  });

  browserSocket.on('close', () => {
    console.log('Browser disconnected');
    deepgramSocket.requestClose();
  });

  browserSocket.on('error', (err) => {
    console.error('Browser socket error:', err.message);
  });
});

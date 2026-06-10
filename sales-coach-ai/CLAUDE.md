# Sales Coach AI — Project Bible

## What This Product Is
Real-time AI sales coaching tool. Rep opens web app 
on phone during a sales call. App listens, transcribes, 
and shows ONE confident suggestion at a time to help 
close the deal.

## Role of Each Tool
- Claude (claude.ai): Product architect — makes all 
  decisions, writes all prompts
- Claude Code: Handles all coding and file changes
- Replit: Deployment and testing only

## Core Product Rule
The AI suggestions must sound like natural confident 
lines the rep can say — never like coaching, never 
labeled, never explained. The psychology is invisible.

## Tech Stack
- Backend: Node.js + Express (ESM, no TypeScript)
- WebSocket: ws library
- Speech-to-Text: Deepgram nova-3 streaming
- AI Engine: Groq API (llama3-70b-8192)
- Frontend: Single HTML file, no framework, no build step
- Hosting: Replit

## Current Branch
GitHub: https://github.com/Satvika-39/Projects
Branch: sales-coach-ai

## Known Issues
1. CRITICAL: Safari iOS does not support MediaRecorder 
   with audio/webm — transcription completely breaks 
   on iPhone. Must use AudioContext + ScriptProcessorNode.

## Files
- server.js — Express + WebSocket + Deepgram + Groq
- public/index.html — entire frontend UI
- prompts/coach.js — Groq system prompt (currently inline)
- routes/ — API routes

## MVP Success Criteria
Rep opens URL on iPhone → taps Start → talks → 
sees suggestion within 5 seconds → suggestion updates 
naturally as conversation evolves.

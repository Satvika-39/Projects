# General Coding Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

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

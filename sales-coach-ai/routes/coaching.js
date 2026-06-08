const express = require('express');

const router = express.Router();

// In-memory placeholder store for suggestions emitted during calls.
const suggestions = [];

router.get('/', (req, res) => {
  const { callId } = req.query;
  const filtered = callId
    ? suggestions.filter((s) => String(s.callId) === String(callId))
    : suggestions;
  res.json(filtered);
});

router.post('/', (req, res) => {
  const { callId, text } = req.body || {};
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }
  const suggestion = {
    id: suggestions.length + 1,
    callId: callId || null,
    text,
    createdAt: new Date().toISOString(),
  };
  suggestions.push(suggestion);
  res.status(201).json(suggestion);
});

module.exports = router;

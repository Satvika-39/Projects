const express = require('express');

const router = express.Router();

// In-memory placeholder store for call sessions.
const calls = [];

router.get('/', (req, res) => {
  res.json(calls);
});

router.post('/', (req, res) => {
  const { repId } = req.body || {};
  const call = {
    id: calls.length + 1,
    repId: repId || null,
    startedAt: new Date().toISOString(),
    endedAt: null,
    transcript: '',
  };
  calls.push(call);
  res.status(201).json(call);
});

router.get('/:id', (req, res) => {
  const call = calls.find((c) => c.id === Number(req.params.id));
  if (!call) return res.status(404).json({ error: 'call not found' });
  res.json(call);
});

router.post('/:id/end', (req, res) => {
  const call = calls.find((c) => c.id === Number(req.params.id));
  if (!call) return res.status(404).json({ error: 'call not found' });
  call.endedAt = new Date().toISOString();
  res.json(call);
});

module.exports = router;

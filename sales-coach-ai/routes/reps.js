import express from 'express';

const router = express.Router();

// In-memory placeholder store for sales reps.
const reps = [];

router.get('/', (req, res) => {
  res.json(reps);
});

router.post('/', (req, res) => {
  const { name, email } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }
  const rep = { id: reps.length + 1, name, email: email || null };
  reps.push(rep);
  res.status(201).json(rep);
});

router.get('/:id', (req, res) => {
  const rep = reps.find((r) => r.id === Number(req.params.id));
  if (!rep) return res.status(404).json({ error: 'rep not found' });
  res.json(rep);
});

export default router;

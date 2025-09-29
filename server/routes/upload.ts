// server/routes/upload.ts
import { Router } from 'express';
import { upload } from '../middleware/upload';
import fs from 'fs';
import path from 'path';

const router = Router();

router.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.status(200).json({ path: `/uploads/${req.file.filename}` });
});

router.get('/uploads/:filename', (req, res) => {
  const filePath = path.resolve(process.cwd(), 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

export default router;
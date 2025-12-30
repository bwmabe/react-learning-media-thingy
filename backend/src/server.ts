import express, { Request, Response } from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';

const app = express();
app.use(cors());

const db = new sqlite3.Database('./metadata.db');

interface FileMetadata {
  id: string;
  user: string;
  service: string;
  title: string;
  substring: string;
  filename: string;
}

app.get('/api/files', (req: Request, res: Response) => {
  const query = "SELECT * FROM items";
  
  db.all(query, [], (err: Error | null, rows: FileMetadata[]) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.listen(5000, () => console.log('Backend running on port 5000'));

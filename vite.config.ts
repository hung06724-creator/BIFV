import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { mkdirSync } from 'fs';
import Database from 'better-sqlite3';

const DB_DIR = 'D:\\Data Sổ phụ';
const DB_PATH = path.join(DB_DIR, 'app.db');

function getDb(): Database.Database {
  mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      bank_code TEXT NOT NULL,
      data TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      maHoSo TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS tuition_records (
      transactionId TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);

  return db;
}

function loadState(db: Database.Database): Record<string, any> {
  const bidvRows = db.prepare('SELECT data FROM transactions WHERE bank_code = ?').all('BIDV') as { data: string }[];
  const agriRows = db.prepare('SELECT data FROM transactions WHERE bank_code = ?').all('AGRIBANK') as { data: string }[];
  const ruleRows = db.prepare('SELECT data FROM rules').all() as { data: string }[];
  const catRows = db.prepare('SELECT data FROM categories').all() as { data: string }[];
  const batchRows = db.prepare('SELECT data FROM batches').all() as { data: string }[];
  const studentRows = db.prepare('SELECT data FROM students').all() as { data: string }[];
  const tuitionRows = db.prepare('SELECT data FROM tuition_records').all() as { data: string }[];
  const settingRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('activeBank') as { value: string } | undefined;

  return {
    bidvTransactions: bidvRows.map((r) => JSON.parse(r.data)),
    agribankTransactions: agriRows.map((r) => JSON.parse(r.data)),
    rules: ruleRows.map((r) => JSON.parse(r.data)),
    categories: catRows.map((r) => JSON.parse(r.data)),
    batches: batchRows.map((r) => JSON.parse(r.data)),
    students: studentRows.map((r) => JSON.parse(r.data)),
    tuitionRecords: tuitionRows.map((r) => JSON.parse(r.data)),
    activeBank: settingRow?.value || 'BIDV',
  };
}

function saveState(db: Database.Database, state: Record<string, any>): void {
  const runInTransaction = db.transaction(() => {
    // Transactions
    db.prepare('DELETE FROM transactions').run();
    const insertTxn = db.prepare('INSERT INTO transactions (id, bank_code, data) VALUES (?, ?, ?)');
    for (const t of state.bidvTransactions || []) {
      insertTxn.run(t.id, 'BIDV', JSON.stringify(t));
    }
    for (const t of state.agribankTransactions || []) {
      insertTxn.run(t.id, 'AGRIBANK', JSON.stringify(t));
    }

    // Rules
    db.prepare('DELETE FROM rules').run();
    const insertRule = db.prepare('INSERT INTO rules (id, data) VALUES (?, ?)');
    for (const r of state.rules || []) {
      insertRule.run(r.id, JSON.stringify(r));
    }

    // Categories
    db.prepare('DELETE FROM categories').run();
    const insertCat = db.prepare('INSERT INTO categories (id, data) VALUES (?, ?)');
    for (const c of state.categories || []) {
      insertCat.run(c.id, JSON.stringify(c));
    }

    // Batches
    db.prepare('DELETE FROM batches').run();
    const insertBatch = db.prepare('INSERT INTO batches (id, data) VALUES (?, ?)');
    for (const b of state.batches || []) {
      insertBatch.run(b.id, JSON.stringify(b));
    }

    // Settings
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
      'activeBank',
      state.activeBank || 'BIDV'
    );

    // Students
    db.prepare('DELETE FROM students').run();
    const insertStudent = db.prepare('INSERT INTO students (maHoSo, data) VALUES (?, ?)');
    for (const s of state.students || []) {
      insertStudent.run(s.maHoSo, JSON.stringify(s));
    }

    // Tuition Records
    db.prepare('DELETE FROM tuition_records').run();
    const insertTuition = db.prepare('INSERT INTO tuition_records (transactionId, data) VALUES (?, ?)');
    for (const r of state.tuitionRecords || []) {
      insertTuition.run(r.transactionId, JSON.stringify(r));
    }
  });

  runInTransaction();
}

const sqliteDataPlugin = (): Plugin => ({
  name: 'sqlite-data-api',
  configureServer(server) {
    server.middlewares.use('/api/dev-data', async (req, res) => {
      if (req.method === 'GET') {
        try {
          const db = getDb();
          const state = loadState(db);
          db.close();
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(state));
        } catch (error: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      if (req.method === 'PUT') {
        try {
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', () => resolve());
            req.on('error', reject);
          });

          const body = Buffer.concat(chunks).toString('utf8');
          const parsed = JSON.parse(body);
          const db = getDb();
          saveState(db, parsed);
          db.close();

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: true }));
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed.' }));
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), sqliteDataPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    open: true,
  },
});

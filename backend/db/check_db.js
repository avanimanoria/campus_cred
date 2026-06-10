#!/usr/bin/env node
// Simple DB sanity check using pg (same connection details as clubverse/config/db.js)
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'campus_activity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_actual_password_here',
});

async function check() {
  try {
    const client = await pool.connect();
    console.log('Connected to database:', pool.options.database || process.env.DB_NAME);

    const tables = ['users','students','student_details','events','registrations','hod_upload_temp','notifications'];
    for (const t of tables) {
      try {
        const res = await client.query(`SELECT COUNT(*)::int as cnt FROM ${t}`);
        console.log(`${t}: ${res.rows[0].cnt}`);
      } catch (e) {
        console.log(`${t}: ERROR - ${e.message}`);
      }
    }

    // sample some rows
    try {
      const r = await client.query('SELECT * FROM users LIMIT 5');
      console.log('\nusers sample:', r.rows);
    } catch (e) {}

    client.release();
    await pool.end();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  }
}

check();

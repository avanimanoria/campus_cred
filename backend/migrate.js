// Quick migration script to fix database schema
import pgp from 'pg-promise';
import dotenv from 'dotenv';

dotenv.config();

const connectionOptions = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'campus_activity',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'CREDO',
};

const pgr = pgp({});
const db = pgr(connectionOptions);

async function migrate() {
  try {
    console.log('Starting database migration...');

    // Add proctor_name column to students table
    await db.none(`
      ALTER TABLE students
      ADD COLUMN IF NOT EXISTS proctor_name VARCHAR(100);
    `);
    console.log('✅ Added proctor_name column to students table');

    // Create hod_upload_temp table
    await db.none(`
      CREATE TABLE IF NOT EXISTS hod_upload_temp (
        id                SERIAL PRIMARY KEY,
        semester          INT,
        proctor_name      VARCHAR(100),
        proctor_email     VARCHAR(100),
        student_name      VARCHAR(100),
        student_usn       VARCHAR(50),
        student_email     VARCHAR(100),
        status            VARCHAR(50) DEFAULT 'pending',
        uploaded_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Created hod_upload_temp table');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await db.$pool.end();
  }
}

migrate();

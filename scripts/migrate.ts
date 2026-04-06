import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const filename of files) {
      const { rows } = await pool.query(
        'SELECT filename FROM schema_migrations WHERE filename = $1',
        [filename]
      );

      if (rows.length > 0) {
        console.log(`  skip  ${filename} (already applied)`);
        continue;
      }

      const filePath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`  apply ${filename}`);
      await pool.query(sql);
      await pool.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [filename]
      );
      console.log(`  done  ${filename}`);
    }

    console.log('\nAll migrations applied.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

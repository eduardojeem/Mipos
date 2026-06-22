const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log("Connected to DB.");

    const sql = `
      ALTER TABLE public.staff_profiles 
      ADD COLUMN IF NOT EXISTS walkin_only BOOLEAN NOT NULL DEFAULT FALSE;
    `;

    console.log("Executing query...");
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Error executing migration:", err);
  } finally {
    await client.end();
  }
}

run();

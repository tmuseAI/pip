require("dotenv").config();
const { Client } = require("pg");

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const cols = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='User' ORDER BY ordinal_position"
  );
  console.log("USER COLUMNS:", cols.rows.map((r) => r.column_name));
  const count = await client.query('SELECT COUNT(*)::int AS c FROM "User"');
  console.log("USER ROW COUNT:", count.rows[0].c);
  await client.end();
}

run().catch((e) => {
  console.error("PG CHECK ERROR:", e);
  process.exit(1);
});

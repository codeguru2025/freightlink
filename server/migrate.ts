import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "../shared/schema";

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("[MIGRATE] ERROR: DATABASE_URL is not set");
    process.exit(1);
  }

  const maskedUrl = dbUrl.replace(/:([^@]+)@/, ":****@");
  console.log(`[MIGRATE] Attempting to connect to: ${maskedUrl}`);

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    console.log("[MIGRATE] Successfully connected to the database!");
    
    const db = drizzle(client, { schema });
    
    console.log("[MIGRATE] Checking if tables exist...");
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tables = result.rows.map((r: any) => r.table_name);
    console.log(`[MIGRATE] Current tables: ${tables.join(", ") || "none"}`);

    console.log("[MIGRATE] Running drizzle-kit push via shell...");
    // We still use drizzle-kit push because it's the easiest way to sync schema
    // But now we know the connection works.
    const { execSync } = await import("child_process");
    execSync("npx drizzle-kit push --force", { stdio: "inherit" });
    
    console.log("[MIGRATE] Migration process completed successfully!");
    client.release();
  } catch (error) {
    console.error("[MIGRATE] CRITICAL ERROR during migration:");
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

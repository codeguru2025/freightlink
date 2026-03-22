import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// In production (DigitalOcean), we often need to allow self-signed certificates for PG connection
const isProduction = process.env.NODE_ENV === "production";
const ssl = isProduction ? { rejectUnauthorized: false } : undefined;

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl
});
export const db = drizzle(pool, { schema });

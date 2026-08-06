import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { loadApiEnvironment, parseInstanceCliOptions } from "./instance-env.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadApiEnvironment(root, parseInstanceCliOptions());
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for migrations.");

const connection = await mysql.createConnection({
  uri: databaseUrl,
  multipleStatements: true,
});
let migrationLockAcquired = false;

try {
  const [lockRows] = await connection.query<
    Array<RowDataPacket & { acquired: number }>
  >("SELECT GET_LOCK(CONCAT('catalog-migrations-', DATABASE()), 30) AS acquired");
  if (lockRows[0]?.acquired !== 1) {
    throw new Error("Could not acquire the database migration lock.");
  }
  migrationLockAcquired = true;
  const directory = resolve(root, "database/migrations");
  const migrations = readdirSync(directory)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();
  if (!migrations[0]) throw new Error("No database migrations were found.");

  await connection.query(readFileSync(resolve(directory, migrations[0]), "utf8"));
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_name VARCHAR(160) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await connection.execute(
    "INSERT IGNORE INTO schema_migrations (migration_name) VALUES (?)",
    [migrations[0]],
  );

  for (const migration of migrations.slice(1)) {
    const [rows] = await connection.query<
      Array<RowDataPacket & { count: number }>
    >(
      "SELECT COUNT(*) AS count FROM schema_migrations WHERE migration_name = ?",
      [migration],
    );
    if ((rows[0]?.count ?? 0) > 0) continue;
    await connection.query(readFileSync(resolve(directory, migration), "utf8"));
    await connection.execute(
      "INSERT INTO schema_migrations (migration_name) VALUES (?)",
      [migration],
    );
    process.stdout.write(`Applied ${migration}\n`);
  }
  process.stdout.write("Database migrations are current.\n");
} finally {
  if (migrationLockAcquired) {
    await connection.query(
      "SELECT RELEASE_LOCK(CONCAT('catalog-migrations-', DATABASE()))",
    );
  }
  await connection.end();
}

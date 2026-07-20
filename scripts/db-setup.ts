import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import mysql, { type RowDataPacket } from "mysql2/promise";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, "apps/api/.env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set in apps/api/.env before running db:setup.");
}

const connection = await mysql.createConnection({
  uri: databaseUrl,
  multipleStatements: true
});

try {
  const files = [
    "database/migrations/001_initial_schema.sql",
    "database/seeds/001_demo_catalog.sql"
  ];

  for (const file of files) {
    const sql = readFileSync(resolve(root, file), "utf8");
    await connection.query(sql);
    if (file.includes("001_initial_schema")) {
      await ensureWhatsappItemImageColumn();
    }
    console.log(`Applied ${file}`);
  }

  console.log("MySQL schema and seed are ready.");
} finally {
  await connection.end();
}

async function ensureWhatsappItemImageColumn() {
  const [rows] = await connection.query<Array<RowDataPacket & { count: number }>>(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'whatsapp_request_items'
        AND column_name = 'image_url'
    `
  );

  if ((rows[0]?.count ?? 0) === 0) {
    await connection.query("ALTER TABLE whatsapp_request_items ADD COLUMN image_url VARCHAR(500) AFTER subtotal_in_cents");
  }

  await connection.query(
    `
      UPDATE whatsapp_request_items wri
      LEFT JOIN product_images pi ON pi.id = (
        SELECT pi2.id
        FROM product_images pi2
        WHERE pi2.product_id = wri.product_id
        ORDER BY pi2.position ASC, pi2.created_at ASC
        LIMIT 1
      )
      LEFT JOIN media_assets ma ON ma.id = pi.media_asset_id
      SET wri.image_url = ma.public_url
      WHERE wri.image_url IS NULL
        AND ma.public_url IS NOT NULL
    `
  );
}

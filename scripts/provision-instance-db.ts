import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import {
  parseInstanceCliOptions,
  readInstanceEnvironmentFile,
} from "./instance-env.js";

if (!process.argv.includes("--confirm")) {
  throw new Error(
    "Database provisioning requires --confirm because it creates or updates a MySQL user.",
  );
}

const adminUrl = process.env.MYSQL_ADMIN_URL || process.env.DATABASE_ADMIN_URL;
if (!adminUrl) {
  throw new Error(
    "Set MYSQL_ADMIN_URL, for example mysql://root:password@127.0.0.1:3306/mysql.",
  );
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { values } = readInstanceEnvironmentFile(root, parseInstanceCliOptions());
const databaseName = required("DATABASE_NAME");
const databaseUser = required("DATABASE_USER");
const databasePassword = required("DATABASE_PASSWORD");
const databaseUrl = new URL(required("DATABASE_URL"));
const databaseHost = values.DATABASE_GRANT_HOST || databaseUrl.hostname;

assertIdentifier(databaseName, "DATABASE_NAME");
assertIdentifier(databaseUser, "DATABASE_USER");

const connection = await mysql.createConnection({
  uri: adminUrl,
  multipleStatements: true,
});

try {
  const account = `${connection.escape(databaseUser)}@${connection.escape(
    databaseHost,
  )}`;
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS ${identifier(
      databaseName,
    )} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.query(
    `CREATE USER IF NOT EXISTS ${account} IDENTIFIED BY ${connection.escape(
      databasePassword,
    )}`,
  );
  await connection.query(
    `ALTER USER ${account} IDENTIFIED BY ${connection.escape(
      databasePassword,
    )}`,
  );
  await connection.query(
    `GRANT ALL PRIVILEGES ON ${identifier(databaseName)}.* TO ${account}`,
  );
  await connection.query("FLUSH PRIVILEGES");
  process.stdout.write(
    `Database '${databaseName}' and user '${databaseUser}' are ready for ${required(
      "INSTANCE_ID",
    )}.\n`,
  );
} finally {
  await connection.end();
}

function required(name: string) {
  const value = values[name]?.trim();
  if (!value) throw new Error(`${name} is required in the instance .env.`);
  return value;
}

function assertIdentifier(value: string, name: string) {
  if (!/^[a-zA-Z0-9_$]+$/.test(value)) {
    throw new Error(`${name} must contain only letters, numbers, _ or $.`);
  }
}

function identifier(value: string) {
  return `\`${value.replaceAll("`", "``")}\``;
}

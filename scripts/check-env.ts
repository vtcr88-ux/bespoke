import { readFileSync } from "node:fs";
import { join } from "node:path";

const examples = [
  "apps/api/.env.example",
  "apps/web/.env.example",
  "apps/admin/.env.example"
];

for (const file of examples) {
  const content = readFileSync(join(process.cwd(), file), "utf8");
  const keys = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=")[0]);

  if (keys.some((key) => !key)) {
    throw new Error(`${file} has an invalid env key.`);
  }

  console.log(`${file}: ${keys.length} variables documented`);
}

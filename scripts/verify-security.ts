import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const forbiddenPatterns = [/MERCADO_PAGO_ACCESS_TOKEN\s*=\s*(?!TEST-|replace)/, /SESSION_SECRET\s*=\s*(?!replace|test_)/];
const ignored = new Set(["node_modules", "dist", ".git", "coverage", ".vite"]);

function walk(dir: string): string[] {
  return readdirSync(dir)
    .filter((entry) => !ignored.has(entry))
    .flatMap((entry) => {
      const path = join(dir, entry);
      const stats = statSync(path);
      return stats.isDirectory() ? walk(path) : [path];
    });
}

const files = walk(process.cwd()).filter((file) => /\.(ts|tsx|js|json|md|sql|example)$/.test(file));

for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      throw new Error(`Potential secret-like value found in ${file}`);
    }
  }
}

console.log("No obvious secret-like values found.");

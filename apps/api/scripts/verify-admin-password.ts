import { resolve } from "node:path";
import { config } from "dotenv";
import { loadEnv } from "../src/config/env.js";
import { verifyAdminPasswordHash } from "../src/modules/auth/admin-auth.service.js";
import { readHiddenPassword } from "./admin-password-input.js";

const envFile = process.env.ENV_FILE
  ? resolve(process.env.ENV_FILE)
  : resolve(process.cwd(), ".env");

config({ path: envFile });

const password = await readHiddenPassword(
  "Digite a senha administrativa para verificar: ",
);
if (password.length < 8 || password.length > 128) {
  process.stderr.write("A senha deve ter entre 8 e 128 caracteres.\n");
  process.exitCode = 1;
} else {
  const env = loadEnv();
  const matches = await verifyAdminPasswordHash(
    password,
    env.ADMIN_PASSWORD_HASH,
  );

  if (matches) {
    process.stdout.write("A senha corresponde ao hash configurado.\n");
  } else {
    process.stderr.write(
      "A senha nao corresponde ao hash configurado. Gere um novo hash e reinicie a API.\n",
    );
    process.exitCode = 1;
  }
}

import { createAdminPasswordHash } from "../src/modules/auth/admin-auth.service.js";
import { readHiddenPassword } from "./admin-password-input.js";

const password = await readHiddenPassword("Digite a senha administrativa: ");
if (password.length < 12 || password.length > 128) {
  throw new Error("A senha deve ter entre 12 e 128 caracteres.");
}

const hash = await createAdminPasswordHash(password);
process.stdout.write(`${hash}\n`);

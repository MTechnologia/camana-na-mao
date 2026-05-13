/**
 * Remove do google-services.json o cliente com package exatamente
 * br.com.mtechnologia.camaranamao (principal, sem sufixo).
 * Uso: node scripts/strip-main-google-services-client.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const path = join(root, "google-services.json");

const MAIN = "br.com.mtechnologia.camaranamao";
const data = JSON.parse(readFileSync(path, "utf8"));
if (!Array.isArray(data.client)) {
  throw new Error("google-services.json: array 'client' em falta ou inválido.");
}
const before = data.client.length;
data.client = data.client.filter((c) => {
  const pkg = c?.client_info?.android_client_info?.package_name;
  return pkg !== MAIN;
});
if (data.client.length === before) {
  console.warn("Nenhum cliente com package principal encontrado; ficheiro inalterado.");
  process.exit(0);
}
if (data.client.length === 0) {
  throw new Error("Remover o principal deixaria 'client' vazio; abortado.");
}
writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
const pkgs = data.client.map(
  (c) => c?.client_info?.android_client_info?.package_name
);
console.log(`Removido cliente '${MAIN}'. Clientes restantes (${data.client.length}):`, pkgs.join(", "));

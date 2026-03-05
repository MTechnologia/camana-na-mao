#!/usr/bin/env node
/**
 * Gera chaves VAPID para Web Push (formato compatível com @negrel/webpush).
 * Uso: node scripts/generate-vapid-keys.mjs
 * Não é necessário instalar Deno.
 */

const nodeCrypto = await import("node:crypto");
const crypto = nodeCrypto.default?.webcrypto ?? globalThis.crypto;
if (!crypto?.subtle) {
  console.error("Este script requer Node.js 15+ (webcrypto). Tente: node --version");
  process.exit(1);
}
const subtle = crypto.subtle;

const algo = { name: "ECDSA", namedCurve: "P-256" };

const keyPair = await crypto.subtle.generateKey(algo, true, ["sign", "verify"]);

const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

const vapidJwks = { publicKey: publicJwk, privateKey: privateJwk };
console.log(JSON.stringify(vapidJwks, null, 2));

// Chave pública para o frontend (application server key = raw public key em base64url)
const rawPublic = await subtle.exportKey("raw", keyPair.publicKey);
const base64url = Buffer.from(rawPublic)
  .toString("base64")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");
console.error("Chave pública para VITE_VAPID_PUBLIC_KEY (frontend):");
console.error(base64url);

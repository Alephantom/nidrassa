// Encrypts the advent calendar PDFs with the code from the waitlist email.
// The browser decrypts them on /uebungen/advent2026/ (assets/site.js, "Advent calendar page").
// Run from the Website folder:
//   node tools/encrypt-advent.mjs "<code>" <source folder with the 4 PDFs>
// Writes assets/downloads/advent2026/*.bin and prints the salt for advent2026.html (data-salt).
// Same normalisation as the page: lower case, no spaces, no "+".
import { webcrypto as crypto } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const [code, src] = process.argv.slice(2);
if (!code || !src) { console.error('Usage: node tools/encrypt-advent.mjs "<code>" <source folder>'); process.exit(1); }

const files = {
  "mama-a4": "Nidrassa_Mein_stiller_Advent_Mama_A4.pdf",
  "mama-a5": "Nidrassa_Mein_stiller_Advent_Mama_A5_2-pro-A4.pdf",
  "tochter-a4": "Nidrassa_Mein_strahlender_Advent_Tochter_A4.pdf",
  "tochter-a5": "Nidrassa_Mein_strahlender_Advent_Tochter_A5_2-pro-A4.pdf",
};
const out = "assets/downloads/advent2026";

const clean = code.toLowerCase().replace(/[\s+]/g, "");
const salt = crypto.getRandomValues(new Uint8Array(16));
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(clean), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
  base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);

async function seal(name, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  const buf = new Uint8Array(12 + enc.length);
  buf.set(iv); buf.set(enc, 12);
  await writeFile(`${out}/${name}.bin`, buf);
}

await seal("check", new TextEncoder().encode("nidrassa"));
for (const [name, file] of Object.entries(files)) await seal(name, await readFile(`${src}/${file}`));
console.log("data-salt:", Buffer.from(salt).toString("base64"));

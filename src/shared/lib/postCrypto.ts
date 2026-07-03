/**
 * Compatible with Hubzilla's sodium_encrypt / sodium_decrypt (view/js/crypto.js).
 * Format: [crypt]base64(JSON({hint, alg, salt, nonce, ciphertext}))[/crypt]
 * Algorithm: XSalsa20-Poly1305 via libsodium, key from PBKDF2-SHA256 (100k iter).
 *
 * Quirk: Hubzilla derives the PBKDF2 salt by doing encoder.encode(uint8array),
 * which coerces the Uint8Array to its comma-separated decimal string first.
 * We replicate that exactly so keys match cross-app.
 */
type Sodium = typeof import("libsodium-wrappers");

let sodiumPromise: Promise<Sodium> | null = null;

async function ensureSodium(): Promise<Sodium> {
  if (!sodiumPromise) {
    sodiumPromise = import("libsodium-wrappers").then(async (mod) => {
      const na = (mod.default ?? mod) as Sodium;
      await na.ready;
      return na;
    });
  }
  return sodiumPromise;
}

function toHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}

function bin2hex(str: string): string {
  let out = "";
  for (let i = 0; i < str.length; i++) {
    out += str.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return out;
}

function hex2bin(hex: string): string {
  let out = "";
  for (let i = 0; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
}

async function derivePBKDF2Hash(
  password: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  // Hubzilla does encoder.encode(uint8array) which coerces via .toString()
  // producing "1,2,3,..." — replicate exactly for key compatibility.
  const saltBuffer = encoder.encode(salt.toString());

  const key = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBuffer, iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );

  return new Uint8Array(bits);
}

interface CryptPayload {
  hint: string;
  alg: string;
  salt: string;
  nonce: string;
  ciphertext: string;
}

/** Returns `[crypt]base64payload[/crypt]` ready to send as post body. */
export async function encryptBody(
  body: string,
  password: string,
  hint: string,
): Promise<string> {
  const na = await ensureSodium();

  const salt = crypto.getRandomValues(new Uint8Array(32));
  const key = await derivePBKDF2Hash(password, salt);
  const nonce = na.randombytes_buf(na.crypto_secretbox_NONCEBYTES);
  const message = new TextEncoder().encode(body);
  const ciphertext = na.crypto_secretbox_easy(message, nonce, key);

  const payload: CryptPayload = {
    hint: bin2hex(hint),
    alg: "XSalsa20",
    salt: toHex(salt),
    nonce: toHex(nonce),
    ciphertext: toHex(ciphertext),
  };

  return `[crypt]${btoa(JSON.stringify(payload))}[/crypt]`;
}

/** Decrypts a base64 payload string; throws on wrong password or corrupt data. */
export async function decryptPayload(
  base64: string,
  password: string,
): Promise<string> {
  const na = await ensureSodium();

  let arr: CryptPayload;
  try {
    arr = JSON.parse(atob(base64)) as CryptPayload;
  } catch {
    throw new Error("Corrupt encrypted payload");
  }

  if (arr.alg !== "XSalsa20") {
    throw new Error(`Unsupported algorithm: ${arr.alg}`);
  }

  const salt = fromHex(arr.salt);
  const nonce = fromHex(arr.nonce);
  const ciphertext = fromHex(arr.ciphertext);
  const key = await derivePBKDF2Hash(password, salt);

  let decrypted: Uint8Array;
  try {
    decrypted = na.crypto_secretbox_open_easy(ciphertext, nonce, key);
  } catch {
    throw new Error("Wrong password or corrupted message");
  }

  return new TextDecoder().decode(decrypted);
}

/** Extracts the human-readable hint from a base64 payload (empty string if none). */
export function getPayloadHint(base64: string): string {
  try {
    const arr = JSON.parse(atob(base64)) as CryptPayload;
    return arr.hint ? hex2bin(arr.hint) : "";
  } catch {
    return "";
  }
}

/** Returns true if the body is a single [crypt]...[/crypt] block. */
export function isEncryptedBody(body: string): boolean {
  return /^\[crypt\][\s\S]+\[\/crypt\]$/.test(body.trim());
}

const ENC_PREFIX = "nestenc:v1:";

function getKeyMaterial() {
  const key = localStorage.getItem("nest_local_crypto_key");

  if (key) return key;

  const created = crypto.randomUUID() + crypto.randomUUID();
  localStorage.setItem("nest_local_crypto_key", created);
  return created;
}

async function deriveKey() {
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(getKeyMaterial()),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("the-nest-v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

function toBase64(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export async function encryptText(value: string) {
  if (!value) return "";

  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey();

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    enc.encode(value)
  );

  return `${ENC_PREFIX}${toBase64(iv.buffer)}:${toBase64(encrypted)}`;
}

export async function decryptText(value?: string | null) {
  if (!value) return "";
  if (!value.startsWith(ENC_PREFIX)) return value;

  const [, payload] = value.split(ENC_PREFIX);
  const [ivBase64, encryptedBase64] = payload.split(":");

  const key = await deriveKey();

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(ivBase64),
    },
    key,
    fromBase64(encryptedBase64)
  );

  return new TextDecoder().decode(decrypted);
}
import { decodeHex, encodeHex } from "jsr:@std/encoding/hex";

// ==========================================
// 🔐 CRYPTOGRAPHY HELPERS (Ed25519)
// ==========================================

// 1. GENERATE WALLET
// Creates a KeyPair. The Public Key becomes the "Ticket ID".
// The Private Key stays on the user's device (simulated).
export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "Ed25519", namedCurve: "Ed25519" },
    true,
    ["sign", "verify"],
  );

  // Export Public Key to Hex String (This is what we store on-chain)
  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const publicKeyHex = encodeHex(publicKeyRaw);

  return { keyPair, publicKey: publicKeyHex };
}

// 2. SIGN DATA
// Used by the Client (Phone/Kiosk) to prove identity.
// We sign the JSON string representation of the payload.
export async function signData(
  data: object,
  privateKey: CryptoKey,
): Promise<string> {
  const encoder = new TextEncoder();
  // Ensure consistent ordering or just stringify (hackathon mode: simple stringify)
  const dataBytes = encoder.encode(JSON.stringify(data));

  const signatureBuffer = await crypto.subtle.sign(
    { name: "Ed25519" },
    privateKey,
    dataBytes,
  );

  return encodeHex(signatureBuffer);
}

// 3. VERIFY SIGNATURE
// Used by the Chain to validate the transaction.
// Returns TRUE if the signature matches the Public Key and the Data.
export async function verifySignature(
  data: object,
  signatureHex: string,
  publicKeyHex: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(JSON.stringify(data));

    // Convert Hex strings back to raw bytes
    const signatureBytes = decodeHex(signatureHex);
    const publicKeyBytes = decodeHex(publicKeyHex);

    // Import the public key from the Hex string
    const publicKey = await crypto.subtle.importKey(
      "raw",
      publicKeyBytes,
      { name: "Ed25519", namedCurve: "Ed25519" },
      true,
      ["verify"],
    );

    // Verify
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      signatureBytes,
      dataBytes,
    );
  } catch (e) {
    console.error("Crypto Verification Error:", e);
    return false;
  }
}

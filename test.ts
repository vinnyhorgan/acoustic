import { Chain } from "./chain.ts";
import { generateKeyPair, signData } from "./crypto.ts";
import type { TicketPayload, Transaction } from "./types.ts";

// ==========================================
// 🧪 SECURE TOTEM CHAIN SIMULATION
// ==========================================

const log = (msg: string) =>
  console.log(`\n%c${msg}`, "color: cyan; font-weight: bold;");
const logSuccess = (msg: string) => console.log(`%c✅ ${msg}`, "color: green;");
const logError = (msg: string) => console.log(`%c⛔ ${msg}`, "color: red;");

const totem = new Chain();

// Helper to wrap the ugly crypto logic
async function sendSignedTx(
  type: "MINT" | "ACTIVATE" | "INSPECT",
  keyPair: CryptoKeyPair,
  publicKeyHex: string, // The Ticket ID
  payloadData: Partial<TicketPayload>,
) {
  const payload: TicketPayload = {
    timestamp: Date.now(),
    deviceId: "SIM_DEVICE",
    ...payloadData,
  };

  const signature = await signData(payload, keyPair.privateKey);

  const tx: Transaction = {
    id: crypto.randomUUID(),
    type,
    ticketId: publicKeyHex,
    payload,
    signature,
  };

  await totem.addTransaction(tx);
  await totem.minePendingTransactions();
  return tx;
}

async function runSecureSimulation() {
  log("1. INITIALIZING CRYPTO-SECURE PROTOCOL...");

  // ==========================================
  // SCENARIO 1: THE HAPPY TRAVELER
  // Alice generates a wallet, buys a ticket, activates it, and rides.
  // ==========================================
  log("--- SCENARIO 1: Alice's Secure Journey ---");

  // 1. Setup Wallet (On Phone)
  const aliceWallet = await generateKeyPair();
  const aliceID = aliceWallet.publicKey;
  console.log(`Alice generated KeyPair. ID: ${aliceID.slice(0, 16)}...`);

  // 2. Minting (Buy Ticket)
  console.log("Alice buys (Mints) a ticket...");
  await sendSignedTx("MINT", aliceWallet.keyPair, aliceID, {
    price: "5.00 CHF",
  });

  if (totem.getTicketStatus(aliceID) === "ISSUED") {
    logSuccess("Ticket ISSUED. Ready for travel.");
  } else {
    logError("Minting Failed.");
  }

  // 3. Activation (Hop on Train)
  console.log("Alice hops on the train and Activates...");
  await sendSignedTx("ACTIVATE", aliceWallet.keyPair, aliceID, {
    location: "Bern",
  });

  if (totem.getTicketStatus(aliceID) === "ACTIVE") {
    logSuccess("Ticket is ACTIVE. Timer started.");
  } else {
    logError("Activation Failed.");
  }

  // 4. Police Inspection
  console.log("Police checks Alice...");
  try {
    // Inspection acts as an audit log
    await sendSignedTx("INSPECT", aliceWallet.keyPair, aliceID, {
      deviceId: "POLICE_SCANNER",
    });
    logSuccess("Police Scan Validated on-chain.");
  } catch (e) {
    logError("Police Scan Rejected!");
  }

  // ==========================================
  // SCENARIO 2: THE IDENTITY THIEF (Crypto Attack)
  // Hacker 'Mallory' sees Alice's ID on the chain.
  // She tries to use it. She has her own keys, but uses Alice's ID.
  // ==========================================
  log("--- SCENARIO 2: The Identity Theft Attack ---");

  const malloryWallet = await generateKeyPair();
  console.log("Mallory generates her own keys...");
  console.log(
    `Mallory trying to Activate Alice's ID: ${aliceID.slice(0, 16)}...`,
  );

  const payload = { timestamp: Date.now(), location: "Zurich" };

  // Mallory signs with HER key, but claims to be ALICE (ticketId = aliceID)
  const fakeSignature = await signData(
    payload,
    malloryWallet.keyPair.privateKey,
  );

  const hackTx: Transaction = {
    id: crypto.randomUUID(),
    type: "ACTIVATE",
    ticketId: aliceID, // <--- TARGETING ALICE
    payload: payload,
    signature: fakeSignature, // <--- SIGNED BY MALLORY
  };

  try {
    await totem.addTransaction(hackTx);
    logError("SECURITY FAILURE! Mallory hacked the ticket.");
  } catch (e) {
    logSuccess(
      `SECURITY SUCCESS! Chain rejected signature: "${(e as Error).message}"`,
    );
  }

  // ==========================================
  // SCENARIO 3: THE "DOUBLE START" (State Logic)
  // Alice tries to Activate her ticket again while it's already running.
  // ==========================================
  log("--- SCENARIO 3: Double Activation Attempt ---");

  try {
    console.log("Alice tries to Activate again...");
    await sendSignedTx("ACTIVATE", aliceWallet.keyPair, aliceID, {
      location: "Geneva",
    });
    logError("Logic Failure! Double activation allowed.");
  } catch (e) {
    logSuccess(`Logic Guard Held: "${(e as Error).message}"`);
  }

  // ==========================================
  // SCENARIO 4: THE TIME TRAVELER (Expiration)
  // We mint a ticket with a 10ms duration to test expiry.
  // ==========================================
  log("--- SCENARIO 4: Ticket Expiration ---");

  const flashWallet = await generateKeyPair();
  const flashID = flashWallet.publicKey;

  // Mint
  await sendSignedTx("MINT", flashWallet.keyPair, flashID, { duration: 10 }); // 10ms duration

  // Activate
  await sendSignedTx("ACTIVATE", flashWallet.keyPair, flashID, {});
  console.log("Flash Ticket Activated (10ms duration)...");

  // Check Immediately
  if (totem.getTicketStatus(flashID) === "ACTIVE") {
    console.log("Status is ACTIVE (Correct). Waiting 20ms...");
  }

  // Wait for expiry
  await new Promise((r) => setTimeout(r, 20));

  const status = totem.getTicketStatus(flashID);
  if (status === "EXPIRED") {
    logSuccess("Ticket correctly EXPIRED.");
  } else {
    logError(`Ticket failed to expire! Status is ${status}`);
  }

  // ==========================================
  // FINAL REPORT
  // ==========================================
  log("--- SIMULATION COMPLETE ---");
  console.log(`Chain Height: ${totem.chain.length}`);
}

if (import.meta.main) {
  runSecureSimulation();
}

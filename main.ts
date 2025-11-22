import { Chain } from "./chain.ts";
import type { Transaction } from "./types.ts";

// ==========================================
// 🧪 TOTEM CHAIN SIMULATION RUNNER
// ==========================================

// Helper to make the console output readable
const log = (msg: string) =>
  console.log(`\n%c${msg}`, "color: cyan; font-weight: bold;");
const logSuccess = (msg: string) => console.log(`%c✅ ${msg}`, "color: green;");
const logError = (msg: string) => console.log(`%c⛔ ${msg}`, "color: red;");

// Initialize the Blockchain
log("1. INITIALIZING TOTEM PROTOCOL...");
const totem = new Chain(); // Matches your export class Chain
console.log(`Genesis Block created. Hash: ${totem.chain[0].hash}`);

// Helper to generate a dummy transaction
const createTx = (
  type: "MINT" | "ENTRY" | "EXIT" | "INSPECT",
  ticketId: string,
  location: string,
): Transaction => {
  return {
    id: crypto.randomUUID(),
    type,
    ticketId,
    payload: {
      timestamp: Date.now(),
      location,
      price: type === "MINT" ? "2.50 EUR" : undefined,
      deviceId: "SIMULATION_BOT",
    },
    signature: "mock_sig_123",
  };
};

async function runSimulation() {
  // ==========================================
  // SCENARIO 1: THE HAPPY PATH
  // User "Alice" buys a ticket, rides the train, and leaves.
  // ==========================================
  log("--- SCENARIO 1: Alice's Journey (The Happy Path) ---");

  const aliceId = "ALICE_TOKEN_01";

  // 1. Minting
  console.log("Alice buys a ticket...");
  totem.addTransaction(createTx("MINT", aliceId, "Kiosk A"));
  await totem.minePendingTransactions();

  const status1 = totem.getTicketStatus(aliceId);
  if (status1 === "ISSUED") logSuccess("Alice's ticket is ISSUED on-chain.");
  else logError(`Failed! Status is ${status1}`);

  // 2. Entering
  console.log("Alice scans at Central Station...");
  totem.addTransaction(createTx("ENTRY", aliceId, "Central Station"));
  await totem.minePendingTransactions();

  const status2 = totem.getTicketStatus(aliceId);
  if (status2 === "IN_TRANSIT") logSuccess("Alice is IN_TRANSIT.");
  else logError(`Failed! Status is ${status2}`);

  // 3. Exiting
  console.log("Alice leaves at Suburbs...");
  totem.addTransaction(createTx("EXIT", aliceId, "Suburbs"));
  await totem.minePendingTransactions();

  const status3 = totem.getTicketStatus(aliceId);
  if (status3 === "USED") logSuccess("Alice's ticket is now USED.");
  else logError(`Failed! Status is ${status3}`);

  // ==========================================
  // SCENARIO 2: THE "COPY-SAFE" ATTACK
  // User "Bob" prints his ticket twice. Gives one to "Eve".
  // Bob enters. Eve tries to enter with the same ID.
  // ==========================================
  log("--- SCENARIO 2: The Double Spend Attack ---");

  const bobId = "BOB_TOKEN_CLONE";

  // Mint Bob's ticket
  totem.addTransaction(createTx("MINT", bobId, "Kiosk B"));
  await totem.minePendingTransactions();
  console.log("Bob minted a ticket.");

  // Bob enters
  totem.addTransaction(createTx("ENTRY", bobId, "North Station"));
  console.log("Bob scans ENTRY. (Adding to mempool...)");

  // NOTE: Even before mining, the mempool should block Eve!
  console.log("Eve tries to scan ENTRY with Bob's ID...");

  try {
    totem.addTransaction(createTx("ENTRY", bobId, "North Station"));
    logError("SECURITY FAILURE! Eve was allowed to enter.");
  } catch (e) {
    logSuccess(`SECURITY SUCCESS! Eve was blocked: "${(e as Error).message}"`);
  }

  // Mine the block to cement Bob's entry
  await totem.minePendingTransactions();

  // ==========================================
  // SCENARIO 3: POLICE INSPECTION
  // User "Charlie" is riding. Police checks his status.
  // ==========================================
  log("--- SCENARIO 3: Police Inspection ---");

  const charlieId = "CHARLIE_RIDER";

  // Setup: Mint and Enter
  totem.addTransaction(createTx("MINT", charlieId, "Kiosk C"));
  totem.addTransaction(createTx("ENTRY", charlieId, "South Station"));
  await totem.minePendingTransactions();

  console.log("Charlie is on the train. Police scans him...");

  try {
    totem.addTransaction(createTx("INSPECT", charlieId, "Police Scanner 99"));
    logSuccess("Inspection recorded valid.");
    await totem.minePendingTransactions();
  } catch (e) {
    logError(`Inspection failed unexpectedly: ${(e as Error).message}`);
  }

  // Ensure state didn't change (Should still be IN_TRANSIT)
  if (totem.getTicketStatus(charlieId) === "IN_TRANSIT") {
    logSuccess("Charlie's status remains IN_TRANSIT after inspection.");
  } else {
    logError("Inspection wrongly changed the state!");
  }

  // ==========================================
  // SCENARIO 4: THE "SNEAKY EXIT"
  // User "Dave" hops the fence to enter, but tries to scan out.
  // ==========================================
  log("--- SCENARIO 4: The Sneaky Exit ---");

  const daveId = "DAVE_THE_HACKER";

  // Mint, but DO NOT Enter
  totem.addTransaction(createTx("MINT", daveId, "Kiosk D"));
  await totem.minePendingTransactions();

  console.log("Dave minted but never scanned in. Trying to scan EXIT...");

  try {
    totem.addTransaction(createTx("EXIT", daveId, "West Station"));
    logError("SECURITY FAILURE! Dave was allowed to exit.");
  } catch (e) {
    logSuccess(`SECURITY SUCCESS! Dave was blocked: "${(e as Error).message}"`);
  }

  // ==========================================
  // FINAL LEDGER REPORT
  // ==========================================
  log("--- SIMULATION COMPLETE ---");
  console.log(`Final Chain Height: ${totem.chain.length} Blocks`);
  console.log("Validating Chain Integrity...");

  // Simple hash check
  let valid = true;
  for (let i = 1; i < totem.chain.length; i++) {
    const current = totem.chain[i];
    const prev = totem.chain[i - 1];
    if (current.previousHash !== prev.hash) valid = false;
  }

  if (valid) logSuccess("Blockchain Integrity: 100% OK");
  else logError("Blockchain Corrupted!");
}

// Execute
if (import.meta.main) {
  runSimulation();
}


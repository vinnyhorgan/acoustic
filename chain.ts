import { Block } from "./block.ts";
import { verifySignature } from "./crypto.ts";
import type { TicketStatus, Transaction } from "./types.ts";

export class Chain {
  public chain: Block[];
  public pendingTransactions: Transaction[];
  public difficulty: number;

  private DEFAULT_DURATION = 2 * 60 * 60 * 1000;

  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.pendingTransactions = [];
    this.difficulty = 2;
  }

  private createGenesisBlock(): Block {
    return new Block(0, Date.now(), [], "0");
  }

  public getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  // ========================================================
  // 🧠 THE TIME-BASED STATE MACHINE (FIXED)
  // ========================================================
  public getTicketStatus(ticketId: string): TicketStatus {
    let status: TicketStatus = "INVALID";
    let activationTime = 0;
    let validDuration = 0; // Store duration here across transactions

    // Helper to process a single transaction event
    const processTx = (tx: Transaction) => {
      if (tx.ticketId !== ticketId) return;

      if (tx.type === "MINT") {
        status = "ISSUED";
        // FIX: Capture duration from the MINT payload
        if (tx.payload.duration) {
          validDuration = tx.payload.duration;
        }
      }

      if (tx.type === "ACTIVATE" && status === "ISSUED") {
        status = "ACTIVE";
        activationTime = tx.payload.timestamp;

        // FIX: If MINT didn't specify duration, check ACTIVATE, otherwise Default
        if (validDuration === 0) {
          validDuration = tx.payload.duration || this.DEFAULT_DURATION;
        }
      }
    };

    // 1. Replay Past
    for (const block of this.chain) {
      block.transactions.forEach(processTx);
    }

    // 2. Replay Present
    this.pendingTransactions.forEach(processTx);

    // 3. LOGIC: Check Time Expiration
    if (status === "ACTIVE") {
      const now = Date.now();
      const expirationTime = activationTime + validDuration;

      if (now > expirationTime) {
        return "EXPIRED";
      }
    }

    return status;
  }

  // ========================================================
  // 🛡️ AUTH & LOGIC GATES
  // ========================================================
  public async addTransaction(tx: Transaction): Promise<void> {
    const isValidSignature = await verifySignature(
      tx.payload,
      tx.signature,
      tx.ticketId,
    );

    if (!isValidSignature) {
      throw new Error("⛔ SIGNATURE INVALID: Transaction rejected.");
    }

    const currentStatus = this.getTicketStatus(tx.ticketId);

    if (tx.type === "ACTIVATE" && currentStatus !== "ISSUED") {
      throw new Error(`Activation Failed. Ticket is ${currentStatus}`);
    }

    if (tx.type === "MINT" && currentStatus !== "INVALID") {
      throw new Error("Mint Failed. ID already exists on chain.");
    }

    if (tx.type === "INSPECT" && currentStatus === "INVALID") {
      throw new Error("Cannot inspect non-existent ticket.");
    }

    this.pendingTransactions.push(tx);
  }

  public async minePendingTransactions() {
    const previousBlock = this.getLatestBlock();

    const newBlock = await Block.create(
      previousBlock.index + 1,
      Date.now(),
      this.pendingTransactions,
      previousBlock.hash,
    );

    await newBlock.mineBlock(this.difficulty);

    this.chain.push(newBlock);
    this.pendingTransactions = [];

    return newBlock;
  }
}

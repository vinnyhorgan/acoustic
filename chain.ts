import { Block } from "./block.ts";
import { verifySignature } from "./crypto.ts";
import type { TicketStatus, Transaction } from "./types.ts";

const LEDGER_FILE = "./ledger.json"; // <--- PERSISTENCE FILE

export class Chain {
  public chain: Block[];
  public pendingTransactions: Transaction[];
  public difficulty: number;

  private DEFAULT_DURATION = 2 * 60 * 60 * 1000;

  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.pendingTransactions = [];
    this.difficulty = 2;

    // LOAD FROM DISK ON STARTUP
    this.loadChain();
  }

  // 💾 PERSISTENCE METHODS
  private async loadChain() {
    try {
      const data = await Deno.readTextFile(LEDGER_FILE);
      const loaded = JSON.parse(data);
      // Basic validation: ensure it's an array
      if (Array.isArray(loaded) && loaded.length > 0) {
        this.chain = loaded;
        console.log(`📂 Ledger loaded. Height: ${this.chain.length}`);
      }
    } catch {
      console.log("✨ No existing ledger. Starting fresh.");
    }
  }

  private async saveChain() {
    await Deno.writeTextFile(LEDGER_FILE, JSON.stringify(this.chain, null, 2));
  }

  private createGenesisBlock(): Block {
    return new Block(0, Date.now(), [], "0");
  }

  public getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  public getTicketStatus(ticketId: string): TicketStatus {
    // ... (Keep existing logic) ...
    // COPY PASTE YOUR EXISTING getTicketStatus LOGIC HERE
    let status: TicketStatus = "INVALID";
    let activationTime = 0;
    let validDuration = 0;

    const processTx = (tx: Transaction) => {
      if (tx.ticketId !== ticketId) return;
      if (tx.type === "MINT") {
        status = "ISSUED";
        if (tx.payload.duration) validDuration = tx.payload.duration;
      }
      if (tx.type === "ACTIVATE" && status === "ISSUED") {
        status = "ACTIVE";
        activationTime = tx.payload.timestamp;
        if (validDuration === 0) {
          validDuration = tx.payload.duration || this.DEFAULT_DURATION;
        }
      }
    };

    this.chain.forEach((b) => b.transactions.forEach(processTx));
    this.pendingTransactions.forEach(processTx);

    if (status === "ACTIVE") {
      if (Date.now() > activationTime + validDuration) return "EXPIRED";
    }
    return status;
  }

  public async addTransaction(tx: Transaction): Promise<void> {
    // ... (Keep existing logic) ...
    // COPY PASTE YOUR EXISTING addTransaction LOGIC HERE
    const isValidSignature = await verifySignature(
      tx.payload,
      tx.signature,
      tx.ticketId,
    );
    if (!isValidSignature) throw new Error("⛔ SIGNATURE INVALID");

    const currentStatus = this.getTicketStatus(tx.ticketId);
    if (tx.type === "ACTIVATE" && currentStatus !== "ISSUED") {
      throw new Error(`Activation Failed: ${currentStatus}`);
    }
    if (tx.type === "MINT" && currentStatus !== "INVALID") {
      throw new Error("Mint Failed: Exists");
    }
    if (tx.type === "INSPECT" && currentStatus === "INVALID") {
      throw new Error("Inspect Failed");
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

    // SAVE TO DISK AFTER MINING
    await this.saveChain();

    return newBlock;
  }
}

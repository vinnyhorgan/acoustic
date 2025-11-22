import { Block } from "./block.ts";
import type { TicketStatus, Transaction, TransactionType } from "./types.ts";

export class Chain {
  public chain: Block[];
  public pendingTransactions: Transaction[];
  public difficulty: number;

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

  public getTicketStatus(ticketId: string): TicketStatus {
    let status: TicketStatus = "INVALID";

    // step 1) replay committed blocks (the past)
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.ticketId === ticketId) {
          status = this.applyTransition(status, tx.type);
        }
      }
    }

    // step 2) replay pending transactions (the present/mempool)
    // absolutely vital to prevent "double spends" before the block is mined :O
    for (const tx of this.pendingTransactions) {
      if (tx.ticketId === ticketId) {
        status = this.applyTransition(status, tx.type);
      }
    }

    return status;
  }

  private applyTransition(
    current: TicketStatus,
    action: TransactionType,
  ): TicketStatus {
    if (action === "MINT") return "ISSUED";

    if (action === "INSPECT") return current;

    switch (current) {
      case "INVALID":
        return "INVALID";

      case "ISSUED":
        if (action === "ENTRY") return "IN_TRANSIT";
        return "ISSUED";

      case "IN_TRANSIT":
        if (action === "EXIT") return "USED";
        return "IN_TRANSIT";

      case "USED":
        return "USED";

      default:
        return current;
    }
  }

  public addTransaction(tx: Transaction): void {
    const currentStatus = this.getTicketStatus(tx.ticketId);

    if (tx.type === "ENTRY" && currentStatus !== "ISSUED") {
      throw new Error("entry denied, ticket is " + currentStatus);
    }

    if (tx.type === "MINT" && currentStatus !== "INVALID") {
      throw new Error("Mint failed. ID already exists on chain.");
    }

    if (tx.type === "EXIT" && currentStatus !== "IN_TRANSIT") {
      throw new Error("exit denied, ticket was not scanned at entry");
    }

    if (tx.type === "INSPECT" && currentStatus !== "IN_TRANSIT") {
      throw new Error("inspection failed. ticket is " + currentStatus);
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
    this.pendingTransactions = []; // clear mempool

    return newBlock;
  }
}

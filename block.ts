import { BlockData, Transaction } from "./types.ts";

export class Block implements BlockData {
  // interface properties
  public index: number;
  public timestamp: number;
  public transactions: Transaction[];
  public previousHash: string;
  public hash: string;
  public nonce: number;

  constructor(
    index: number,
    timestamp: number,
    transactions: Transaction[],
    previousHash: string = "",
  ) {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.hash = ""; // calculated later
    this.nonce = 0;
  }

  static async create(
    index: number,
    timestamp: number,
    transactions: Transaction[],
    previousHash: string,
  ): Promise<Block> {
    const block = new Block(index, timestamp, transactions, previousHash);
    block.hash = await block.calculateHash();
    return block;
  }

  async calculateHash(): Promise<string> {
    // This JSON.stringify automatically handles the new Public Keys and Signatures
    // because they are just strings inside the Transaction objects.
    const strData = this.index.toString() +
      this.previousHash +
      this.timestamp.toString() +
      JSON.stringify(this.transactions) +
      this.nonce.toString();

    const msgUint8 = new TextEncoder().encode(strData);

    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // 4. The Miner (Proof of Work)
  async mineBlock(difficulty: number) {
    const target = Array(difficulty + 1).join("0");

    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = await this.calculateHash();

      // Visual feedback
      if (this.nonce % 500 === 0) {
        await Deno.stdout.write(
          new TextEncoder().encode(
            `\r⛏️  Mining Block #${this.index}... Nonce: ${this.nonce}`,
          ),
        );
      }
    }
    console.log(`\n✅ Block #${this.index} Mined: ${this.hash}`);
  }
}

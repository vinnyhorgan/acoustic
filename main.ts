import { Block } from "./block.ts";

// Mock Transaction
const tx = {
  id: "tx1",
  type: "MINT" as const,
  ticketId: "totem_123",
  payload: { price: "2.50", timestamp: Date.now() },
  signature: "sig",
};

console.log("--- STARTING MINER TEST ---");
const block = await Block.create(1, Date.now(), [tx], "0000abc");

console.log("Initial Hash:", block.hash);
console.log("Mining with difficulty 3...");

const start = Date.now();
await block.mineBlock(3); // Should take a second or two
const end = Date.now();

console.log(`Mining took ${end - start}ms`);


import { Application, Router } from "@oak/oak";
import { Chain } from "./chain.ts";
import type {
  ApiResponse,
  TicketPayload,
  Transaction,
  TransactionType,
} from "./types.ts";

// 1. Initialize the Blockchain Node
const totem = new Chain();
console.log(
  `🦕 Totem Protocol Active. Genesis: ${totem.chain[0].hash.slice(0, 10)}...`,
);

// 2. Setup Web Server
const app = new Application();
const router = new Router();

// 3. Middleware: Error Handling & Logging
app.use(async (ctx, next) => {
  try {
    await next();
    const rt = ctx.response.headers.get("X-Response-Time");
    console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
  } catch (err) {
    console.error("API Error:", err);
    ctx.response.status = 400; // Bad Request by default
    ctx.response.body = {
      success: false,
      error: err instanceof Error ? err.message : "Unknown Error",
    } as ApiResponse<null>;
  }
});

// 4. Middleware: CORS (Allow Frontend Access) TODO:

// ==========================================
// 5. API ROUTES
// ==========================================

// GET /chain
// Returns the full ledger for visualization
router.get("/chain", (ctx) => {
  ctx.response.body = {
    success: true,
    data: {
      blocks: totem.chain,
      pending: totem.pendingTransactions,
      difficulty: totem.difficulty,
      height: totem.chain.length,
    },
  } as ApiResponse<any>;
});

// GET /status/:id
// Checks if a ticket is VALID, ACTIVE, or EXPIRED
router.get("/status/:id", (ctx) => {
  const ticketId = ctx.params.id;
  if (!ticketId) throw new Error("Ticket ID required");

  const status = totem.getTicketStatus(ticketId);

  ctx.response.body = {
    success: true,
    data: { ticketId, status },
  } as ApiResponse<any>;
});

// POST /submit
// The Core Input. Client must send a signed payload.
// Body: { type, ticketId, payload, signature }
router.post("/submit", async (ctx) => {
  const body = await ctx.request.body.json();

  // Destructure expected fields
  const { type, ticketId, payload, signature } = body;

  // Basic Validation
  if (!type || !ticketId || !payload || !signature) {
    throw new Error(
      "Missing fields. Required: type, ticketId, payload, signature.",
    );
  }

  // Construct the Transaction Object
  // Note: The server assigns the Transaction ID (hash of the event),
  // but the Security relies on the 'signature' field.
  const tx: Transaction = {
    id: crypto.randomUUID(),
    type: type as TransactionType,
    ticketId: ticketId,
    payload: payload as TicketPayload,
    signature: signature,
  };

  // 1. Add to Mempool (This runs the Crypto Verify + State Machine checks)
  await totem.addTransaction(tx);

  // 2. Instant Mine (For Hackathon Demo)
  // In production, this would happen in the background.
  const newBlock = await totem.minePendingTransactions();

  ctx.response.body = {
    success: true,
    data: {
      status: "ACCEPTED",
      txId: tx.id,
      blockIndex: newBlock.index,
      blockHash: newBlock.hash,
    },
  } as ApiResponse<any>;
});

// ==========================================
// 6. STARTUP
// ==========================================
app.use(router.routes());
app.use(router.allowedMethods());

console.log("🚀 Server running on http://localhost:8000");
await app.listen({ port: 8000 });

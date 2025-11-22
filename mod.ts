import { Application, Context, Router } from "@oak/oak";
import { Chain } from "./chain.ts";
import type {
  ApiResponse,
  TicketPayload,
  Transaction,
  TransactionType,
} from "./types.ts";

// 1. Initialize Blockchain
const totem = new Chain();
console.log(
  `🦕 Totem Protocol Active. Genesis: ${totem.chain[0].hash.slice(0, 10)}...`,
);

// 2. Setup Server
const app = new Application();
const router = new Router();

// 3. Middleware: Logging & Errors
app.use(async (ctx: Context, next) => {
  try {
    await next();
    const rt = ctx.response.headers.get("X-Response-Time");
    console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
  } catch (err) {
    console.error("API Error:", err);
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      error: err instanceof Error ? err.message : "Unknown Error",
    } as ApiResponse<null>;
  }
});

// 4. Middleware: CORS
// We allow ALL origins so your laptop React app can hit the VPS

// ==========================================
// 5. API ROUTES
// ==========================================

// GET /chain
router.get("/chain", (ctx: Context) => {
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
router.get("/status/:id", (ctx: Context) => {
  const ticketId = ctx.params?.id;
  if (!ticketId) throw new Error("Ticket ID required");

  const status = totem.getTicketStatus(ticketId);

  ctx.response.body = {
    success: true,
    data: { ticketId, status },
  } as ApiResponse<any>;
});

// POST /submit
router.post("/submit", async (ctx: Context) => {
  if (!ctx.request.hasBody) {
    throw new Error("No data provided");
  }

  const body = await ctx.request.body.json();
  const { type, ticketId, payload, signature } = body;

  if (!type || !ticketId || !payload || !signature) {
    throw new Error("Missing fields: type, ticketId, payload, signature.");
  }

  const tx: Transaction = {
    id: crypto.randomUUID(),
    type: type as TransactionType,
    ticketId: ticketId,
    payload: payload as TicketPayload,
    signature: signature,
  };

  await totem.addTransaction(tx);
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

// BIND TO 0.0.0.0 (Crucial for VPS)
const PORT = 8000;
console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
await app.listen({ port: PORT, hostname: "0.0.0.0" });

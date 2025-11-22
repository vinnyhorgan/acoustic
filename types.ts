// all types go here

// actions
// CHANGED: Removed ENTRY/EXIT (no gates). Added ACTIVATE (starts the timer).
export type TransactionType = "MINT" | "INSPECT" | "ACTIVATE";

// state
export type TicketStatus =
  | "ISSUED" // ready to use (minted but not started)
  | "ACTIVE" // CHANGED: timer is running, valid for travel
  | "EXPIRED" // CHANGED: timer ran out
  | "USED" // (optional) manually marked as finished
  | "INVALID"; // id does not exist on chain

// payload
export interface TicketPayload {
  price?: string;
  location?: string;
  deviceId?: string;
  timestamp: number;
  duration?: number; // NEW: how long is this valid in ms? (e.g. 2 hours)
}

// transaction
// atomic unit of the ledger
export interface Transaction {
  id: string; // unique tx hash
  type: TransactionType;
  ticketId: string; // This is now the PUBLIC KEY of the user
  payload: TicketPayload;
  signature: string; // cryptographic signature proving origin
}

// block structure
// the explorer should be able to visualize this
export interface BlockData {
  index: number;
  timestamp: number;
  transactions: Transaction[];
  previousHash: string;
  hash: string;
  nonce: number;
}

// api communication
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}


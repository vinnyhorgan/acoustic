// all types go here

// actions
export type TransactionType = "MINT" | "INSPECT" | "ENTRY" | "EXIT";

// state
export type TicketStatus =
  | "ISSUED" // ready to use (minted or exited)
  | "IN_TRANSIT" // currently inside the network (cannot enter again, double spend)
  | "USED" // single-use ticket has finished its trip
  | "INVALID"; // id does not exist on chain

// payload
export interface TicketPayload {
  price?: string; // eg "2.50 EUR"
  location?: string; // ec "central station"
  deviceId?: string; // who signed this?
  timestamp: number; // when?
}

// transaction
// atomic unit of the ledger
export interface Transaction {
  id: string; // unique tx hash
  type: TransactionType;
  ticketId: string; // totem id
  payload: TicketPayload;
  signature: string; // cryptographic signature proving origin
}

// block structure
// the explorer should be able to visualize this
export interface BlockData {
  index: number;
  timestamp: number; // when the block was mined
  transactions: Transaction[];
  previousHash: string; // link to the past
  hash: string; // seal of the present
  nonce: number; // proof of work
}

// api communication
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

import { generateKeyPair, signData } from "./crypto.ts";
import * as c from "https://deno.land/std@0.208.0/fmt/colors.ts";

// CONFIG
const HOST = Deno.env.get("TOTEM_IP") || "83.229.83.184";
const API_URL = `http://${HOST}:8000`;
const FILE_PATH = "./wallets.json";

// DATA MODEL
interface Wallet {
  name: string;
  id: string; // Public Key
  privateKey: JsonWebKey; // Stored securely
  status: string; // Last known status
}

// ==========================================
// 💾 STATE MANAGEMENT
// ==========================================
async function loadWallets(): Promise<Wallet[]> {
  try {
    const text = await Deno.readTextFile(FILE_PATH);
    return JSON.parse(text);
  } catch {
    return [];
  }
}

async function saveWallets(wallets: Wallet[]) {
  await Deno.writeTextFile(FILE_PATH, JSON.stringify(wallets, null, 2));
}

// ==========================================
// 🔐 CRYPTO UTILS
// ==========================================
async function getSignerKey(w: Wallet): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "jwk",
    w.privateKey,
    { name: "Ed25519", namedCurve: "Ed25519" },
    true,
    ["sign"],
  );
}

// ==========================================
// 🌐 API CLIENT
// ==========================================
async function submitTx(type: string, wallet: Wallet, payload: any) {
  try {
    const privateKey = await getSignerKey(wallet);
    const signature = await signData(payload, privateKey);

    console.log(c.gray(`\n> Sending ${type}...`));

    const res = await fetch(`${API_URL}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        ticketId: wallet.id,
        payload,
        signature,
      }),
    });

    const json = await res.json();

    if (json.success) {
      console.log(c.green(`✅ Success! Block Index: ${json.data.blockIndex}`));
      return true;
    } else {
      console.log(c.red(`⛔ Error: ${json.error}`));
      return false;
    }
  } catch (e) {
    console.log(c.red(`💥 Connection Error: ${API_URL} unreachable.`));
    return false;
  }
}

async function checkStatus(wallet: Wallet) {
  try {
    const res = await fetch(`${API_URL}/status/${wallet.id}`);
    const json = await res.json();
    if (json.success) {
      return json.data.status;
    }
  } catch {}
  return "UNKNOWN";
}

// ==========================================
// 🎮 MENU ACTIONS
// ==========================================

async function createWallet(wallets: Wallet[]) {
  const name = prompt("Enter Name (e.g. Judge1):");
  if (!name) return;

  console.log("Generating keys...");
  const { keyPair, publicKey } = await generateKeyPair();
  const jwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  const newWallet: Wallet = {
    name,
    id: publicKey,
    privateKey: jwk,
    status: "NEW",
  };

  wallets.push(newWallet);
  await saveWallets(wallets);
  console.log(c.green(`Created wallet for ${name}!`));
}

async function manageWallet(wallet: Wallet) {
  while (true) {
    // Refresh status live
    const liveStatus = await checkStatus(wallet);
    wallet.status = liveStatus;

    console.clear();
    console.log(c.bgBlue(`  MANAGING: ${wallet.name}  `));
    console.log(`ID:     ${c.gray(wallet.id.slice(0, 16) + "...")}`);
    console.log(
      `Status: ${
        liveStatus === "ACTIVE" ? c.green(liveStatus) : c.yellow(liveStatus)
      }`,
    );
    console.log("----------------------------");
    console.log("[1] Mint Ticket (Buy)");
    console.log("[2] Activate Ticket (Ride)");
    console.log("[3] Inspect (Police Scan)");
    console.log("[0] Back");

    const choice = prompt("Select Action:");

    if (choice === "1") {
      await submitTx("MINT", wallet, {
        price: "5.00",
        timestamp: Date.now(),
        duration: 1000 * 60 * 60 * 2, // 2 Hours
        deviceId: "CLI_KIOSK",
      });
    }

    if (choice === "2") {
      await submitTx("ACTIVATE", wallet, {
        location: "Demo Station",
        timestamp: Date.now(),
        deviceId: "PHONE_APP",
      });
    }

    if (choice === "3") {
      await submitTx("INSPECT", wallet, {
        location: "Train IC1",
        timestamp: Date.now(),
        deviceId: "POLICE_SCANNER",
      });
    }

    if (choice === "0") break;

    // Wait for user to read output before clearing screen
    prompt(c.gray("\n[Enter] to continue..."));
  }
  // Save any status updates
  await saveWallets(await loadWallets());
}

// ==========================================
// 🚀 MAIN LOOP
// ==========================================
async function main() {
  while (true) {
    const wallets = await loadWallets();

    console.clear();
    console.log(c.bold("TOTEM ADMIN CONSOLE"));
    console.log(c.gray(`Connected to: ${API_URL}`));
    console.log("---------------------");

    // List Wallets
    if (wallets.length === 0) {
      console.log(c.gray("(No wallets found)"));
    } else {
      wallets.forEach((w, i) => {
        const s = w.status;
        const color = s === "ACTIVE"
          ? c.green
          : s === "ISSUED"
          ? c.cyan
          : c.gray;
        console.log(`${i + 1}. ${c.bold(w.name)} \t [${color(s)}]`);
      });
    }

    console.log("---------------------");
    console.log("[N] New Wallet");
    console.log("[Q] Quit");

    const choice = prompt("\nSelect Wallet # or Option:");

    if (choice?.toLowerCase() === "q") Deno.exit(0);
    if (choice?.toLowerCase() === "n") {
      await createWallet(wallets);
      continue;
    }

    const idx = parseInt(choice || "0") - 1;
    if (wallets[idx]) {
      await manageWallet(wallets[idx]);
    }
  }
}

if (import.meta.main) main();

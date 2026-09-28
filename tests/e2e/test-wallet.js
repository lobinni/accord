/**
 * The ephemeral wallet used by the in-app end-to-end run. It exists only in
 * local storage of the headless session, is funded from the StudioNet
 * faucet, and is discarded afterwards. It never touches the real user wallet.
 *
 * Usage (headless browser run):
 *   node tests/e2e/test-wallet.js
 */

const TEST_WALLET_KEY = "accord.e2e.testWallet";

function randomKey() {
  const bytes = new Uint8Array(32);
  (globalThis.crypto ?? require("node:crypto").webcrypto).getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function ensureTestWallet() {
  if (typeof window === "undefined") {
    return { note: "run inside the headless browser context" };
  }
  const stored = window.localStorage.getItem(TEST_WALLET_KEY);
  if (stored) return JSON.parse(stored);
  const wallet = {
    privateKey: `0x${randomKey()}`,
    createdAt: new Date().toISOString(),
    purpose: "single in-app e2e run; discard after use",
  };
  window.localStorage.setItem(TEST_WALLET_KEY, JSON.stringify(wallet));
  return wallet;
}

export function discardTestWallet() {
  if (typeof window !== "undefined") window.localStorage.removeItem(TEST_WALLET_KEY);
}

if (typeof require !== "undefined" && require.main === module) {
  console.log("This helper runs inside the headless browser context.");
}

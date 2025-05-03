import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import 'dotenv/config';

// configure connection to solana devnet (or load from env)
const network = process.env.SOLANA_NETWORK || 'devnet';
export const connection = new Connection(clusterApiUrl(network as any), 'confirmed');

// load wallet from the default solana cli path or env variable
function loadWallet(): Keypair {
  let walletPath: string;
  if (process.env.WALLET_PATH) {
    walletPath = process.env.WALLET_PATH;
  } else {
    // default path based on network
    const networkId = network === 'mainnet-beta' ? 'id.json' : `${network}.id.json`;
    walletPath = path.join(os.homedir(), '.config', 'solana', networkId);
  }

  if (!fs.existsSync(walletPath)) {
    console.error(`Wallet file not found at path: ${walletPath}`);
    console.error('Please ensure the Solana CLI is configured or set the WALLET_PATH environment variable.');
    process.exit(1);
  }

  try {
    const secretKeyString = fs.readFileSync(walletPath, { encoding: 'utf8' });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error(`Error loading wallet from ${walletPath}:`, error);
    process.exit(1);
  }
}

export const wallet = loadWallet();

// helper function for logging signatures
export function logSignature(signature: string) {
    console.log(`✅ Transaction successful: https://solscan.io/tx/${signature}?cluster=${network}`);
}

// helper function to validate public key strings
export function isValidPublicKey(key: string): boolean {
    if (!key) return false;
    try {
        new PublicKey(key);
        return true;
    } catch (e) {
        return false;
    }
}

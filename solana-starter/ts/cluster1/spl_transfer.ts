import {
  Commitment,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";
import wallet from "/Users/micaiahreid/.config/solana/id.json";

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection(
  "https://turbine-solanad-4cde.devnet.rpcpool.com/168dd64f-ce5e-4e19-a836-f6482ad6b396",
  commitment
);

// Mint address
const mint = new PublicKey("A1xMjCgjTkM1TwbGSHHxJecVoLQ3UNyDa84cXCKuGn3w");

// Recipient address
const to = new PublicKey("9aqJDu144RvEdowiz8h7T48Un4cWssDaRV9Mt78B8BVq");

(async () => {
  try {
    // Get the token account of the fromWallet address, and if it does not exist, create it
    const senderAta = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      keypair.publicKey
    );
    console.log(`Sender ata is: ${senderAta.address.toBase58()}`);
    // Get the token account of the toWallet address, and if it does not exist, create it
    const receiverAta = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      to
    );
    console.log(`Receiver ata is: ${receiverAta.address.toBase58()}`);
    // Transfer the new token to the "toTokenAccount" we just created
    const transferTx = await transfer(
      connection,
      keypair,
      senderAta.address,
      receiverAta.address,
      keypair.publicKey,
      1
    );
    console.log(`Your transfer txid: ${transferTx}`);
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();

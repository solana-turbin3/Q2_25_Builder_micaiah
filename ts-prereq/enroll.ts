const crypto = require("crypto");
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program, Wallet, AnchorProvider } from "@coral-xyz/anchor";
import { IDL } from "./programs/Turbin3_prereq";
import type { Turbin3Prereq } from "./programs/Turbin3_prereq";
import wallet from "./my-wallet.json";
import { hash } from "@coral-xyz/anchor/dist/cjs/utils/sha256";

const keypair = Keypair.fromSecretKey(
  new Uint8Array(wallet as ArrayLike<number>)
);

const connection = new Connection("https://api.devnet.solana.com");
const github = Buffer.from("MicaiahReid", "utf8");
const provider = new AnchorProvider(connection, new Wallet(keypair), {
  commitment: "confirmed",
});
const program: Program = new Program(IDL, provider);
console.log("buffer", Buffer.from("prereq"));

const enrollmentSeeds = [
  [112, 114, 101, 81, 50, 50, 53],
  //   Buffer.from("prereq"),
  keypair.publicKey.toBuffer(),
];
const [enrollmentKey, _bump] = PublicKey.findProgramAddressSync(
  enrollmentSeeds as any,
  program.programId
);
// (async () => {
//   try {
//     const txhash = await program.methods
//       .submit(github)
//       .accounts({
//         signer: keypair.publicKey,
//         prereq: enrollmentKey,
//       })
//       .signers([keypair])
//       .rpc();
//     console.log(`Success! Check out your TX here:
//     https://explorer.solana.com/tx/${txhash}?cluster=devnet`);
//   } catch (e) {
//     console.error(`Oops, something went wrong: ${e}`);
//   }
// })();
// (async () => {
//   try {
//     const txhash = await program.methods
//       .clean()
//       .accounts({
//         signer: keypair.publicKey,
//         prereq: enrollmentKey,
//       })
//       .signers([keypair])
//       .rpc();
//     console.log(`Success! Check out your TX here:
//     https://explorer.solana.com/tx/${txhash}?cluster=devnet`);
//   } catch (e) {
//     console.error(`Oops, something went wrong: ${e}`);
//   }
// })();

function computeAnchorDiscriminator(instructionName: string) {
  const seed = `global:${instructionName}`;
  const hash = crypto.createHash("sha256").update(seed).digest();
  const discriminator = hash.slice(0, 8);
  return discriminator;
}

const discriminator = computeAnchorDiscriminator("submit");

console.log("discriminator", discriminator);

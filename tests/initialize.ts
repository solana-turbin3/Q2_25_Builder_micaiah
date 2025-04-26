import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { InvestInSol } from "../target/types/invest_in_sol";
import wallet from "../wallet.json";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction,
} from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

// What do we initialize:
//    - Tokens (Convertible note and protocol token)
//    - NFT Collection
//    - A vault pda
//        - Holds:
//            - PT
//            - Mint authority / Metadata authority for nfts
describe.only("does initialize the protocol", async () => {
  const program = anchor.workspace.investInSol as Program<InvestInSol>;

  /// Role accounts
  const initializer = Keypair.fromSecretKey(new Uint8Array(wallet));
  const authority = Keypair.generate();

  // State accounts
  const config = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  )[0];

  // Convertible note accounts
  const cnMint = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("cn"), config.toBuffer()],
    program.programId
  )[0];

  const cnMetadata = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      cnMint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  )[0];

  // Protocol token accounts
  const ptMint = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("pt"), config.toBuffer()],
    program.programId
  )[0];

  const ptMetadata = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      ptMint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  )[0];

  // NFT Options accounts
  const collectionMint = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("collection_mint"), config.toBuffer()],
    program.programId
  )[0];
  const collectionMetadata = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      collectionMint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  )[0];
  const collectionMasterEdition = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      collectionMint.toBuffer(),
      Buffer.from("edition"),
    ],
    METADATA_PROGRAM_ID
  )[0];

  anchor.setProvider(anchor.AnchorProvider.local("http://localhost:8899"));
  const connection = new Connection("http://localhost:8899", {
    commitment: "confirmed",
  });

  it.only("creates vault PDA", async () => {
    const account = await program.provider.connection.getAccountInfo(
      initializer.publicKey
    );
    const recentBlockhash =
      await program.provider.connection.getLatestBlockhash();

    const tx = await program.methods
      .initialize(authority.publicKey)
      .accountsPartial({
        initializer: initializer.publicKey,
        // CN
        cnMint,
        cnMetadata,
        // PT
        ptMint,
        ptMetadata,
        // NFT
        collectionMint,
        collectionMetadata,
        // collectionMasterEdition,

        tokenProgram: TOKEN_2022_PROGRAM_ID,
        sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .signers([initializer]);
    const theTx = await tx.transaction();
    theTx.recentBlockhash = recentBlockhash.blockhash;
    theTx.feePayer = initializer.publicKey;
    theTx.sign(initializer);
    const signature = await sendAndConfirmRawTransaction(
      connection,
      theTx.serialize()
    );
  });

  it("creates treasury PDA", async () => {
    // Add your test here.
    // const tx = await program.methods.initialize().rpc();
    // console.log("Your transaction signature", tx);
    // now generate PDA account address via seed and confirm it exists on-chain
  });

  it("creates convertible note token", async () => {
    // Add your test here.
    // const tx = await program.methods.initialize().rpc();
    // console.log("Your transaction signature", tx);
    // get total supply, should be 0.
    // get metadata for token, check name
  });

  it("creates protocol token", async () => {
    // Add your test here.
    // const tx = await program.methods.initialize().rpc();
    // console.log("Your transaction signature", tx);
    // get total supply, should be 0.
    // get metadata for token, check name
  });

  it("creates NFT collection", async () => {
    // Add your test here.
    // const tx = await program.methods.initialize().rpc();
    // console.log("Your transaction signature", tx);
  });
});

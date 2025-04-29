import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { InvestInSol } from "../target/types/invest_in_sol";
import wallet from "../wallet.json";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction
  
} from "@solana/web3.js";

import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { expect } from "chai";

const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

// For this protocol, we initialize:
//    - Tokens (Convertible note and protocol token)
//    - NFT Collection
//    - A vault pda
//        - Holds:
//            - PT
//            - Mint authority / Metadata authority for nfts
describe("initialize protocol", async () => {
  const program = anchor.workspace.investInSol as Program<InvestInSol>;

  /// Roles accounts
  const initializer = Keypair.fromSecretKey(new Uint8Array(wallet));
  /// this should likely be initializer or is it a separate admin key?
  const authority = Keypair.generate();

  ///
  //Config / State accounts
  ///
  const config = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  )[0];

  ///
  // Convertible note accounts
  ///
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

  ///
  //Protocol token accounts
  ///
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

  ///
  // NFT Options accounts
  ///
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
  ///
  //CN Token
  ///
  it.only("initializes convertible note", async () => {
    const account = await program.provider.connection.getAccountInfo(
      initializer.publicKey
    );
    const recentBlockhash =
      await program.provider.connection.getLatestBlockhash();

    const tx = await program.methods
      .initializeConvertibleNote()
      .accountsPartial({
        initializer: initializer.publicKey,
        cnMint: cnMint,
        cnMetadata: cnMetadata,
        config,
        sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        metadataProgram: METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([initializer]);

    const theTx = await tx.transaction();
    theTx.recentBlockhash = recentBlockhash.blockhash;
    console.log(recentBlockhash.blockhash);
    theTx.feePayer = initializer.publicKey;
    theTx.sign(initializer);
    const signature = await sendAndConfirmRawTransaction(
      connection,
      theTx.serialize()
    );
    

    console.log("transaction confirmed:",)

    // verify the mint was created
    const mintAccount = await connection.getAccountInfo(cnMint);
    expect(mintAccount).to.not.be.null;
    expect(mintAccount?.owner).to.equal(TOKEN_2022_PROGRAM_ID);

    // verify the metadata was created
    const metadataAccount = await connection.getAccountInfo(cnMetadata);
    expect(metadataAccount).to.not.be.null;
    expect(metadataAccount?.owner).to.equal(METADATA_PROGRAM_ID);
  });

  ///
  //PT Token
  ///

  it("initializes protocol token", async () => {
    const account = await program.provider.connection.getAccountInfo(
      initializer.publicKey
    );
    const recentBlockhash =
      await program.provider.connection.getLatestBlockhash();

    const tx = await program.methods
      .initializeProtocolToken()
      .accountsPartial({
        initializer: initializer.publicKey,
        ptMint: ptMint,
        ptMetadata: ptMetadata,
        config,
        sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        metadataProgram: METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
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

    // verify the mint was created
    const mintAccount = await connection.getAccountInfo(ptMint);
    expect(mintAccount).to.not.be.null;
    expect(mintAccount?.owner).to.equal(TOKEN_2022_PROGRAM_ID);

    // verify the metadata was created
    const metadataAccount = await connection.getAccountInfo(ptMetadata);
    expect(metadataAccount).to.not.be.null;
    expect(metadataAccount?.owner).to.equal(METADATA_PROGRAM_ID);
  });

  ///
  //NFT collection
  ///

  it("initializes nft collection", async () => {
    const account = await program.provider.connection.getAccountInfo(
      initializer.publicKey
    );
    const recentBlockhash =
      await program.provider.connection.getLatestBlockhash();

    const tx = await program.methods
      .initializeNftCollection()
      .accountsPartial({
        initializer: initializer.publicKey,
        collectionMint: collectionMint,
        collectionMetadata: collectionMetadata,
        config,
        sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        metadataProgram: METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
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

    // verify the mint was created
    const mintAccount = await connection.getAccountInfo(collectionMint);
    expect(mintAccount).to.not.be.null;
    expect(mintAccount?.owner).to.equal(TOKEN_2022_PROGRAM_ID);

    // verify the metadata was created
    const metadataAccount = await connection.getAccountInfo(collectionMetadata);
    expect(metadataAccount).to.not.be.null;
    expect(metadataAccount?.owner).to.equal(METADATA_PROGRAM_ID);
  });
});

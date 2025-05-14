import * as anchor from "@coral-xyz/anchor";
import { Program, Wallet } from "@coral-xyz/anchor";
import { InvestInSol } from "../target/types/invest_in_sol";
import { assert } from "chai";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  CN_MINT_ADDRESS,
  PT_MINT_ADDRESS,
  COLLECTION_MINT_ADDRESS,
  initializeProtocol,
  parseAnchorError,
  findMetadataPda,
  findMasterEditionPda,
  requestAirdrop,
  TOKEN_METADATA_PROGRAM_ID,
  localSendAndConfirmTransaction,
} from "./utils";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

describe("admin instructions (with hardcoded mints)", () => {
  // configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.InvestInSol as Program<InvestInSol>;

  const initializer = provider.wallet as Wallet;
  const testUser = Keypair.generate(); // user for deposit/convert tests
  let configPda: PublicKey;
  let treasuryPda: PublicKey; // need for deposit helper

  const cnMint = CN_MINT_ADDRESS;
  const ptMint = PT_MINT_ADDRESS;
  const collectionMint = COLLECTION_MINT_ADDRESS;

  before(async () => {
    // airdrop initializer and test user
    await requestAirdrop(provider, initializer.publicKey, 2 * LAMPORTS_PER_SOL);
    await requestAirdrop(provider, testUser.publicKey, 2 * LAMPORTS_PER_SOL);

    // initialize the protocol using the helper from utils
    // pass initializer.payer as Keypair because it needs to sign
    const optionDurationSeconds = 60 * 60 * 24 * 30; // default 7 days for admin tests
    const initResult = await initializeProtocol(
      program,
      provider,
      initializer.payer,
      cnMint,
      ptMint,
    );
    configPda = initResult.configPda;
    treasuryPda = initResult.treasuryPda; // store treasury PDA
    treasuryPda = initResult.treasuryPda; // store vault PDA

    // verify initial state
    const configAccount = await program.account.config.fetch(configPda);
    assert.isFalse(configAccount.locked, "initial global lock should be false");
    assert.isTrue(
      configAccount.depositLocked,
      "initial deposit lock should be true"
    );
    assert.isTrue(
      configAccount.convertLocked,
      "initial convert lock should be true"
    );
    // assuming initializer is the authority after init for testing purposes
    assert.ok(
      configAccount.authority.equals(initializer.publicKey),
      "initializer should be authority"
    );
  });

  it("allows authority to update all locks", async () => {
    console.log("testing update all locks...");
    let tx = await program.methods
      .updateLocks(true, true, true) // lock everything
      .accounts({
        authority: initializer.publicKey,
        config: configPda,
      })
      .signers([initializer.payer]) // use payer from wallet
      .transaction();

      await localSendAndConfirmTransaction(provider, tx, initializer.publicKey, [initializer.payer])

    const configAccountLocked = await program.account.config.fetch(configPda);
    assert.isTrue(configAccountLocked.locked, "global lock should be true");
    assert.isTrue(
      configAccountLocked.depositLocked,
      "deposit lock should be true"
    );
    assert.isTrue(
      configAccountLocked.convertLocked,
      "convert lock should be true"
    );

    // unlock everything again
    await program.methods
      .updateLocks(false, false, false)
      .accounts({
        authority: initializer.publicKey,
        config: configPda,
      })
      .signers([initializer.payer])
      .rpc({ commitment: "confirmed" });

    const configAccountUnlocked = await program.account.config.fetch(configPda);
    assert.isFalse(
      configAccountUnlocked.locked,
      "global lock should be false after unlock"
    );
    assert.isFalse(
      configAccountUnlocked.depositLocked,
      "deposit lock should be false after unlock"
    );
    assert.isFalse(
      configAccountUnlocked.convertLocked,
      "convert lock should be false after unlock"
    );
    console.log("update all locks test finished.");
  });

  it("allows authority to update only deposit lock", async () => {
    console.log("testing update deposit lock only...");
    await program.methods
      .updateLocks(null, true, null) // lock only deposit
      .accounts({
        authority: initializer.publicKey,
        config: configPda,
      })
      .signers([initializer.payer])
      .rpc({ commitment: "confirmed" });

    const configAccount = await program.account.config.fetch(configPda);
    assert.isFalse(configAccount.locked, "global lock should remain false");
    assert.isTrue(configAccount.depositLocked, "deposit lock should be true");
    assert.isFalse(
      configAccount.convertLocked,
      "convert lock should remain false"
    );

    // reset
    await program.methods
      .updateLocks(null, false, null)
      .accounts({ authority: initializer.publicKey, config: configPda })
      .signers([initializer.payer])
      .rpc({ commitment: "confirmed" });
    console.log("update deposit lock test finished.");
  });

  it("allows authority to update only convert lock", async () => {
    console.log("testing update convert lock only...");
    await program.methods
      .updateLocks(null, null, true) // lock only convert
      .accounts({
        authority: initializer.publicKey,
        config: configPda,
      })
      .signers([initializer.payer])
      .rpc({ commitment: "confirmed" });

    const configAccount = await program.account.config.fetch(configPda);
    assert.isFalse(configAccount.locked, "global lock should remain false");
    assert.isFalse(
      configAccount.depositLocked,
      "deposit lock should remain false"
    );
    assert.isTrue(configAccount.convertLocked, "convert lock should be true");

    // reset
    await program.methods
      .updateLocks(null, null, false)
      .accounts({ authority: initializer.publicKey, config: configPda })
      .signers([initializer.payer])
      .rpc({ commitment: "confirmed" });
    console.log("update convert lock test finished.");
  });

  it("allows authority to update only global lock", async () => {
    console.log("testing update global lock only...");
    await program.methods
      .updateLocks(true, null, null) // lock only global
      .accounts({
        authority: initializer.publicKey,
        config: configPda,
      })
      .signers([initializer.payer])
      .rpc({ commitment: "confirmed" });

    const configAccount = await program.account.config.fetch(configPda);
    assert.isTrue(configAccount.locked, "global lock should be true");
    assert.isFalse(
      configAccount.depositLocked,
      "deposit lock should remain false"
    );
    assert.isFalse(
      configAccount.convertLocked,
      "convert lock should remain false"
    );

    // reset
    await program.methods
      .updateLocks(false, null, null)
      .accounts({ authority: initializer.publicKey, config: configPda })
      .signers([initializer.payer])
      .rpc({ commitment: "confirmed" });
    console.log("update global lock test finished.");
  });

  it("fails if non-authority tries to update locks", async () => {
    console.log("testing non-authority update failure...");
    const nonAuthority = Keypair.generate();
    // airdrop nonAuthority
    await requestAirdrop(
      provider,
      nonAuthority.publicKey,
      1 * LAMPORTS_PER_SOL
    );

    try {
      await program.methods
        .updateLocks(true, true, true)
        .accounts({
          authority: nonAuthority.publicKey, // use wrong authority
          config: configPda,
        })
        .signers([nonAuthority]) // sign with wrong authority
        .rpc({ commitment: "confirmed" });
      assert.fail("transaction should have failed due to incorrect authority");
    } catch (err) {
      const anchorError = parseAnchorError(err);
      assert.ok(anchorError, "should be an AnchorError (non-authority)");
      // check the specific error code from the AdminError enum
      assert.strictEqual(
        anchorError.error.errorCode.code,
        "Unauthorized",
        "error code mismatch (non-authority)"
      );
      // assert.strictEqual(anchorError.error.errorCode.number, 6000); // adjust number based on AdminError enum if needed
    }

    // verify locks haven't changed
    const configAccount = await program.account.config.fetch(configPda);
    assert.isFalse(configAccount.locked, "global lock should not have changed");
    assert.isFalse(
      configAccount.depositLocked,
      "deposit lock should not have changed"
    );
    assert.isFalse(
      configAccount.convertLocked,
      "convert lock should not have changed"
    );
    console.log("non-authority update failure test finished.");
  });

  // --- tests for global lock affecting deposit / convert ---

  it("prevents deposit when globally locked", async () => {
    console.log("testing global lock prevents deposit...");
    // ensure unlocked first
    await program.methods
      .updateLocks(false, false, false)
      .accounts({ authority: initializer.publicKey, config: configPda })
      .signers([initializer.payer])
      .rpc();
    // lock globally
    await program.methods
      .updateLocks(true, null, null)
      .accounts({ authority: initializer.publicKey, config: configPda })
      .signers([initializer.payer])
      .rpc();

    const depositAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
    const nftMint = Keypair.generate();
    // derive accounts
    const [optionDataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("option_data"), nftMint.publicKey.toBuffer()],
      program.programId
    );
    const depositorCnAta = await anchor.utils.token.associatedAddress({
      mint: cnMint,
      owner: testUser.publicKey,
    });
    const depositorOptionAta = await anchor.utils.token.associatedAddress({
      mint: nftMint.publicKey,
      owner: testUser.publicKey,
    });
    const protocolPtAta = await anchor.utils.token.associatedAddress({
      mint: ptMint,
      owner: configPda,
    });
    const [nftMetadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMint.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [nftMasterEditionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMint.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [collectionMetadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [collectionMasterEditionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    try {
      await program.methods
        .deposit(depositAmount)
        .accounts({
          depositor: testUser.publicKey,
          depositorSolAccount: testUser.publicKey,
          depositorCnAta,
          depositorOptionAta,
          nftMint: nftMint.publicKey,
          optionData: optionDataPda,
          config: configPda,
          treasury: treasuryPda,
          treasuryVault: treasuryPda,
          cnMint,
          ptMint,
          collectionMint,
          collectionMetadata: collectionMetadataPda,
          collectionMasterEdition: collectionMasterEditionPda,
          nftMetadata: nftMetadataPda,
          nftMasterEdition: nftMasterEditionPda,
          protocolPtAta,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          metadataProgram: TOKEN_METADATA_PROGRAM_ID,
          sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY, // use token_2022_program_id
        })
        .signers([testUser, nftMint])
        .rpc({ commitment: "confirmed" });
      assert.fail("deposit should have failed due to global lock set by admin");
    } catch (err) {
      const anchorError = parseAnchorError(err);
      assert.ok(
        anchorError,
        "should be an AnchorError (global lock on deposit)"
      );
      // deposit instruction checks global lock first
      assert.strictEqual(
        anchorError.error.errorCode.code,
        "ProtocolLocked",
        "error code mismatch (global lock on deposit)"
      );
    } finally {
      // unlock globally for subsequent tests
      await program.methods
        .updateLocks(false, null, null)
        .accounts({ authority: initializer.publicKey, config: configPda })
        .signers([initializer.payer])
        .rpc({ commitment: "confirmed" });
      console.log("global lock deposit prevention test finished.");
    }
  });

  it("prevents convert when globally locked", async () => {
    console.log("testing global lock prevents convert...");
    // ensure unlocked first & perform a deposit to get something to convert
    await program.methods
      .updateLocks(false, false, false)
      .accounts({ authority: initializer.publicKey, config: configPda })
      .signers([initializer.payer])
      .rpc();
    const depositAmount = new anchor.BN(0.2 * LAMPORTS_PER_SOL);
    // --- perform deposit and initialize option to test conversion ---
    const nftMint = Keypair.generate(); // need a new mint for the option

    // derive accounts for deposit
    const depositorCnAta = await anchor.utils.token.associatedAddress({
      mint: cnMint,
      owner: testUser.publicKey,
    });
    const protocolPtAta = await anchor.utils.token.associatedAddress({
      mint: ptMint,
      owner: configPda,
    });

    // call deposit
    console.log("performing deposit for convert test setup...");
    await program.methods
      .deposit(depositAmount)
      .accounts({
        depositor: testUser.publicKey,
        depositorSolAccount: testUser.publicKey,
        depositorCnAta: depositorCnAta,
        config: configPda,
        treasury: treasuryPda,
        cnMint: cnMint,
        ptMint: ptMint,
        protocolPtAta: protocolPtAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([testUser])
      .rpc({ commitment: "confirmed" });
    console.log("deposit successful for convert test setup.");

    // derive accounts for initialize_option
    const userOptionAta = await anchor.utils.token.associatedAddress({
      mint: nftMint.publicKey,
      owner: testUser.publicKey,
    });
    const metadataPda = findMetadataPda(nftMint.publicKey);
    const masterEditionPda = findMasterEditionPda(nftMint.publicKey);
    const [optionDataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("option_data"), nftMint.publicKey.toBuffer()],
      program.programId
    );

    // call initialize_option
    console.log("performing initialize_option for convert test setup...");
    await program.methods
      .initializeOption(depositAmount) // using same amount as deposit for this test setup
      .accounts({
        payer: testUser.publicKey,
        config: configPda,
        optionMint: nftMint.publicKey,
        userOptionAta: userOptionAta,
        metadataAccount: metadataPda,
        masterEditionAccount: masterEditionPda,
        optionData: optionDataPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .signers([testUser, nftMint])
      .rpc({ commitment: "confirmed" });
    console.log("initialize_option successful for convert test setup.");

    // store necessary info for the convert call later
    const depositInfo = {
      depositorCnAta: depositorCnAta,
      depositorOptionAta: userOptionAta,
      protocolPtAta: protocolPtAta, // needed by convert accounts
      nftMint: nftMint, // store the keypair
      optionDataPda: optionDataPda,
    };

    // lock globally
    await program.methods
      .updateLocks(true, null, null)
      .accounts({ authority: initializer.publicKey, config: configPda })
      .signers([initializer.payer])
      .rpc();

    // derive Metaplex PDAs using depositInfo
    const [nftMetadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        depositInfo.nftMint.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [nftMasterEditionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        depositInfo.nftMint.publicKey.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [collectionMetadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    const converterPtAta = await anchor.utils.token.associatedAddress({
      mint: ptMint,
      owner: testUser.publicKey,
    });
    try {
      await program.methods
        .convert()
        .accounts({
          converter: testUser.publicKey,
          converterCnAta: depositInfo.depositorCnAta,
          converterOptionAta: depositInfo.depositorOptionAta,
          converterPtAta,
          config: configPda,
          protocolPtAta: depositInfo.protocolPtAta,
          cnMint,
          ptMint,
          nftMint: depositInfo.nftMint.publicKey,
          optionData: depositInfo.optionDataPda,
          nftMetadata: nftMetadataPda,
          nftMasterEdition: nftMasterEditionPda,
          collectionMetadata: collectionMetadataPda,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          metadataProgram: TOKEN_METADATA_PROGRAM_ID,
          sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY, // use token_2022_program_id
        })
        .signers([testUser])
        .rpc({ commitment: "confirmed" });
      assert.fail("convert should have failed due to global lock set by admin");
    } catch (err) {
      const anchorError = parseAnchorError(err);
      assert.ok(
        anchorError,
        "should be an AnchorError (global lock on convert)"
      );
      // convert instruction checks global lock first
      assert.strictEqual(
        anchorError.error.errorCode.code,
        "ProtocolLocked",
        "error code mismatch (global lock on convert)"
      );
    } finally {
      // unlock globally
      await program.methods
        .updateLocks(false, null, null)
        .accounts({ authority: initializer.publicKey, config: configPda })
        .signers([initializer.payer])
        .rpc({ commitment: "confirmed" });
      console.log("global lock convert prevention test finished.");
    }
  });
});

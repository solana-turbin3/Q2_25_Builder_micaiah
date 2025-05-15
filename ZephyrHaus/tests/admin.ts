import * as anchor from "@coral-xyz/anchor";
import { Program, Wallet } from "@coral-xyz/anchor";
import { InvestInSol } from "../target/types/invest_in_sol";
import { assert } from "chai";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  CN_MINT_ADDRESS,
  PT_MINT_ADDRESS,
  initializeProtocol,
  parseAnchorError,
  findMetadataPda,
  requestAirdrop,
  TOKEN_METADATA_PROGRAM_ID,
  localSendAndConfirmTransaction,
  updateLocks,
  deposit,
  initializeOption,
  debugEnableLogs,
} from "./utils";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

debugEnableLogs();

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

  const optionDurationSeconds = 60 * 60 * 24 * 30; // default 7 days for admin tests

  before(async () => {
    // airdrop initializer and test user
    await requestAirdrop(provider, initializer.publicKey, 2 * LAMPORTS_PER_SOL);
    await requestAirdrop(provider, testUser.publicKey, 2 * LAMPORTS_PER_SOL);

    // initialize the protocol using the helper from utils
    // pass initializer.payer as Keypair because it needs to sign
    const initResult = await initializeProtocol(
      program,
      provider,
      initializer.payer,
      cnMint,
      ptMint
    );
    configPda = initResult.configPda;
    treasuryPda = initResult.treasuryPda; // store treasury PDA
    treasuryPda = initResult.treasuryPda; // store vault PDA
  });

  it("allows authority to update all locks", async () => {
    console.log("testing update all locks...");
    // lock everything
    await updateLocks(
      program,
      provider,
      initializer.payer,
      configPda,
      true, // set globally locked
      true, // set deposits locked
      true // set converts locked
    );

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
    await updateLocks(
      program,
      provider,
      initializer.payer,
      configPda,
      false,
      false,
      false
    );

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
    await updateLocks(
      program,
      provider,
      initializer.payer,
      configPda,
      false,
      true, // set only deposits locked
      false
    );

    const configAccount = await program.account.config.fetch(configPda);
    assert.isFalse(configAccount.locked, "global lock should remain false");
    assert.isTrue(configAccount.depositLocked, "deposit lock should be true");
    assert.isFalse(
      configAccount.convertLocked,
      "convert lock should remain false"
    );

    // reset
    await updateLocks(
      program,
      provider,
      initializer.payer,
      configPda,
      null,
      false,
      null
    );

    console.log("update deposit lock test finished.");
  });

  it("allows authority to update only convert lock", async () => {
    console.log("testing update convert lock only...");
    await updateLocks(
      program,
      provider,
      initializer.payer,
      configPda,
      false,
      false,
      true // set only convert locked
    );

    const configAccount = await program.account.config.fetch(configPda);
    assert.isFalse(configAccount.locked, "global lock should remain false");
    assert.isFalse(
      configAccount.depositLocked,
      "deposit lock should remain false"
    );
    assert.isTrue(configAccount.convertLocked, "convert lock should be true");

    // reset
    await updateLocks(
      program,
      provider,
      initializer.payer,
      configPda,
      null,
      null,
      false
    );
    console.log("update convert lock test finished.");
  });

  it("allows authority to update only global lock", async () => {
    console.log("testing update global lock only...");
    // set global lock to true
    await updateLocks(
      program,
      provider,
      initializer.payer,
      configPda,
      true,
      null,
      null
    );

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
    await updateLocks(
      program,
      provider,
      initializer.payer,
      configPda,
      false,
      null,
      null
    );
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
      await updateLocks(
        program,
        provider,
        nonAuthority,
        configPda,
        true,
        true,
        true
      );
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

  it("prevents convert when globally locked", async () => {
    console.log("testing global lock prevents convert...");

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
    const depositResult = await deposit(
      program,
      provider,
      testUser,
      cnMint,
      ptMint,
      depositAmount,
      protocolPtAta,
      depositorCnAta
    );
    console.log("deposit successful for convert test setup.");

    // derive accounts for initialize_option
    const userOptionAta = await anchor.utils.token.associatedAddress({
      mint: nftMint.publicKey,
      owner: testUser.publicKey,
    });

    // store necessary info for the convert call later
    const depositInfo = {
      depositorCnAta: depositorCnAta,
      depositorOptionAta: userOptionAta,
      protocolPtAta: protocolPtAta, // needed by convert accounts
    };
    const initializeOptionRes = await initializeOption(
      program,
      provider,
      testUser
    );

    // lock globally
    await updateLocks(
      program,
      provider,
      initializer.payer,
      configPda,
      true,
      false,
      false
    );

    const collectionMetadataPda = findMetadataPda(
      initializeOptionRes.collectionMint
    );
    const converterPtAta = await anchor.utils.token.associatedAddress({
      mint: ptMint,
      owner: testUser.publicKey,
    });
    try {
      let tx = await program.methods
        .convert(depositAmount)
        .accountsStrict({
          converter: testUser.publicKey,
          converterCnAta: depositInfo.depositorCnAta,
          converterOptionAta: initializeOptionRes.depositorOptionAta,
          converterPtAta,
          config: configPda,
          protocolPtAta: depositInfo.protocolPtAta,
          cnMint,
          ptMint,
          nftMint: initializeOptionRes.optionMint,
          optionData: initializeOptionRes.optionData,
          nftMetadata: initializeOptionRes.optionMetadataAccount,
          nftMasterEdition: initializeOptionRes.optionMasterEdition,
          collectionMetadata: collectionMetadataPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          metadataProgram: TOKEN_METADATA_PROGRAM_ID,
          sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY, // use token_2022_program_id
        })
        .signers([testUser])
        .transaction();

      await localSendAndConfirmTransaction(provider, tx, testUser.publicKey, [
        testUser,
      ]);
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

      await updateLocks(
        program,
        provider,
        initializer.payer,
        configPda,
        false,
        null,
        null
      );

      console.log("global lock convert prevention test finished.");
    }
  });
});

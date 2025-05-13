import * as anchor from "@coral-xyz/anchor";
import { Program, Wallet } from "@coral-xyz/anchor";
import { InvestInSol } from "../target/types/invest_in_sol";
import { assert, expect } from "chai";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  CN_MINT_ADDRESS,
  PT_MINT_ADDRESS,
  COLLECTION_MINT_ADDRESS,
  requestAirdrop,
  sendAndConfirmTransaction,
  initializeProtocol,
} from "./utils";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("initialize instruction (with hardcoded mints)", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.InvestInSol as Program<InvestInSol>;
  const initializer = provider.wallet as Wallet; // use the provider's wallet as initializer/authority

  const cnMint = CN_MINT_ADDRESS;
  const ptMint = PT_MINT_ADDRESS;
  const collectionMint = COLLECTION_MINT_ADDRESS;
  const optionDurationSeconds = 60 * 60 * 24 * 30; // 7 days default for this test

  // PDAs to be derived
  let configPda: PublicKey;
  let configBump: number;
  let treasuryPda: PublicKey;
  let treasuryBump: number;

  before(async () => {
    // airdrop initializer if needed
    await requestAirdrop(provider, initializer.publicKey, 2 * LAMPORTS_PER_SOL);

    // log addresses being used
    console.log(`using Initializer: ${initializer.publicKey.toBase58()}`);
    console.log(`using CN Mint: ${cnMint.toBase58()}`);
    console.log(`using PT Mint: ${ptMint.toBase58()}`);
    console.log(`using Collection Mint: ${collectionMint.toBase58()}`);

    // derive PDA addresses
    [configPda, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
    [treasuryPda, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    );

    console.log(`derived Config PDA: ${configPda.toBase58()}`);
    console.log(`derived Treasury PDA: ${treasuryPda.toBase58()}`);
  });

  it("initializes the protocol state", async () => {
    // ensure accounts don't exist yet (this might fail if run after other tests on same localnet instance)
    // consider resetting the localnet (`anchor localnet --force`) before running tests if needed.
    const initialConfigInfo = await provider.connection.getAccountInfo(
      configPda
    );
    const initialTreasuryInfo = await provider.connection.getAccountInfo(
      treasuryPda
    );
    const initialVaultInfo = await provider.connection.getAccountInfo(
      treasuryPda
    );
    // these assertions might be too strict if tests are run sequentially without resetting
    // feel free to nuke
    assert.isNull(initialConfigInfo, "config PDA should not exist before init");
    assert.isNull(
      initialTreasuryInfo,
      "treasury PDA should not exist before init"
    );
    if (initialConfigInfo || initialTreasuryInfo || initialVaultInfo) {
      console.warn(
        "warn: accounts already exist before initialization test. state verification might be inaccurate if not the first run."
      );
    }

    console.log("calling initialize instruction...");
    // call the initialize instruction
    await initializeProtocol(
      program,
      provider,
      initializer.payer,
      cnMint,
      ptMint,
      collectionMint,
      optionDurationSeconds
    );

    console.log("initialize instruction successful.");

    console.log("verifying initialized state...");
    const configAccount = await program.account.config.fetch(configPda);
    assert.ok(
      configAccount.authority.equals(initializer.publicKey),
      "config authority mismatch"
    );
    assert.ok(configAccount.cnMint.equals(cnMint), "config CN mint mismatch");
    assert.ok(configAccount.ptMint.equals(ptMint), "config PT mint mismatch");
    assert.ok(
      configAccount.collectionMint.equals(collectionMint),
      "config Collection mint mismatch"
    );
    assert.isNull(configAccount.fee, "config fee should be None initially");
    assert.isFalse(configAccount.locked, "config global lock should be false");
    assert.isTrue(
      configAccount.depositLocked,
      "config deposit lock should be true"
    );
    assert.isTrue(
      configAccount.convertLocked,
      "config convert lock should be true"
    );
    assert.strictEqual(configAccount.bump, configBump, "config bump mismatch");

    // verify treasury account
    const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
    assert.ok(
      treasuryAccount.authority.equals(initializer.publicKey),
      "treasury authority mismatch"
    );
    assert.strictEqual(
      treasuryAccount.treasuryBump,
      treasuryBump,
      "treasury bump mismatch"
    );
    assert.strictEqual(
      treasuryAccount.totalDepositedSol.toNumber(),
      0,
      "treasury total deposits should be 0"
    );

    // verify treasury account exists and is owned by the program
    const vaultInfo = await provider.connection.getAccountInfo(treasuryPda);
    assert.ok(
      vaultInfo.owner.equals(program.programId),
      "treasury Vault owner should be the program"
    );

    // vault lamports might not be exactly 0 if rent was paid, check it's at least rent-exempt minimum
    const rentExemptLamports =
      await provider.connection.getMinimumBalanceForRentExemption(
        vaultInfo.data.length
      );
    assert.strictEqual(
      vaultInfo.lamports,
      rentExemptLamports,
      "treasury Vault lamports mismatch (should be rent-exempt minimum)"
    );
    console.log("initialized state verified.");
  });

  it("fails if called again", async () => {
    console.log("testing re-initialization failure...");
    try {
      const tx = await program.methods
        .initialize(optionDurationSeconds)
        .accountsStrict({
          initializer: initializer.publicKey,
          cnMint: cnMint,
          ptMint: ptMint,
          collectionMint: collectionMint,
          config: configPda,
          treasury: treasuryPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction();
      await sendAndConfirmTransaction(provider, tx, initializer.publicKey, [
        initializer.payer,
      ]);
      assert.fail("initialize should fail if called again");
    } catch (err) {
      // expect an error because the accounts (config, treasury, vault) already exist
      // error might be "already in use" or a custom anchor error
      // console.error("expected error:", err.toString());
      expect(err.toString()).to.match(
        /already in use|custom program error: 0x0/i
      ); // match common errors for re-init
      console.log("re-initialization failed as expected.");
    }
  });
});

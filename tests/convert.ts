import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { InvestInSol } from "../target/types/invest_in_sol";
import { assert, expect } from "chai";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import {
  CN_MINT_ADDRESS,
  PT_MINT_ADDRESS,
  COLLECTION_MINT_ADDRESS,
  initializeProtocol,
  parseAnchorError,
  requestAirdrop,
  TOKEN_METADATA_PROGRAM_ID,
  findMetadataPda,
  findMasterEditionPda,
} from "./utils";

describe("convert instruction (with hardcoded mints)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.InvestInSol as Program<InvestInSol>;
  const initializer = provider.wallet as Wallet; // use provider's wallet as initializer/authority
  const converter = Keypair.generate(); // create a new converter/depositor for tests

  const cnMint = CN_MINT_ADDRESS;
  const ptMint = PT_MINT_ADDRESS;
  const collectionMint = COLLECTION_MINT_ADDRESS; // still needed for BurnV1 CPI
  const optionDurationSeconds = 60 * 60 * 24 * 7; // 7 days

  let configPda: PublicKey;
  let treasuryPda: PublicKey;
  let protocolPtAta: PublicKey;

  // variables to store results from setup
  let optionMintKp: Keypair; // renamed to avoid conflict with mint address variable
  let optionDataPda: PublicKey;
  let converterCnAta: PublicKey;
  let converterOptionAta: PublicKey;
  const depositAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL); // 0.5 SOL

  before(async () => {
    await requestAirdrop(provider, initializer.publicKey, 2 * LAMPORTS_PER_SOL);
    await requestAirdrop(provider, converter.publicKey, 2 * LAMPORTS_PER_SOL);

    // initialize the protocol
    const initResult = await initializeProtocol(
      program,
      provider,
      initializer.payer,
      cnMint,
      ptMint,
      collectionMint,
      optionDurationSeconds
    );
    configPda = initResult.configPda;
    treasuryPda = initResult.treasuryPda;
    protocolPtAta = await anchor.utils.token.associatedAddress({
      mint: ptMint,
      owner: configPda,
    }); // derive protocol PT ATA

    console.log("--- Setting up for Convert Test ---");

    // 1. perform deposit
    console.log("performing deposit for converter...");
    converterCnAta = await anchor.utils.token.associatedAddress({
      mint: cnMint,
      owner: converter.publicKey,
    });
    await program.methods
      .deposit(depositAmount)
      .accounts({
        depositor: converter.publicKey,
        depositor_sol_account: converter.publicKey,
        config: configPda,
        treasury: treasuryPda,
        cn_mint: cnMint,
        pt_mint: ptMint,
        protocol_pt_ata: protocolPtAta,
        token_program: TOKEN_2022_PROGRAM_ID,
        associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
        system_program: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([converter])
      .rpc({ commitment: "confirmed" });
    console.log("deposit complete.");

    // 2. initialize option
    console.log("initializing option for converter...");
    optionMintKp = Keypair.generate(); // generate the mint keypair for the option
    converterOptionAta = await anchor.utils.token.associatedAddress({
      mint: optionMintKp.publicKey,
      owner: converter.publicKey,
    });
    const metadataPda = findMetadataPda(optionMintKp.publicKey);
    const masterEditionPda = findMasterEditionPda(optionMintKp.publicKey);
    [optionDataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("option_data"), optionMintKp.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeOption(depositAmount)
      .accounts({
        payer: converter.publicKey,
        config: configPda,
        option_mint: optionMintKp.publicKey,
        user_option_ata: converterOptionAta,
        metadata_account: metadataPda,
        master_edition_account: masterEditionPda,
        option_data: optionDataPda,
        token_program: TOKEN_PROGRAM_ID,
        associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
        system_program: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        token_metadata_program: TOKEN_METADATA_PROGRAM_ID,
      })
      .signers([converter, optionMintKp]) // converter and the new mint keypair sign
      .rpc({ commitment: "confirmed" });
    console.log(
      `option initialized. Mint: ${optionMintKp.publicKey.toBase58()}, PDA: ${optionDataPda.toBase58()}`
    );
    console.log("--- Setup Complete ---");
  });

  it("allows conversion when protocol is unlocked & verifies state changes", async () => {
    // derive user's PT ATA
    const converterPtAta = await anchor.utils.token.associatedAddress({
      mint: ptMint,
      owner: converter.publicKey,
    });

    // derive Metaplex PDAs for the specific NFT being converted
    const nftMetadataPda = findMetadataPda(optionMintKp.publicKey);
    const nftMasterEditionPda = findMasterEditionPda(optionMintKp.publicKey);
    // collection metadata is needed for BurnV1 CPI
    const collectionMetadataPda = findMetadataPda(collectionMint);

    // get initial balances
    let initialPtBalance = BigInt(0);
    try {
      const acc = await getAccount(provider.connection, converterPtAta);
      initialPtBalance = acc.amount;
    } catch (e) {
      /* ATA doesn't exist yet */
    }

    const initialCnAccount = await getAccount(
      provider.connection,
      converterCnAta
    );
    const initialCnBalance = initialCnAccount.amount;
    const initialProtocolPtAccount = await getAccount(
      provider.connection,
      protocolPtAta
    );

    console.log("attempting conversion...");
    // execute conversion
    const txSignature = await program.methods
      .convert()
      .accounts({
        converter: converter.publicKey,
        converter_option_ata: converterOptionAta,
        converter_pt_ata: converterPtAta,
        config: configPda,
        protocol_pt_ata: protocolPtAta,
        cn_mint: cnMint,
        pt_mint: ptMint,
        nft_mint: optionMintKp.publicKey,
        option_data: optionDataPda,
        nft_metadata: nftMetadataPda,
        nft_master_edition: nftMasterEditionPda,
        collection_metadata: collectionMetadataPda,
        token_program: TOKEN_2022_PROGRAM_ID,
        associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
        system_program: SystemProgram.programId,
        metadata_program: TOKEN_METADATA_PROGRAM_ID,
        sysvar_instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([converter]) // only the converter needs to sign
      .rpc({ commitment: "confirmed" });

    console.log("conversion successful:", txSignature);

    // --- assertions ---
    console.log("verifying state changes after conversion...");

    // 1. PT token transfer
    const finalPtAccount = await getAccount(
      provider.connection,
      converterPtAta
    );
    const expectedPtBalance =
      initialPtBalance + BigInt(depositAmount.toString());
    assert.strictEqual(
      finalPtAccount.amount.toString(),
      expectedPtBalance.toString(),
      "converter PT balance mismatch"
    );

    // 2. CN token burn
    const finalCnAccount = await getAccount(
      provider.connection,
      converterCnAta
    );
    const expectedCnBalance =
      initialCnBalance - BigInt(depositAmount.toString());
    assert.strictEqual(
      finalCnAccount.amount.toString(),
      expectedCnBalance.toString(),
      "converter CN balance mismatch"
    );

    // 3. OptionData account closure
    const optionDataInfo = await provider.connection.getAccountInfo(
      optionDataPda
    );
    assert.isNull(optionDataInfo, "OptionData account should be closed");

    // 4. NFT burn (check token account balance is zero or closed)
    try {
      const finalOptionAccount = await getAccount(
        provider.connection,
        converterOptionAta
      );
      assert.strictEqual(
        finalOptionAccount.amount.toString(),
        "0",
        "depositor Option ATA should have 0 tokens after burn"
      );
    } catch (error) {
      // if using standard token program for NFT, ATA might not be closed automatically on burn
      // check if error indicates account not found OR if account exists with 0 balance
      if (error.message.includes("could not find account")) {
        // account closed, this is expected for some burn scenarios
      } else {
        // if account still exists, check balance is 0
        const finalOptionAccount = await getAccount(
          provider.connection,
          converterOptionAta
        );
        assert.strictEqual(
          finalOptionAccount.amount.toString(),
          "0",
          "depositor Option ATA should have 0 tokens after burn"
        );
      }
    }

    // 5. protocol PT ATA balance check
    const finalProtocolPtAccount = await getAccount(
      provider.connection,
      protocolPtAta
    );
    const expectedProtocolPtBalance =
      initialProtocolPtAccount.amount - BigInt(depositAmount.toString());
    assert.strictEqual(
      finalProtocolPtAccount.amount.toString(),
      expectedProtocolPtBalance.toString(),
      "protocol PT ATA balance mismatch after transfer"
    );

    console.log("state changes verified.");
  });

  // --- lock tests ---
  // note: these tests might need to perform deposit + initialize_option within each 'it' block
  // to ensure a valid option exists before attempting the locked conversion.

  it("fails conversion when protocol is globally locked", async () => {
    console.log("testing global lock for conversion...");
    // setup: deposit and initialize option for this test
    const localConverter = Keypair.generate();
    await requestAirdrop(provider, localConverter.publicKey, LAMPORTS_PER_SOL);
    const localCnAta = await anchor.utils.token.associatedAddress({
      mint: cnMint,
      owner: localConverter.publicKey,
    });
    await program.methods
      .deposit(depositAmount)
      .accounts({
        depositor: localConverter.publicKey,
        depositor_sol_account: localConverter.publicKey,
        config: configPda,
        treasury: treasuryPda,
        cn_mint: cnMint,
        pt_mint: ptMint,
        protocol_pt_ata: protocolPtAta,
        token_program: TOKEN_2022_PROGRAM_ID,
        associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
        system_program: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([localConverter])
      .rpc();
    const localOptionMintKp = Keypair.generate();
    const localOptionAta = await anchor.utils.token.associatedAddress({
      mint: localOptionMintKp.publicKey,
      owner: localConverter.publicKey,
    });
    const localMetadataPda = findMetadataPda(localOptionMintKp.publicKey);
    const localMasterEditionPda = findMasterEditionPda(
      localOptionMintKp.publicKey
    );
    const [localOptionDataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("option_data"), localOptionMintKp.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .initializeOption(depositAmount)
      .accounts({
        payer: localConverter.publicKey,
        config: configPda,
        option_mint: localOptionMintKp.publicKey,
        user_option_ata: localOptionAta,
        metadata_account: localMetadataPda,
        master_edition_account: localMasterEditionPda,
        option_data: localOptionDataPda,
        token_program: TOKEN_PROGRAM_ID,
        associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
        system_program: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        token_metadata_program: TOKEN_METADATA_PROGRAM_ID,
      })
      .signers([localConverter, localOptionMintKp])
      .rpc();

    // lock the protocol
    await program.methods
      .updateLocks(true, null, null)
      .accounts({ authority: initializer.publicKey, config: configPda })
      .signers([initializer.payer])
      .rpc({ commitment: "confirmed" });

    const localPtAta = await anchor.utils.token.associatedAddress({
      mint: ptMint,
      owner: localConverter.publicKey,
    });
    const localCollectionMetadataPda = findMetadataPda(collectionMint);

    try {
      await program.methods
        .convert()
        .accounts({
          converter: localConverter.publicKey,
          converter_option_ata: localOptionAta,
          converter_pt_ata: localPtAta,
          config: configPda,
          protocol_pt_ata: protocolPtAta,
          cn_mint: cnMint,
          pt_mint: ptMint,
          nft_mint: localOptionMintKp.publicKey,
          option_data: localOptionDataPda,
          nft_metadata: localMetadataPda,
          nft_master_edition: localMasterEditionPda,
          collection_metadata: localCollectionMetadataPda,
          token_program: TOKEN_2022_PROGRAM_ID,
          associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
          system_program: SystemProgram.programId,
          metadata_program: TOKEN_METADATA_PROGRAM_ID,
          sysvar_instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([localConverter])
        .rpc({ commitment: "confirmed" });
      assert.fail("convert should have failed due to global lock");
    } catch (err) {
      const anchorError = parseAnchorError(err);
      assert.ok(anchorError, "should be an AnchorError (global lock)");
      assert.strictEqual(
        anchorError.error.errorCode.code,
        "ProtocolLocked",
        "error code mismatch (global lock)"
      );
    } finally {
      await program.methods
        .updateLocks(false, null, null)
        .accounts({ authority: initializer.publicKey, config: configPda })
        .signers([initializer.payer])
        .rpc({ commitment: "confirmed" });
      console.log("global lock test finished.");
    }
  });

  it("fails conversion when conversions are locked (but protocol unlocked)", async () => {
    console.log("testing convert lock...");
    // setup: deposit and initialize option for this test
    const localConverter = Keypair.generate();
    await requestAirdrop(provider, localConverter.publicKey, LAMPORTS_PER_SOL);
    const localCnAta = await anchor.utils.token.associatedAddress({
      mint: cnMint,
      owner: localConverter.publicKey,
    });
    await program.methods
      .deposit(depositAmount)
      .accounts({
        depositor: localConverter.publicKey,
        depositor_sol_account: localConverter.publicKey,
        config: configPda,
        treasury: treasuryPda,
        cn_mint: cnMint,
        pt_mint: ptMint,
        protocol_pt_ata: protocolPtAta,
        token_program: TOKEN_2022_PROGRAM_ID,
        associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
        system_program: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([localConverter])
      .rpc();
    const localOptionMintKp = Keypair.generate();
    const localOptionAta = await anchor.utils.token.associatedAddress({
      mint: localOptionMintKp.publicKey,
      owner: localConverter.publicKey,
    });
    const localMetadataPda = findMetadataPda(localOptionMintKp.publicKey);
    const localMasterEditionPda = findMasterEditionPda(
      localOptionMintKp.publicKey
    );
    const [localOptionDataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("option_data"), localOptionMintKp.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .initializeOption(depositAmount)
      .accounts({
        payer: localConverter.publicKey,
        config: configPda,
        option_mint: localOptionMintKp.publicKey,
        user_option_ata: localOptionAta,
        metadata_account: localMetadataPda,
        master_edition_account: localMasterEditionPda,
        option_data: localOptionDataPda,
        token_program: TOKEN_PROGRAM_ID,
        associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
        system_program: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        token_metadata_program: TOKEN_METADATA_PROGRAM_ID,
      })
      .signers([localConverter, localOptionMintKp])
      .rpc();

    // lock conversions specifically
    await program.methods
      .updateLocks(null, null, true)
      .accounts({ authority: initializer.publicKey, config: configPda })
      .signers([initializer.payer])
      .rpc({ commitment: "confirmed" });

    const localPtAta = await anchor.utils.token.associatedAddress({
      mint: ptMint,
      owner: localConverter.publicKey,
    });
    const localCollectionMetadataPda = findMetadataPda(collectionMint);

    try {
      await program.methods
        .convert()
        .accounts({
          converter: localConverter.publicKey,
          converter_option_ata: localOptionAta,
          converter_pt_ata: localPtAta,
          config: configPda,
          protocol_pt_ata: protocolPtAta,
          cn_mint: cnMint,
          pt_mint: ptMint,
          nft_mint: localOptionMintKp.publicKey,
          option_data: localOptionDataPda,
          nft_metadata: localMetadataPda,
          nft_master_edition: localMasterEditionPda,
          collection_metadata: localCollectionMetadataPda,
          token_program: TOKEN_2022_PROGRAM_ID,
          associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
          system_program: SystemProgram.programId,
          metadata_program: TOKEN_METADATA_PROGRAM_ID,
          sysvar_instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([localConverter])
        .rpc({ commitment: "confirmed" });
      assert.fail("convert should have failed due to convert lock");
    } catch (err) {
      const anchorError = parseAnchorError(err);
      assert.ok(anchorError, "should be an AnchorError (convert lock)");
      assert.strictEqual(
        anchorError.error.errorCode.code,
        "ConversionsLocked",
        "error code mismatch (convert lock)"
      );
    } finally {
      await program.methods
        .updateLocks(null, null, false)
        .accounts({ authority: initializer.publicKey, config: configPda })
        .signers([initializer.payer])
        .rpc({ commitment: "confirmed" });
      console.log("convert lock test finished.");
    }
  });

  // todo: add test for expired option
  // todo: add test for partial claim, insure metadata gets updated w new uri
});

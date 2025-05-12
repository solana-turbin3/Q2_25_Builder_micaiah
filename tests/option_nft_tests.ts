/**
 * Tests for the NFT minting and collection verification functionality.
 * This file tests the separation of deposit and initialize_option instructions.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { InvestInSol } from "../target/types/invest_in_sol";
import { assert, expect } from "chai";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
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
  requestAirdrop,
  findMetadataPda,
  findMasterEditionPda,
  TOKEN_METADATA_PROGRAM_ID,
} from "./utils";

describe("Option NFT Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.InvestInSol as Program<InvestInSol>;
  const initializer = provider.wallet as Wallet;
  const user = Keypair.generate();

  const cnMint = CN_MINT_ADDRESS;
  const ptMint = PT_MINT_ADDRESS;
  const collectionMint = COLLECTION_MINT_ADDRESS;
  const optionDurationSeconds = 60 * 60 * 24 * 30; // 7 days

  let configPda: PublicKey;
  let treasuryPda: PublicKey;

  before(async () => {
    // airdrops
    await requestAirdrop(provider, initializer.publicKey, 2 * LAMPORTS_PER_SOL);
    await requestAirdrop(provider, user.publicKey, 2 * LAMPORTS_PER_SOL);

    console.log(`using Initializer: ${initializer.publicKey.toBase58()}`);
    console.log(`using User: ${user.publicKey.toBase58()}`);

    // initialize protocol
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

    console.log(`config PDA: ${configPda.toBase58()}`);
    console.log(`treasury PDA: ${treasuryPda.toBase58()}`);
  });

  it("initializes the protocol with a verified collection", async () => {
    // verify collection metadata exists
    const collectionMetadataPda = findMetadataPda(collectionMint);
    const collectionMetadataInfo = await provider.connection.getAccountInfo(
      collectionMetadataPda
    );
    assert.ok(
      collectionMetadataInfo,
      "Collection metadata account should exist"
    );

    // verify collection master edition exists
    const collectionMasterEditionPda = findMasterEditionPda(collectionMint);
    const collectionMasterEditionInfo = await provider.connection.getAccountInfo(
      collectionMasterEditionPda
    );
    assert.ok(
      collectionMasterEditionInfo,
      "Collection master edition account should exist"
    );

    // verify config has the collection mint set
    const configAccount = await program.account.config.fetch(configPda);
    assert.ok(
      configAccount.collectionMint.equals(collectionMint),
      "Config should have collection mint set"
    );
  });

  it("allows deposit and initialize_option as separate steps", async () => {
    const depositAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

    // get initial balances
    const initialUserSol = await provider.connection.getBalance(
      user.publicKey
    );
    const initialTreasuryBalance = await provider.connection.getBalance(
      treasuryPda
    );

    //step 1: Perform deposit
    console.log("Performing deposit...");
    
    // derive necessary accounts for deposit
    const userCnAta = await anchor.utils.token.associatedAddress({
      mint: cnMint,
      owner: user.publicKey,
    });
    const protocolPtAta = await anchor.utils.token.associatedAddress({
      mint: ptMint,
      owner: configPda,
    });
    const [depositReceiptPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("deposit_receipt"), user.publicKey.toBuffer()],
      program.programId
    );

    // build deposit instruction
    const depositIx = await program.methods
      .deposit(depositAmount)
      .accounts({
        depositor: user.publicKey,
        depositor_sol_account: user.publicKey,
        depositor_cn_ata: userCnAta,
        deposit_receipt: depositReceiptPda,
        config: configPda,
        treasury: treasuryPda,
        cn_mint: cnMint,
        pt_mint: ptMint,
        protocol_pt_ata: protocolPtAta,
        token_program: TOKEN_PROGRAM_ID,
        associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
        system_program: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any) // Type assertion to bypass TypeScript errors
      .instruction();
      
    // create and send the transaction
    const depositTx = new Transaction().add(depositIx);
    await provider.sendAndConfirm(depositTx, [user], { commitment: "confirmed" });
    
    // step 2: Initialize option NFT
    console.log("Initializing option NFT...");
    
    // get the deposit nonce from the config account
    const configAccount = await program.account.config.fetch(configPda);
    const depositNonce = configAccount.depositNonce.toNumber();
    
    // create option mint PDA using deposit nonce
    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeUInt8(depositNonce, 0);
    const [optionMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("option_mint"), user.publicKey.toBuffer(), nonceBuffer],
      program.programId
    );
    
    // derive necessary accounts for initialize_option
    const userOptionAta = await anchor.utils.token.associatedAddress({
      mint: optionMint,
      owner: user.publicKey,
    });
    const metadataPda = findMetadataPda(optionMint);
    const masterEditionPda = findMasterEditionPda(optionMint);
    const collectionMetadataPda = findMetadataPda(collectionMint);
    const collectionMasterEditionPda = findMasterEditionPda(collectionMint);
    const [optionDataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("option_data"), optionMint.toBuffer()],
      program.programId
    );
    
    // build initialize_option instruction
    const initOptionIx = await program.methods
      .initializeOption()
      .accounts({
        depositor: user.publicKey,
        config: configPda,
        deposit_receipt: depositReceiptPda,
        option_mint: optionMint,
        user_option_ata: userOptionAta,
        metadata_account: metadataPda,
        master_edition_account: masterEditionPda,
        collection_mint: collectionMint,
        collection_metadata: collectionMetadataPda,
        collection_master_edition: collectionMasterEditionPda,
        option_data: optionDataPda,
        token_program: TOKEN_PROGRAM_ID,
        associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
        system_program: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        token_metadata_program: TOKEN_METADATA_PROGRAM_ID,
        sysvar_instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      } as any) // type assertion to bypass ts errors
      .instruction();
      
    // create and send the transaction
    const initOptionTx = new Transaction().add(initOptionIx);
    await provider.sendAndConfirm(initOptionTx, [user], { commitment: "confirmed" });

    // verify NFT was minted to user
    const userOptionAccount = await getAccount(
      provider.connection,
      userOptionAta
    );
    assert.strictEqual(
      userOptionAccount.amount.toString(),
      "1",
      "User should have received 1 NFT"
    );

    // verify metadata was created
    const metadataInfo = await provider.connection.getAccountInfo(metadataPda);
    assert.ok(metadataInfo, "Metadata account should exist");

    // verify master edition was created
    const masterEditionInfo = await provider.connection.getAccountInfo(
      masterEditionPda
    );
    assert.ok(masterEditionInfo, "Master edition account should exist");

    // verify OptionData PDA was created
    const optionDataAccount = await program.account.optionData.fetch(
      optionDataPda
    );
    assert.ok(
      optionDataAccount.mint.equals(optionMint),
      "OptionData mint should match"
    );
    assert.strictEqual(
      optionDataAccount.amount.toString(),
      depositAmount.toString(),
      "OptionData amount should match deposit amount"
    );

    // verify SOL was transferred
    const finalUserSol = await provider.connection.getBalance(user.publicKey);
    const finalTreasuryBalance = await provider.connection.getBalance(
      treasuryPda
    );
    expect(finalUserSol).to.be.lessThan(
      initialUserSol - depositAmount.toNumber(),
      "User SOL should have decreased by at least deposit amount"
    );
    assert.strictEqual(
      finalTreasuryBalance,
      initialTreasuryBalance + depositAmount.toNumber(),
      "Treasury should have received deposit amount"
    );
    
    // verify deposit receipt was updated
    const depositReceipt = await program.account.depositReceipt.fetch(
      depositReceiptPda
    );
    assert.strictEqual(
      depositReceipt.nftIssued,
      true,
      "Deposit receipt should be marked as NFT issued"
    );
  });
});
import * as anchor from "@coral-xyz/anchor";
import { Program, Wallet } from "@coral-xyz/anchor";
import { InvestInSol } from "../target/types/invest_in_sol";
import { assert, expect } from "chai";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,

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
  deposit,
} from "./utils";

describe("Collection and NFT functionality tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.InvestInSol as Program<InvestInSol>;
  const initializer = provider.wallet as Wallet; // use provider's wallet as initializer/authority
  const user = Keypair.generate(); // user who will receive the option

  const cnMint = CN_MINT_ADDRESS;
  const ptMint = PT_MINT_ADDRESS;
  const collectionMint = COLLECTION_MINT_ADDRESS;
  const optionDurationSeconds = 60 * 60 * 24 * 30; // 30 days

  let configPda: PublicKey;
  let treasuryPda: PublicKey;

  before(async () => {
    // airdrops
    await requestAirdrop(provider, initializer.publicKey, 2 * LAMPORTS_PER_SOL);
    await requestAirdrop(provider, user.publicKey, 2 * LAMPORTS_PER_SOL);

    console.log(`using Initializer: ${initializer.publicKey.toBase58()}`);
    console.log(`using User: ${user.publicKey.toBase58()}`);
  });

  it("initializes the protocol with a verified collection", async () => {
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

  it("mints an NFT as part of the deposit process", async () => {
    const depositAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

    // get initial balances
    const initialUserSol = await provider.connection.getBalance(
      user.publicKey
    );
    const initialTreasuryBalance = await provider.connection.getBalance(
      treasuryPda
    );

    console.log("Performing deposit...");
    const { depositReceiptPda } = await deposit(
      program,
      provider,
      user,
      cnMint,
      ptMint,
      collectionMint,
      depositAmount
    );
    
    // now initialize the option NFT
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
    
    // derive necessary accounts
    const depositorOptionAta = await anchor.utils.token.associatedAddress({
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
    
    // initialize option
    const initOptionIx = await program.methods
      .initializeOption()
      .accounts({
        depositor: user.publicKey,
        config: configPda,
        deposit_receipt: depositReceiptPda,
        option_mint: optionMint,
        user_option_ata: depositorOptionAta,
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
      } as any)
      .instruction();
      
    // create and send the transaction
    const initOptionTx = new anchor.web3.Transaction().add(initOptionIx);
    await provider.sendAndConfirm(initOptionTx, [user], { commitment: "confirmed" });

    // verify NFT was minted to user
    const userOptionAccount = await getAccount(
      provider.connection,
      depositorOptionAta
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
  });

  it("allows partial conversion of an option NFT", async () => {
    // first, perform a deposit to get an option NFT
    const depositAmount = new anchor.BN(2 * LAMPORTS_PER_SOL); // 2 SOL
    console.log("Performing deposit for partial conversion test...");
    
    const converter = Keypair.generate();
    await requestAirdrop(provider, converter.publicKey, 3 * LAMPORTS_PER_SOL);
    
    // perform deposit first
    const { depositReceiptPda, depositorCnAta } = await deposit(
      program,
      provider,
      converter,
      cnMint,
      ptMint,
      collectionMint,
      depositAmount
    );
    
    // now initialize the option NFT
    console.log("Initializing option NFT for partial conversion test...");
    
    // get the deposit nonce from the config account
    const configAccount = await program.account.config.fetch(configPda);
    const depositNonce = configAccount.depositNonce.toNumber();
    
    // create option mint PDA using deposit nonce
    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeUInt8(depositNonce, 0);
    const [optionMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("option_mint"), converter.publicKey.toBuffer(), nonceBuffer],
      program.programId
    );
    
    // derive necessary accounts
    const depositorOptionAta = await anchor.utils.token.associatedAddress({
      mint: optionMint,
      owner: converter.publicKey,
    });
    
    // initialize option
    const initOptionIx = await program.methods
      .initializeOption()
      .accounts({
        depositor: converter.publicKey,
        config: configPda,
        deposit_receipt: depositReceiptPda,
        option_mint: optionMint,
        user_option_ata: depositorOptionAta,
        metadata_account: findMetadataPda(optionMint),
        master_edition_account: findMasterEditionPda(optionMint),
        collection_mint: collectionMint,
        collection_metadata: findMetadataPda(collectionMint),
        collection_master_edition: findMasterEditionPda(collectionMint),
        option_data: PublicKey.findProgramAddressSync(
          [Buffer.from("option_data"), optionMint.toBuffer()],
          program.programId
        )[0],
        token_program: TOKEN_PROGRAM_ID,
        associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
        system_program: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        token_metadata_program: TOKEN_METADATA_PROGRAM_ID,
        sysvar_instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      } as any)
      .instruction();
      
    // create and send the transaction
    const initOptionTx = new anchor.web3.Transaction().add(initOptionIx);
    await provider.sendAndConfirm(initOptionTx, [converter], { commitment: "confirmed" });

    // Derive necessary accounts for conversion
    const converterPtAta = await anchor.utils.token.associatedAddress({
      mint: ptMint,
      owner: converter.publicKey,
    });
    const protocolPtAta = await anchor.utils.token.associatedAddress({
      mint: ptMint,
      owner: configPda,
    });
    const nftMetadataPda = findMetadataPda(optionMint);
    const nftMasterEditionPda = findMasterEditionPda(optionMint);
    const collectionMetadataPda = findMetadataPda(collectionMint);
    const [optionDataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("option_data"), optionMint.toBuffer()],
      program.programId
    );

    // Get initial balances
    const initialCnAccount = await getAccount(
      provider.connection,
      depositorCnAta
    );
    const initialCnBalance = initialCnAccount.amount;
    let initialPtBalance = BigInt(0);
    try {
      const acc = await getAccount(provider.connection, converterPtAta);
      initialPtBalance = acc.amount;
    } catch (e) {
      /* ATA doesn't exist yet */
    }

    // Perform partial conversion (convert 1 SOL out of 2 SOL)
    const partialAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);
    console.log("Attempting partial conversion...");
    // Convert with the partial amount
    const txSignature = await program.methods
      .convert(partialAmount)
      .accountsStrict({
        converter: converter.publicKey,
        converterOptionAta: depositorOptionAta,
        converterPtAta: converterPtAta,
        config: configPda,
        protocolPtAta: protocolPtAta,
        cnMint: cnMint,
        ptMint: ptMint,
        nftMint: optionMint,
        optionData: optionDataPda,
        nftMetadata: nftMetadataPda,
        nftMasterEdition: nftMasterEditionPda,
        collectionMetadata: collectionMetadataPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        metadataProgram: TOKEN_METADATA_PROGRAM_ID,
        sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        converterCnAta: depositorCnAta,
      })
      .signers([converter])
      .rpc({ commitment: "confirmed" });

    console.log("Partial conversion successful:", txSignature);

    // verify CN tokens were burned
    const finalCnAccount = await getAccount(
      provider.connection,
      depositorCnAta
    );
    const expectedCnBalance = initialCnBalance - BigInt(partialAmount.toString());
    assert.strictEqual(
      finalCnAccount.amount.toString(),
      expectedCnBalance.toString(),
      "Converter CN balance should be reduced by partial amount"
    );

    // verify PT tokens were received
    const finalPtAccount = await getAccount(
      provider.connection,
      converterPtAta
    );
    const expectedPtBalance = initialPtBalance + BigInt(partialAmount.toString());
    assert.strictEqual(
      finalPtAccount.amount.toString(),
      expectedPtBalance.toString(),
      "Converter PT balance should increase by partial amount"
    );

    // verify NFT still exists (not burned)
    const finalOptionAccount = await getAccount(
      provider.connection,
      depositorOptionAta
    );
    assert.strictEqual(
      finalOptionAccount.amount.toString(),
      "1",
      "NFT should still exist after partial conversion"
    );

    // verify OptionData was updated but not closed
    const finalOptionData = await program.account.optionData.fetch(
      optionDataPda
    );
    assert.strictEqual(
      finalOptionData.amount.toString(),
      (depositAmount.toNumber() - partialAmount.toNumber()).toString(),
      "OptionData amount should be reduced by partial amount"
    );
  });

  it("allows full conversion of an option NFT", async () => {
    // First, perform a deposit to get an option NFT
    const depositAmount = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL
    console.log("Performing deposit for full conversion test...");
    
    const converter = Keypair.generate();
    await requestAirdrop(provider, converter.publicKey, 2 * LAMPORTS_PER_SOL);
    
    // Perform deposit first
    const { depositReceiptPda, depositorCnAta } = await deposit(
      program,
      provider,
      converter,
      cnMint,
      ptMint,
      collectionMint,
      depositAmount
    );
    
    // Now initialize the option NFT
    console.log("Initializing option NFT for full conversion test...");
    
    // Get the deposit nonce from the config account
    const configAccount = await program.account.config.fetch(configPda);
    const depositNonce = configAccount.depositNonce.toNumber();
    
    // Create option mint PDA using deposit nonce
    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeUInt8(depositNonce, 0);
    const [optionMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("option_mint"), converter.publicKey.toBuffer(), nonceBuffer],
      program.programId
    );
    
    // Derive necessary accounts
    const depositorOptionAta = await anchor.utils.token.associatedAddress({
      mint: optionMint,
      owner: converter.publicKey,
    });
    
    // Initialize option
    const initOptionIx = await program.methods
      .initializeOption()
      .accounts({
        depositor: converter.publicKey,
        config: configPda,
        deposit_receipt: depositReceiptPda,
        option_mint: optionMint,
        user_option_ata: depositorOptionAta,
        metadata_account: findMetadataPda(optionMint),
        master_edition_account: findMasterEditionPda(optionMint),
        collection_mint: collectionMint,
        collection_metadata: findMetadataPda(collectionMint),
        collection_master_edition: findMasterEditionPda(collectionMint),
        option_data: PublicKey.findProgramAddressSync(
          [Buffer.from("option_data"), optionMint.toBuffer()],
          program.programId
        )[0],
        token_program: TOKEN_PROGRAM_ID,
        associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
        system_program: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        token_metadata_program: TOKEN_METADATA_PROGRAM_ID,
        sysvar_instructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      } as any)
      .instruction();
      
    // Create and send the transaction
    const initOptionTx = new anchor.web3.Transaction().add(initOptionIx);
    await provider.sendAndConfirm(initOptionTx, [converter], { commitment: "confirmed" });

    // Derive necessary accounts for conversion
    const converterPtAta = await anchor.utils.token.associatedAddress({
      mint: ptMint,
      owner: converter.publicKey,
    });
    const protocolPtAta = await anchor.utils.token.associatedAddress({
      mint: ptMint,
      owner: configPda,
    });
    const nftMetadataPda = findMetadataPda(optionMint);
    const nftMasterEditionPda = findMasterEditionPda(optionMint);
    const collectionMetadataPda = findMetadataPda(collectionMint);
    const [optionDataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("option_data"), optionMint.toBuffer()],
      program.programId
    );

    // Get initial balances
    const initialCnAccount = await getAccount(
      provider.connection,
      depositorCnAta
    );
    const initialCnBalance = initialCnAccount.amount;
    let initialPtBalance = BigInt(0);
    try {
      const acc = await getAccount(provider.connection, converterPtAta);
      initialPtBalance = acc.amount;
    } catch (e) {
      /* ATA doesn't exist yet */
    }

    // perform full conversion (convert the entire amount)
    console.log("Attempting full conversion...");
    // convert with the full amount
    const txSignature = await program.methods
      .convert(depositAmount)
      .accountsStrict({
        converter: converter.publicKey,
        converterCnAta: depositorCnAta,
        converterOptionAta: depositorOptionAta,
        converterPtAta: converterPtAta,
        config: configPda,
        protocolPtAta: protocolPtAta,
        cnMint: cnMint,
        ptMint: ptMint,
        nftMint: optionMint,
        optionData: optionDataPda,
        nftMetadata: nftMetadataPda,
        nftMasterEdition: nftMasterEditionPda,
        collectionMetadata: collectionMetadataPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        metadataProgram: TOKEN_METADATA_PROGRAM_ID,
        sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([converter])
      .rpc({ commitment: "confirmed" });

    console.log("Full conversion successful:", txSignature);

    // now close the OptionData account to do the needful
    console.log("Closing OptionData account to do the needful...");
    
    // get the config account to find the authority (receiver of lamports)
    const configAccountInfo = await program.account.config.fetch(configPda);
    const configAuthority = configAccountInfo.authority;
    
    if (!configAuthority) {
      throw new Error("Config authority not set");
    }
    
    // call the close_option_account instruction
    const closeOptionTxSignature = await program.methods
      .closeOptionAccount()
      .accounts({
        config: configPda,
        optionData: optionDataPda,
        optionMint: optionMint,
        receiver: configAuthority,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ commitment: "confirmed" });
      
    console.log("OptionData account closed successfully:", closeOptionTxSignature);

    // verify CN tokens were burned
    const finalCnAccount = await getAccount(
      provider.connection,
      depositorCnAta
    );
    const expectedCnBalance = initialCnBalance - BigInt(depositAmount.toString());
    assert.strictEqual(
      finalCnAccount.amount.toString(),
      expectedCnBalance.toString(),
      "Converter CN balance should be reduced by full amount"
    );

    // verify PT tokens were received
    const finalPtAccount = await getAccount(
      provider.connection,
      converterPtAta
    );
    const expectedPtBalance = initialPtBalance + BigInt(depositAmount.toString());
    assert.strictEqual(
      finalPtAccount.amount.toString(),
      expectedPtBalance.toString(),
      "Converter PT balance should increase by full amount"
    );

    // verify NFT was burned
    try {
      await getAccount(provider.connection, depositorOptionAta);
      assert.fail("NFT should be burned after full conversion");
    } catch (error) {
      // expected error - NFT should be burned
      assert.ok(error.message.includes("TokenAccountNotFoundError") || 
                error.message.includes("Account does not exist") ||
                error.message.includes("could not find account"),
                "Expected NFT to be burned");
    }

    // after full conversion, OptionData should have amount = 0 but still exist
    const postConversionOptionData = await program.account.optionData.fetch(
      optionDataPda
    );
    assert.strictEqual(
      postConversionOptionData.amount.toString(),
      "0",
      "OptionData amount should be 0 after full conversion"
    );
    
    // after close_option_account, the OptionData account should be closed
    try {
      await program.account.optionData.fetch(optionDataPda);
      assert.fail("OptionData account should be closed after close_option_account");
    } catch (error) {
      // Expected error - account should be closed
      assert.ok(
        error.message.includes("Account does not exist") ||
        error.message.includes("could not find account"),
        "Expected OptionData to be closed"
      );
    }
    
    // verify the lamports were transferred to the config authority
    const authorityBalance = await provider.connection.getBalance(configAuthority);
    console.log(`Config authority balance: ${authorityBalance}`);
    assert.ok(
      authorityBalance > 0,
      "Config authority should have received lamports from closed OptionData account"
    );
  });
});
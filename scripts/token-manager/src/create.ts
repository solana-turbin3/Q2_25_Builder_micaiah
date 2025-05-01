import { PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram, Keypair } from '@solana/web3.js'; // Add Keypair import
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createInitializeMintInstruction, // Use this directly
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  createInitializeMetadataPointerInstruction,
  getMintLen,
  TYPE_SIZE,
  LENGTH_SIZE,
} from '@solana/spl-token';
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  createRemoveKeyInstruction,
  pack,
  TokenMetadata,
} from '@solana/spl-token-metadata';
import { connection, wallet, logSignature } from './utils';

// helper function to add metadata
async function addTokenMetadata(mint: PublicKey, metadata: TokenMetadata) {
  const mintInfo = await connection.getAccountInfo(mint);
  if (!mintInfo) {
    throw new Error('Failed to fetch mint info');
  }
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);

  // Calculate space required for metadata
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

  // Allocate space for the metadata account and initialize it
  const metadataKeypair = Keypair.generate();
  const lamports = await connection.getMinimumBalanceForRentExemption(metadataLen);

  const createMetadataAccountIx = SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: metadataKeypair.publicKey,
    space: metadataLen,
    lamports,
    programId: TOKEN_2022_PROGRAM_ID,
  });

  // Initialize the metadata account
  const initializeMetadataIx = createInitializeInstruction({
    programId: TOKEN_2022_PROGRAM_ID,
    metadata: metadataKeypair.publicKey,
    updateAuthority: wallet.publicKey,
    mint: mint,
    mintAuthority: wallet.publicKey,
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
  });

  // Initialize the metadata pointer on the mint
  const initializeMetadataPointerIx = createInitializeMetadataPointerInstruction(
    mint,
    wallet.publicKey, // Authority
    metadataKeypair.publicKey, // Metadata address
    TOKEN_2022_PROGRAM_ID
  );

  // Add additional fields
  const updateInstructions = metadata.additionalMetadata.map(([key, value]) =>
    createUpdateFieldInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: metadataKeypair.publicKey,
      updateAuthority: wallet.publicKey,
      field: key,
      value: value,
    })
  );

  const transaction = new Transaction().add(
    createMetadataAccountIx,
    initializeMetadataPointerIx, // Initialize pointer first
    initializeMetadataIx,       // Then initialize metadata account
    ...updateInstructions       // Then add fields
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [wallet, metadataKeypair]);
  logSignature(signature);
  console.log(`   Metadata Initialized at: ${metadataKeypair.publicKey.toString()}`);
}


export async function createTokens() {
  console.log('Starting token creation process...');
  console.log(`Using wallet: ${wallet.publicKey.toString()}`);

  // Calculate required Lamports for Mint accounts with Metadata Pointer extension
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

  /// ------------------------------------------------------------------------
  // 1. Create ZephyrHaus token (zHAUS)
  /// ------------------------------------------------------------------------
  console.log('\n1. Creating ZephyrHaus (zHAUS) token...');
  const zephyrHausMintKeypair = Keypair.generate();
  const zephyrHausMint = zephyrHausMintKeypair.publicKey;

  const createAccountIx_zHAUS = SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: zephyrHausMint, // Use the keypair's public key
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
  });

  // Instruction to initialize the Metadata Pointer extension
  // Note: Authority needs to be the mint authority
  // Note: Authority needs to be the mint authority. Metadata address is null for now.
  const initializeMetadataPointerIx_zHAUS = createInitializeMetadataPointerInstruction(
      zephyrHausMint,   // Mint Account address
      wallet.publicKey, // Authority that can set the metadata address
      null,             // Metadata Address (set later when metadata account is created)
      TOKEN_2022_PROGRAM_ID
  );

  // Instruction to initialize Mint account
  const initializeMintIx_zHAUS = createInitializeMintInstruction(
      zephyrHausMint,
      9, // decimals
      wallet.publicKey, // mint authority
      null, // freeze authority
      TOKEN_2022_PROGRAM_ID
  );

  // Create Mint Transaction
  const createMintTx_zHAUS = new Transaction().add(
      createAccountIx_zHAUS,
      initializeMetadataPointerIx_zHAUS, // Initialize pointer *before* initializing mint
      initializeMintIx_zHAUS
  );
  const createMintSig_zHAUS = await sendAndConfirmTransaction(connection, createMintTx_zHAUS, [wallet, zephyrHausMintKeypair]);
  logSignature(createMintSig_zHAUS);
  console.log(`   Mint Account Created: ${zephyrHausMint.toString()}`);

  // Create metadata for zHAUS
  const zephyrHausMetadata: TokenMetadata = {
    updateAuthority: wallet.publicKey,
    mint: zephyrHausMint, // Use the keypair's public key
    name: 'ZephyrHaus',
    symbol: 'zHAUS',
    uri: '', // Keep empty as before
    additionalMetadata: [
      ['description', 'ZephyrHaus governance token'],
      ['website', 'https://zephyr.haus']
    ]
  };
  await addTokenMetadata(zephyrHausMint, zephyrHausMetadata); // Use correct variable


  /// ------------------------------------------------------------------------
  // 2. Create zHAUS Bond token (zBOND)
  /// ------------------------------------------------------------------------
  console.log('\n2. Creating zHAUS Bond (zBOND) token...');
  const zBondMintKeypair = Keypair.generate();
  const zBondMint = zBondMintKeypair.publicKey;

  const createAccountIx_zBOND = SystemProgram.createAccount({
      fromPubkey: wallet.publicKey, newAccountPubkey: zBondMint, space: mintLen, lamports, programId: TOKEN_2022_PROGRAM_ID,
  });
  const initializeMetadataPointerIx_zBOND = createInitializeMetadataPointerInstruction(
      zBondMint, wallet.publicKey, null, TOKEN_2022_PROGRAM_ID
  );
  const initializeMintIx_zBOND = createInitializeMintInstruction(
      zBondMint, 6, wallet.publicKey, wallet.publicKey, TOKEN_2022_PROGRAM_ID
  );
  const createMintTx_zBOND = new Transaction().add(
      createAccountIx_zBOND, initializeMetadataPointerIx_zBOND, initializeMintIx_zBOND
  );
  const createMintSig_zBOND = await sendAndConfirmTransaction(connection, createMintTx_zBOND, [wallet, zBondMintKeypair]);
  logSignature(createMintSig_zBOND);
  console.log(`   Mint Account Created: ${zBondMint.toString()}`);

  // Create metadata for zBOND
  const zBondMetadata: TokenMetadata = {
    updateAuthority: wallet.publicKey,
    mint: zBondMint,
    name: 'zHAUS Bond',
    symbol: 'zBOND',
    uri: '',
    additionalMetadata: [
      ['description', 'Zephyr Haus Bond token'],
      ['website', 'https://zephyr.haus'],
      ['twitter', 'https://x.com/zephyr_haus']
    ]
  };
  await addTokenMetadata(zBondMint, zBondMetadata); // Use correct variable


  /// ------------------------------------------------------------------------
  // 3. Create Option NFT (zOPTION)
  /// ------------------------------------------------------------------------
  console.log('\n3. Creating zHAUS Option NFT (zOPTION)...');
  const optionNFTMintKeypair = Keypair.generate();
  const optionNFTMint = optionNFTMintKeypair.publicKey;

  const createAccountIx_zOPTION = SystemProgram.createAccount({
      fromPubkey: wallet.publicKey, newAccountPubkey: optionNFTMint, space: mintLen, lamports, programId: TOKEN_2022_PROGRAM_ID,
  });
  const initializeMetadataPointerIx_zOPTION = createInitializeMetadataPointerInstruction(
      optionNFTMint, wallet.publicKey, null, TOKEN_2022_PROGRAM_ID
  );
  const initializeMintIx_zOPTION = createInitializeMintInstruction(
      optionNFTMint, 0, wallet.publicKey, wallet.publicKey, TOKEN_2022_PROGRAM_ID
  );
  const createMintTx_zOPTION = new Transaction().add(
      createAccountIx_zOPTION, initializeMetadataPointerIx_zOPTION, initializeMintIx_zOPTION
  );
  const createMintSig_zOPTION = await sendAndConfirmTransaction(connection, createMintTx_zOPTION, [wallet, optionNFTMintKeypair]);
  logSignature(createMintSig_zOPTION);
  console.log(`   Mint Account Created: ${optionNFTMint.toString()}`);

  // Create metadata for zOPTION
  const optionNFTMetadata: TokenMetadata = {
    updateAuthority: wallet.publicKey,
    mint: optionNFTMint,
    name: 'zHAUS Option',
    symbol: 'zOPTION',
    uri: '',
    additionalMetadata: [
      ['description', 'Option to convert zBOND to zHAUS'],
      ['underlying_bond', zBondMint.toString()], // Use the keypair's public key
      ['target_token', zephyrHausMint.toString()], // Use the keypair's public key
      ['maturity', '365 days'],
      ['yield', '8.5%'],
      ['issueDate', new Date().toISOString()]
    ]
  };
  await addTokenMetadata(optionNFTMint, optionNFTMetadata); // Use correct variable


  console.log('\n===== Token Creation Summary =====');
  console.log(`zHAUS Mint: ${zephyrHausMint.toString()}`);
  console.log(`zBOND Mint: ${zBondMint.toString()}`);
  console.log(`zOPTION Mint: ${optionNFTMint.toString()}`);
  console.log('\nToken creation process finished.');
}
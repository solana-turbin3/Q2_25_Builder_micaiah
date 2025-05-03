import { PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram, Keypair } from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  createInitializeMetadataPointerInstruction,
  getMintLen,
  TYPE_SIZE,
  LENGTH_SIZE,
} from '@solana/spl-token';
import {
  createUpdateFieldInstruction,
  pack,
  TokenMetadata,
  createInitializeInstruction as createInitializeMetadataInstruction,
} from '@solana/spl-token-metadata';
import { connection, wallet, logSignature } from './utils';

export async function createTokens() {
  console.log('Starting token creation process...');
  console.log(`Using wallet: ${wallet.publicKey.toString()}`);

  console.log('\n1. Creating ZephyrHaus (zHAUS) token...');
  const mint = Keypair.generate();
  const zHausMint = mint;

  const zHausMetaData: TokenMetadata = {
    updateAuthority: wallet.publicKey,
    mint: zHausMint.publicKey,
    name: 'ZephyrHaus',
    symbol: 'zHAUS',
    uri: '',
    additionalMetadata: [
      ['description', 'ZephyrHaus governance token'],
      ['website', 'https://zephyr.haus'],
      ['twitter', 'https://x.com/zephyr_haus']
    ]
  };
  // Size of metadata
  const zHausMetadataLen = pack(zHausMetaData).length;

  // Size of MetadataExtension 2 bytes for type, 2 bytes for length
  const metadataExtension = TYPE_SIZE + LENGTH_SIZE;

  // Size of Mint Account with extension
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);

  // Minimum lamports required for Mint Account
  const lamports = await connection.getMinimumBalanceForRentExemption(
    mintLen + metadataExtension + zHausMetadataLen
  );

  const createAccountIx_zHAUS = SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: zHausMint.publicKey,
    space: mintLen, // use total calculated space
    lamports: lamports,
    programId: TOKEN_2022_PROGRAM_ID,
  });

  const initializeMetadataPointerIx_zHAUS = createInitializeMetadataPointerInstruction(
    zHausMint.publicKey, // mint associated 
    wallet.publicKey, // authority to update pointer
    zHausMint.publicKey,   // metadata address can be the mint itself
    TOKEN_2022_PROGRAM_ID
  );

  // instruction to initialize the mint account
  // GETTING INVALID ACCOUNT DATA HERE
  const initializeMintIx_zHAUS = createInitializeMintInstruction(
    zHausMint.publicKey,
    9, // decimals
    wallet.publicKey, // mint authority
    null, // freeze authority (optional, set to null if not needed)
    TOKEN_2022_PROGRAM_ID
  );

  // instruction to initialize the metadata fields in the account
  // this packs and writes the metadata into the space previously allocated.
  const initializeMetadataIx_zHAUS = createInitializeMetadataInstruction({
    programId: TOKEN_2022_PROGRAM_ID, // program id
    metadata: zHausMint.publicKey, // account address where metadata is stored (the mint account)
    updateAuthority: wallet.publicKey, // metadata update authority
    mint: zHausMint.publicKey, // mint associated
    mintAuthority: wallet.publicKey, // authority that can mint tokens
    name: zHausMetaData.name, // name from metadata object
    symbol: zHausMetaData.symbol, // symbol from metadata object
    uri: zHausMetaData.uri, // uri from metadata object
  });

  // instructions to add the additional metadata fields
  const updateAdditionalMetaIx_zHAUS = zHausMetaData.additionalMetadata.map(([field, value]) =>
    createUpdateFieldInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: zHausMint.publicKey,
      updateAuthority: wallet.publicKey,
      field,
      value,
    })
  );

  console.log(updateAdditionalMetaIx_zHAUS);

  // ---------

  // transaction for zHAUS
  const tx_zHAUS = new Transaction().add(
    createAccountIx_zHAUS,           // 1. create the account
    initializeMetadataPointerIx_zHAUS, // 2. init the pointer extension
    initializeMintIx_zHAUS,            // 3. init the mint
    initializeMetadataIx_zHAUS,        // 4. init the core metadata fields
    ...updateAdditionalMetaIx_zHAUS    // 5. add/update additional fields
  );

  // add try/catch for better error visibility
  try {
    const sig_zHAUS = await sendAndConfirmTransaction(connection, tx_zHAUS, [wallet, zHausMint], { commitment: 'confirmed' });
    logSignature(sig_zHAUS);
    console.log(`   zHAUS Mint & Metadata Initialized: ${zHausMint.publicKey.toString()}`);
  } catch (error) {
    console.error("error creating zHAUS token:", error);
    // optionally re-throw or handle as needed
    throw error;
  }

  // / ------------------------------------------------------------------------
  // 2. create zHAUS bond token (zBOND)
  // / ------------------------------------------------------------------------
  console.log('\n2. creating zHAUS bond (zBOND) token...');
  const zBondMintKeypair = Keypair.generate();
  const zBondMint = zBondMintKeypair.publicKey;

  const zBondMetadata: TokenMetadata = {
    updateAuthority: wallet.publicKey,
    mint: zBondMint,
    name: 'zHAUS Bond',
    symbol: 'zBOND',
    uri: '',
    additionalMetadata: [
      ['description', 'ZephyrHaus Bond token'],
      ['website', 'https://zephyr.haus'],
      ['twitter', 'https://x.com/zephyr_haus']
    ]
  };

    // Size of metadata
    const zBondMetadataLen = pack(zHausMetaData).length;
    // Minimum lamports required for Mint Account
    const zBondTotalLen = await connection.getMinimumBalanceForRentExemption(
      mintLen + metadataExtension + zBondMetadataLen
    );

  // calculate space for zBOND *after* defining metadata
  const zBondLamports = await connection.getMinimumBalanceForRentExemption(zBondTotalLen);

  // instructions for zBOND
  const createAccountIx_zBond = SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: zBondMint,
    space: zBondTotalLen,
    lamports: zBondLamports,
    programId: TOKEN_2022_PROGRAM_ID,
  });
  
  const initializeMetadataPointerIx_zBond = createInitializeMetadataPointerInstruction(
    zBondMint,
    wallet.publicKey,
    zBondMint,
    TOKEN_2022_PROGRAM_ID
  );

    // instruction to initialize the metadata fields in the account
  // this packs and writes the metadata into the space previously allocated.
  const initializeMetadataIx_zBond = createInitializeMetadataInstruction({
    programId: TOKEN_2022_PROGRAM_ID, // program id
    metadata: zBondMint, // account address where metadata is stored (the mint account)
    updateAuthority: wallet.publicKey, // metadata update authority
    mint: zBondMint, // mint associated
    mintAuthority: wallet.publicKey, // authority that can mint tokens
    name: zBondMetadata.name, // name from metadata object
    symbol: zBondMetadata.symbol, // symbol from metadata object
    uri: zBondMetadata.uri, // uri from metadata object
  });

  const initializeMintIx_zBond = createInitializeMintInstruction(
    zBondMint,
    6,
    wallet.publicKey,
    wallet.publicKey,
    TOKEN_2022_PROGRAM_ID
  );

  const updateAdditionalMetaIx_zBond = zBondMetadata.additionalMetadata.map(([field,
    value]) =>
    createUpdateFieldInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: zBondMint,
      updateAuthority: wallet.publicKey,
      field,
      value
    })
  );

  // transaction for zBOND
  const tx_zBond = new Transaction().add(
    createAccountIx_zBond,           // 1. create the account
    initializeMetadataPointerIx_zBond, // 2. init the pointer extension
    initializeMintIx_zBond,            // 3. init the mint
    initializeMetadataIx_zBond,        // 4. init the core metadata fields
    ...updateAdditionalMetaIx_zBond    // 5. add/update additional fields
  );


  const sig_zBOND = await sendAndConfirmTransaction(connection,
    tx_zBond,
    [wallet,
      zBondMintKeypair]);
  logSignature(sig_zBOND);
  console.log(`   zBOND Mint & Metadata Initialized: ${zBondMint.toString()}`);


  console.log('\n===== Token Creation Summary =====');
  console.log(`zHAUS Mint: ${zHausMint.toString()}`);
  console.log(`zBOND Mint: ${zBondMint.toString()}`);
  console.log('\nToken creation process finished.');
}


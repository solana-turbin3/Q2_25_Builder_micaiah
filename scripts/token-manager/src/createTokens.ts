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

  console.log('\n1. creating zephyrhaus (zhaus) token...');
  const zHausMintKeypair = Keypair.generate();
  const zHausMint = zHausMintKeypair.publicKey;

  const zHausMetaData: TokenMetadata = {
    updateAuthority: wallet.publicKey,
    mint: zHausMint,
    name: 'ZephyrHaus',
    symbol: 'zHAUS',
    uri: '',
    additionalMetadata: [
      ['description', 'ZephyrHaus governance token'],
      ['website', 'https://zephyr.haus'],
      ['twitter', 'https://x.com/zephyr_haus']
    ]
  };
  // size of metadata
  const zHausMetadataLen = pack(zHausMetaData).length;

  // size of metadataextension 2 bytes for type, 2 bytes for length
  const metadataExtension = TYPE_SIZE + LENGTH_SIZE;

  // size of mint account with extension
  const zHausMintLen = getMintLen([ExtensionType.MetadataPointer]);

  // minimum lamports required for mint account
  const zHausLamports = await connection.getMinimumBalanceForRentExemption(
    zHausMintLen + metadataExtension + zHausMetadataLen
  );

  const createAccountIx_zHAUS = SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: zHausMint, // use public key directly
    space: zHausMintLen, // use renamed space variable
    lamports: zHausLamports, // use renamed lamports variable
    programId: TOKEN_2022_PROGRAM_ID,
  });

  const initializeMetadataPointerIx_zHAUS = createInitializeMetadataPointerInstruction(
    zHausMint, // mint associated (use public key directly)
    wallet.publicKey, // authority to update pointer
    zHausMint,   // metadata address can be the mint itself (use public key directly)
    TOKEN_2022_PROGRAM_ID
  );

  // instruction to initialize the mint account
  // getting invalid account data here
  const initializeMintIx_zHAUS = createInitializeMintInstruction(
    zHausMint, // use public key directly
    9, // decimals
    wallet.publicKey, // mint authority
    null, // freeze authority (optional, set to null if not needed)
    TOKEN_2022_PROGRAM_ID
  );

  // instruction to initialize the metadata fields in the account
  // this packs and writes the metadata into the space previously allocated.
  const initializeMetadataIx_zHAUS = createInitializeMetadataInstruction({
    programId: TOKEN_2022_PROGRAM_ID, // program id
    metadata: zHausMint, // account address where metadata is stored (the mint account) (use public key directly)
    updateAuthority: wallet.publicKey, // metadata update authority
    mint: zHausMint, // mint associated (use public key directly)
    mintAuthority: wallet.publicKey, // authority that can mint tokens
    name: zHausMetaData.name, // name from metadata object
    symbol: zHausMetaData.symbol, // symbol from metadata object
    uri: zHausMetaData.uri, // uri from metadata object
  });

  // instructions to add the additional metadata fields
  const updateAdditionalMetaIx_zHAUS = zHausMetaData.additionalMetadata.map(([field, value]) =>
    createUpdateFieldInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: zHausMint, // use public key directly
      updateAuthority: wallet.publicKey,
      field,
      value,
    })
  );

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
    const sig_zHAUS = await sendAndConfirmTransaction(connection, tx_zHAUS, [wallet, zHausMintKeypair], { commitment: 'confirmed' });
    logSignature(sig_zHAUS);
    console.log(`   zHAUS Mint & Metadata Initialized: ${zHausMint.toString()}`);
  } catch (error) {
    console.error("error creating zhaus token:", error);
    // optionally re-throw or handle as needed
    throw error;
  }

  // / ------------------------------------------------------------------------
  // 2. create zhaus bond token (zbond)
  // / ------------------------------------------------------------------------
  console.log('\n2. creating zhaus bond (zbond) token...');
  const zBondMintKeypair = Keypair.generate();
  const zBondMint = zBondMintKeypair.publicKey;

  const zBondMetaData: TokenMetadata = {
    updateAuthority: wallet.publicKey,
    mint: zBondMint,
    name: 'ZephyrHaus',
    symbol: 'zBond',
    uri: '',
    additionalMetadata: [
      ['description', 'ZephyrHaus governance token'],
      ['website', 'https://zephyr.haus'],
      ['twitter', 'https://x.com/zephyr_haus']
    ]
  };
  // size of metadata
  const zBondMetadataLen = pack(zBondMetaData).length;

  // size of mint account with extension
  const zBondMintLen = getMintLen([ExtensionType.MetadataPointer]);

  // minimum lamports required for mint account
  const zBondLamports = await connection.getMinimumBalanceForRentExemption(
    zBondMintLen + metadataExtension + zBondMetadataLen
  );

  const createAccountIx_zBond = SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: zBondMint, // use public key directly
    space: zBondMintLen, // use renamed space variable
    lamports: zBondLamports, // use renamed lamports variable
    programId: TOKEN_2022_PROGRAM_ID,
  });

  const initializeMetadataPointerIx_zBond = createInitializeMetadataPointerInstruction(
    zBondMint, // mint associated (use public key directly)
    wallet.publicKey, // authority to update pointer
    zBondMint,   // metadata address can be the mint itself (use public key directly)
    TOKEN_2022_PROGRAM_ID
  );

  // instruction to initialize the mint account
  // getting invalid account data here
  const initializeMintIx_zBond = createInitializeMintInstruction(
    zBondMint, // use public key directly
    9, // decimals
    wallet.publicKey, // mint authority
    null, // freeze authority (optional, set to null if not needed)
    TOKEN_2022_PROGRAM_ID
  );

  // instruction to initialize the metadata fields in the account
  // this packs and writes the metadata into the space previously allocated.
  const initializeMetadataIx_zBond = createInitializeMetadataInstruction({
    programId: TOKEN_2022_PROGRAM_ID, // program id
    metadata: zBondMint, // account address where metadata is stored (the mint account) (use public key directly)
    updateAuthority: wallet.publicKey, // metadata update authority
    mint: zBondMint, // mint associated (use public key directly)
    mintAuthority: wallet.publicKey, // authority that can mint tokens
    name: zBondMetaData.name, // name from metadata object
    symbol: zBondMetaData.symbol, // symbol from metadata object
    uri: zBondMetaData.uri, // uri from metadata object
  });

  // instructions to add the additional metadata fields
  const updateAdditionalMetaIx_zBond = zBondMetaData.additionalMetadata.map(([field, value]) =>
    createUpdateFieldInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: zBondMint, // use public key directly
      updateAuthority: wallet.publicKey,
      field,
      value,
    })
  );

  // ---------

  // transaction for zBond
  const tx_zBond = new Transaction().add(
    createAccountIx_zBond,           // 1. create the account
    initializeMetadataPointerIx_zBond, // 2. init the pointer extension
    initializeMintIx_zBond,            // 3. init the mint
    initializeMetadataIx_zBond,        // 4. init the core metadata fields
    ...updateAdditionalMetaIx_zBond    // 5. add/update additional fields
  );

  // add try/catch for better error visibility
  try {
    const sig_zBond = await sendAndConfirmTransaction(connection, tx_zBond, [wallet, zBondMintKeypair], { commitment: 'confirmed' });
    logSignature(sig_zBond);
    console.log(`   zBond Mint & Metadata Initialized: ${zBondMint.toString()}`);
  } catch (error) {
    console.error("error creating zBond token:", error);
    // optionally re-throw or handle as needed
    throw error;
  }


  console.log('\n===== token creation summary =====');
  console.log(`zHAUS Mint: ${zHausMint.toString()}`);
  console.log(`zBOND Mint: ${zBondMint.toString()}`);
  console.log('\ntoken creation process finished.');
}


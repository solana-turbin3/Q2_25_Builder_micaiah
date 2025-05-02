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

  /// ------------------------------------------------------------------------
  console.log('\n1. Creating ZephyrHaus (zHAUS) token...');
  const mint = Keypair.generate();
  const zephyrHausMint = mint;

  const zephyrHausMetadata: TokenMetadata = {
    updateAuthority: wallet.publicKey,
    mint: zephyrHausMint.publicKey,
    name: 'ZephyrHaus',
    symbol: 'zHAUS',
    uri: '',
    additionalMetadata: [
      ['description', 'ZephyrHaus governance token'],
      ['website', 'https://zephyr.haus']
    ]
  };

  // calculate space for zHAUS *after* defining metadata
  const zephyrHausMintLen = getMintLen([ExtensionType.MetadataPointer]);
  const zephyrHausMetaLen = TYPE_SIZE + LENGTH_SIZE + pack(zephyrHausMetadata).length;
  const zephyrHausTotalLen = zephyrHausMintLen + zephyrHausMetaLen;
  const zephyrHausLamports = await connection.getMinimumBalanceForRentExemption(zephyrHausTotalLen);

  // instructions for zHAUS

  //   type createaccountparams = {
  //     /** the account that will transfer lamports to the created account */
  //     frompubkey: PublicKey;
  //     /** public key of the created account */
  //     newaccountpubkey: PublicKey;
  //     /** amount of lamports to transfer to the created account */
  //     lamports: number;
  //     /** amount of space in bytes to allocate to the created account */
  //     space: number;
  //     /** public key of the program to assign as the owner of the created account */
  //     programid: PublicKey;
  // };

  const createAccountIx_zHAUS = SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: zephyrHausMint.publicKey,
    space: zephyrHausTotalLen, // use total calculated space
    lamports: zephyrHausLamports,
    programId: TOKEN_2022_PROGRAM_ID,
  });

  // ---------

  /**
   * Construct an Initialize MetadataPointer instruction
   *
   * @param mint            Token mint account
   * @param authority       Optional Authority that can set the metadata address
   * @param metadataAddress Optional Account address that holds the metadata
   * @param programId       SPL Token program account
   *
   * @return Instruction to add to a transaction
   */

  const initializeMetadataPointerIx_zHAUS = createInitializeMetadataPointerInstruction(
    zephyrHausMint.publicKey, // mint associated 
    wallet.publicKey, // authority to update pointer
    zephyrHausMint.publicKey,   // metadata address can be the mint itself
    TOKEN_2022_PROGRAM_ID
  );

  // ---------

  /**
   * Construct an InitializeMint instruction
   *
   * @param mint            Token mint account
   * @param decimals        Number of decimals in token account amounts
   * @param mintAuthority   Minting authority
   * @param freezeAuthority Optional authority that can freeze token accounts
   * @param programId       SPL Token program account
   *
   * @return Instruction to add to a transaction
   */

  // instruction to initialize the mint account
  // GETTING INVALID ACCOUNT DATA HERE
  const initializeMintIx_zHAUS = createInitializeMintInstruction(
    zephyrHausMint.publicKey,
    9, // decimals
    wallet.publicKey, // mint authority
    null, // freeze authority (optional, set to null if not needed)
    TOKEN_2022_PROGRAM_ID
  );

  // ---------

  // export interface InitializeInstructionArgs {
  //   programId: PublicKey;
  //   metadata: PublicKey;
  //   updateAuthority: PublicKey;
  //   mint: PublicKey;
  //   mintAuthority: PublicKey;
  //   name: string;
  //   symbol: string;
  //   uri: string;
  // }

  // instruction to initialize the metadata fields in the account
  // this packs and writes the metadata into the space previously allocated.
  // const initializeMetadataIx_zHAUS = createInitializeMetadataInstruction({
  //   programId: TOKEN_2022_PROGRAM_ID, // program id
  //   metadata: zephyrHausMint.publicKey, // account address where metadata is stored (the mint account)
  //   updateAuthority: wallet.publicKey, // metadata update authority
  //   mint: zephyrHausMint.publicKey, // mint associated
  //   mintAuthority: wallet.publicKey, // authority that can mint tokens
  //   name: zephyrHausMetadata.name, // name from metadata object
  //   symbol: zephyrHausMetadata.symbol, // symbol from metadata object
  //   uri: zephyrHausMetadata.uri, // uri from metadata object
  // });

  // ---------

  //   export interface UpdateFieldInstruction {
  //     programId: PublicKey;
  //     metadata: PublicKey;
  //     updateAuthority: PublicKey;
  //     field: Field | string;
  //     value: string;
  // }

  // instructions to add the additional metadata fields
  // const updateAdditionalMetaIx_zHAUS = zephyrHausMetadata.additionalMetadata.map(([field, value]) =>
  //   createUpdateFieldInstruction({
  //     programId: TOKEN_2022_PROGRAM_ID,
  //     metadata: zephyrHausMint.publicKey,
  //     updateAuthority: wallet.publicKey,
  //     field,
  //     value,
  //   })
  // );

  // ---------

  // transaction for zHAUS
  const tx_zHAUS = new Transaction().add(
    createAccountIx_zHAUS,           // 1. create the account
    initializeMetadataPointerIx_zHAUS, // 2. init the pointer extension
    initializeMintIx_zHAUS,            // 3. init the mint
    // initializeMetadataIx_zHAUS,        // 4. init the core metadata fields
    // ...updateAdditionalMetaIx_zHAUS    // 5. add/update additional fields
  );

  // add try/catch for better error visibility
  try {
    const sig_zHAUS = await sendAndConfirmTransaction(connection, tx_zHAUS, [wallet, zephyrHausMint], { commitment: 'confirmed' });
    logSignature(sig_zHAUS);
    console.log(`   zHAUS Mint & Metadata Initialized: ${zephyrHausMint.publicKey.toString()}`);
  } catch (error) {
    console.error("error creating zHAUS token:", error);
    // optionally re-throw or handle as needed
    throw error;
  }


  // --- (commented out zbond, zoption) ---


  /// ------------------------------------------------------------------------
  // 2. create zHAUS bond token (zBOND)
  /// ------------------------------------------------------------------------
  // console.log('\n2. creating zHAUS bond (zBOND) token...');
  // const zBondMintKeypair = Keypair.generate();
  // const zBondMint = zBondMintKeypair.publicKey;

  // const zBondMetadata: TokenMetadata = {
  //   updateAuthority: wallet.publicKey,
  //   mint: zBondMint,
  //   name: 'zHAUS Bond',
  //   symbol: 'zBOND',
  //   uri: '',
  //   additionalMetadata: [
  //     ['description', 'Zephyr Haus Bond token'],
  //     ['website', 'https://zephyr.haus'],
  //     ['twitter', 'https://x.com/zephyr_haus']
  //   ]
  // };

  // // calculate space for zBOND *after* defining metadata
  // const zBondMintLen = getMintLen([ExtensionType.MetadataPointer]);
  // const zBondMetaLen = TYPE_SIZE + LENGTH_SIZE + pack(zBondMetadata).length;
  // const zBondTotalLen = zBondMintLen + zBondMetaLen;
  // const zBondLamports = await connection.getMinimumBalanceForRentExemption(zBondTotalLen);

  // // instructions for zBOND
  // const createAccountIx_zBOND = SystemProgram.createAccount({
  //   fromPubkey: wallet.publicKey,
  //   newAccountPubkey: zBondMint,
  //   space: zBondTotalLen,
  //   lamports: zBondLamports,
  //   programId: TOKEN_2022_PROGRAM_ID,
  // });
  
  // const initializeMetadataPointerIx_zBOND = createInitializeMetadataPointerInstruction(
  //   zBondMint,
  //   wallet.publicKey,
  //   zBondMint,
  //   TOKEN_2022_PROGRAM_ID
  // );

  // const initializeMintIx_zBOND = createInitializeMintInstruction(
  //   zBondMint,
  //   6,
  //   wallet.publicKey,
  //   wallet.publicKey,
  //   TOKEN_2022_PROGRAM_ID
  // );

  // const updateNameIx_zBOND = createUpdateFieldInstruction({
  //   programId: TOKEN_2022_PROGRAM_ID,
  //   metadata: zBondMint,
  //   updateAuthority: wallet.publicKey,
  //   field: 'name',
  //   value: zBondMetadata.name
  // });

  // const updateSymbolIx_zBOND = createUpdateFieldInstruction({
  //   programId: TOKEN_2022_PROGRAM_ID,
  //   metadata: zBondMint,
  //   updateAuthority: wallet.publicKey,
  //   field: 'symbol',
  //   value: zBondMetadata.symbol
  // });

  // const updateUriIx_zBOND = createUpdateFieldInstruction({
  //   programId: TOKEN_2022_PROGRAM_ID,
  //   metadata: zBondMint,
  //   updateAuthority: wallet.publicKey,
  //   field: 'uri',
  //   value: zBondMetadata.uri
  // });

  // const updateAdditionalMetaIx_zBOND = zBondMetadata.additionalMetadata.map(([field,
  //   value]) =>
  //   createUpdateFieldInstruction({
  //     programId: TOKEN_2022_PROGRAM_ID,
  //     metadata: zBondMint,
  //     updateAuthority: wallet.publicKey,
  //     field,
  //     value
  //   })
  // );

  // // transaction for zBOND
  // const tx_zBOND = new Transaction().add(
  //   createAccountIx_zBOND,
  //   initializeMetadataPointerIx_zBOND,
  //   initializeMintIx_zBOND,
  //   updateNameIx_zBOND,
  //   updateSymbolIx_zBOND,
  //   updateUriIx_zBOND,
  //   ...updateAdditionalMetaIx_zBOND
  // );
  // const sig_zBOND = await sendAndConfirmTransaction(connection,
  //   tx_zBOND,
  //   [wallet,
  //     zBondMintKeypair]);
  // logSignature(sig_zBOND);
  // console.log(`   zBOND Mint & Metadata Initialized: ${zBondMint.toString()}`);


  //   /// ------------------------------------------------------------------------
  //   // 3. create option nft (zOPTION)
  //   /// ------------------------------------------------------------------------
  // console.log('\n3. creating zHAUS option nft (zOPTION)...');
  // const zBondMint = Keypair.generate();
  // const optionNFTMint = zBondMint.publicKey;

  // const optionNFTMetadata: TokenMetadata = {
  //   updateAuthority: wallet.publicKey,
  //   mint: optionNFTMint, // use actual mint pubkey
  //   name: 'zHAUS Option',
  //   symbol: 'zOPTION',
  //   uri: '',
  //   additionalMetadata: [
  //     ['description', 'Option to convert zBOND to zHAUS'],
  //     ['underlying_bond', zBondMint.toString()], // use actual mint pubkey
  //     ['target_token', zephyrHausMint.toString()], // use actual mint pubkey
  //     ['maturity', '365 days'],
  //     ['yield', '8.5%'],
  //     ['issueDate', new Date().toISOString()]
  //   ]
  // };

  // const optionNFTMintLen = getMintLen([ExtensionType.MetadataPointer]);
  // const optionNFTMetaLen = TYPE_SIZE + LENGTH_SIZE + pack(optionNFTMetadata).length;
  // const optionNFTTotalLen = optionNFTMintLen + optionNFTMetaLen;
  // const optionNFTLamports = await connection.getMinimumBalanceForRentExemption(optionNFTTotalLen);

  // // instructions for zOPTION (manual flow)
  // const createAccountIx_zOPTION = SystemProgram.createAccount({
  //   fromPubkey: wallet.publicKey,
  //   newAccountPubkey: optionNFTMint,
  //   space: optionNFTTotalLen,
  //   lamports: optionNFTLamports,
  //   programId: TOKEN_2022_PROGRAM_ID,
  // });

  // const initializeMetadataPointerIx_zOPTION = createInitializeMetadataPointerInstruction(
  //   optionNFTMint, wallet.publicKey, optionNFTMint, TOKEN_2022_PROGRAM_ID // add program id
  // );

  // const initializeMintIx_zOPTION = createInitializeMintInstruction(
  //   optionNFTMint, 0, wallet.publicKey, wallet.publicKey, TOKEN_2022_PROGRAM_ID
  // );

  // const updateNameIx_zOPTION = createUpdateFieldInstruction({
  //   programId: TOKEN_2022_PROGRAM_ID,
  //   metadata: optionNFTMint,
  //   updateAuthority: wallet.publicKey,
  //   field: 'name',
  //   value: optionNFTMetadata.name
  // });

  // const updateSymbolIx_zOPTION = createUpdateFieldInstruction({
  //   programId: TOKEN_2022_PROGRAM_ID,
  //   metadata: optionNFTMint,
  //   updateAuthority: wallet.publicKey,
  //   field: 'symbol',
  //   value: optionNFTMetadata.symbol
  // });

  // const updateUriIx_zOPTION = createUpdateFieldInstruction({
  //   programId: TOKEN_2022_PROGRAM_ID,
  //   metadata: optionNFTMint,
  //   updateAuthority: wallet.publicKey,
  //   field: 'uri',
  //   value: optionNFTMetadata.uri
  // });

  // const updateAdditionalMetaIx_zOPTION = optionNFTMetadata.additionalMetadata.map(([field,
  //   value]) =>
  //   createUpdateFieldInstruction({
  //     programId: TOKEN_2022_PROGRAM_ID,
  //     metadata: optionNFTMint,
  //     updateAuthority: wallet.publicKey,
  //     field,
  //     value
  //   })
  // );

  // transaction for zOPTION
  // const tx_zOPTION = new Transaction().add(
  //   createAccountIx_zOPTION,
  //   initializeMetadataPointerIx_zOPTION,
  //   initializeMintIx_zOPTION,
  //   updateNameIx_zOPTION,
  //   updateSymbolIx_zOPTION,
  //   updateUriIx_zOPTION,
  //   ...updateAdditionalMetaIx_zOPTION
  // );
  // const sig_zOPTION = await sendAndConfirmTransaction(connection, tx_zOPTION, [wallet, zBondMint]);
  // logSignature(sig_zOPTION);
  // console.log(`   zOPTION Mint & Metadata Initialized: ${optionNFTMint.toString()}`);


  console.log('\n===== Token Creation Summary =====');
  console.log(`zHAUS Mint: ${zephyrHausMint.toString()}`);
  //   console.log(`zBOND Mint: ${zBondMint.toString()}`);
  //   console.log(`zOPTION Mint: ${optionNFTMint.toString()}`);
  console.log('\nToken creation process finished.');
}


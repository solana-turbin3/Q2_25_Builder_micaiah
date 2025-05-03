import { PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram, Keypair } from '@solana/web3.js';
import {
    createInitializeMintInstruction,
    TOKEN_2022_PROGRAM_ID,
    ExtensionType,
    createInitializeMetadataPointerInstruction,
    createSetAuthorityInstruction,
    getMintLen,
    TYPE_SIZE,
    LENGTH_SIZE,
    AuthorityType,
} from '@solana/spl-token';
import {
    createUpdateFieldInstruction,
    pack,
    TokenMetadata,
    createInitializeInstruction as createInitializeMetadataInstruction,
} from '@solana/spl-token-metadata';
import { connection, wallet, logSignature } from './utils';

export async function createCollection(
    programId: PublicKey,
    zHausMintAddress: string,
    zBondMintAddress: string
) {
    /// ------------------------------------------------------------------------
    // create parent collection NFT (zOPTION)
    /// ------------------------------------------------------------------------
    console.log('\n1. creating zHAUS option collection NFT...');
    // keypair for the new collection nft mint itself
    const optionNFTMintKeypair = Keypair.generate();
    const optionNFTMint = optionNFTMintKeypair.publicKey;
    

    // Derive PDA for program authority
    const [authorityPDA, authorityBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        programId
    );

    const optionNFTMetadata: TokenMetadata = {
        updateAuthority: authorityPDA, // Set program PDA as authority
        mint: optionNFTMint,
        name: 'zHAUS Option Collection',
        symbol: 'zOPTION',
        uri: '',
        additionalMetadata: [
            ['description', 'Collection of options to convert zBOND to zHAUS'],
            ['collection_type', 'parent'],
            ['is_collection', 'true'],
            ['collection_authority', authorityPDA.toString()],
            ['collection_authority_bump', authorityBump.toString()],
            ['collection_verified_field', 'collection_verified'], // field name to check verification
            ['underlying_bond', zBondMintAddress], // use passed zBond mint
            ['target_token', zHausMintAddress], // use passed zHaus Mint
            ['maturity', '365 days'],
            ['yield', '8.5%'],
            ['issueDate', new Date().toISOString()]
        ]
    };

    const optionNFTMintLen = getMintLen([
        ExtensionType.MetadataPointer,
        // ExtensionType.NonTransferable // Optional: prevents collection NFT from being transferred
    ]);
    const optionNFTMetaLen = TYPE_SIZE + LENGTH_SIZE + pack(optionNFTMetadata).length;
    const optionNFTTotalLen = optionNFTMintLen + optionNFTMetaLen;
    const optionNFTLamports = await connection.getMinimumBalanceForRentExemption(optionNFTTotalLen);

    // instructions for collection NFT
    const createAccountIx_zOPTION = SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: optionNFTMint,
        space: optionNFTTotalLen,
        lamports: optionNFTLamports,
        programId: TOKEN_2022_PROGRAM_ID,
    });

    const initializeMetadataPointerIx_zOPTION = createInitializeMetadataPointerInstruction(
        optionNFTMint, wallet.publicKey, optionNFTMint, TOKEN_2022_PROGRAM_ID
    );

    const initializeMintIx_zOPTION = createInitializeMintInstruction(
        optionNFTMint, 0, wallet.publicKey, authorityPDA, TOKEN_2022_PROGRAM_ID
    );

    // // add NonTransferable extension (do we use this?)
    // const nonTransferableIx = createInitializeNonTransferableMintInstruction(
    //     optionNFTMint, TOKEN_2022_PROGRAM_ID
    // );

    const updateNameIx_zOPTION = createUpdateFieldInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: optionNFTMint,
        updateAuthority: wallet.publicKey, // initial update as wallet before transfer
        field: 'name',
        value: optionNFTMetadata.name
    });

    const updateSymbolIx_zOPTION = createUpdateFieldInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: optionNFTMint,
        updateAuthority: wallet.publicKey,
        field: 'symbol',
        value: optionNFTMetadata.symbol
    });

    const updateUriIx_zOPTION = createUpdateFieldInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: optionNFTMint,
        updateAuthority: wallet.publicKey,
        field: 'uri',
        value: optionNFTMetadata.uri
    });

    const updateAdditionalMetaIx_zOPTION = optionNFTMetadata.additionalMetadata.map(([field, value]) =>
        createUpdateFieldInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            metadata: optionNFTMint,
            updateAuthority: wallet.publicKey,
            field,
            value
        })
    );

    // transfer update authority to program PDA
    const transferAuthorityIx = createSetAuthorityInstruction(
        optionNFTMint,
        wallet.publicKey,
        AuthorityType.MetadataPointer,
        authorityPDA,
        [],
        TOKEN_2022_PROGRAM_ID
    );

    // transaction for zOPTION collection NFT
    const tx_zOPTION = new Transaction().add(
        createAccountIx_zOPTION,
        initializeMetadataPointerIx_zOPTION,
        initializeMintIx_zOPTION,
        updateNameIx_zOPTION,
        updateSymbolIx_zOPTION,
        updateUriIx_zOPTION,
        ...updateAdditionalMetaIx_zOPTION,
        transferAuthorityIx
    );

    // sign with wallet and the new collection nft mint keypair
    const sig_zOPTION = await sendAndConfirmTransaction(connection, tx_zOPTION, [wallet, optionNFTMintKeypair]);
    logSignature(sig_zOPTION);
    console.log(`   Collection NFT Initialized: ${optionNFTMint.toString()}`);
    console.log(`   Collection Authority PDA: ${authorityPDA.toString()}`);
}
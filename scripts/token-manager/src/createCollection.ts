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
    console.log('\n1. creating zOption option collection NFT...');
    // keypair for the new collection nft mint itself
    const zOptionMintKeypair = Keypair.generate();
    const zOptionMint = zOptionMintKeypair.publicKey;


    // Derive PDA for program authority
    const [authorityPDA, authorityBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        programId
    );

    const zOptionMetadata: TokenMetadata = {
        updateAuthority: authorityPDA, // Set program PDA as authority
        mint: zOptionMint,
        name: 'zOption Option Collection',
        symbol: 'zOPTION',
        uri: '',
        additionalMetadata: [
            ['description', 'Collection of options to convert zOption to zOption'],
            ['image', 'https://gtotheizm.com/image.png'],
            ['collection_type', 'parent'],
            ['is_collection', 'true'],
            ['collection_authority', authorityPDA.toString()],
            ['collection_authority_bump', authorityBump.toString()],
            ['collection_verified_field', 'collection_verified'], // field name to check verification
        ]
    };
    // size of metadata
    const zOptionMetadataLen = pack(zOptionMetadata).length;

    // size of MetadataExtension 2 bytes for type, 2 bytes for length
    const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
    const zOptionMintLen = getMintLen([
        ExtensionType.MetadataPointer,
        // ExtensionType.NonTransferable // Optional: prevents collection NFT from being transferred
    ]);

    // minimum lamports required for mint account
    const zOptionLamports = await connection.getMinimumBalanceForRentExemption(
        zOptionMintLen + metadataExtension + zOptionMetadataLen
    );

    // instructions for collection NFT
    const createAccountIx_zOPTION = SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: zOptionMint,
        space: zOptionMintLen,
        lamports: zOptionLamports,
        programId: TOKEN_2022_PROGRAM_ID,
    });

    const initializeMetadataPointerIx_zOPTION = createInitializeMetadataPointerInstruction(
        zOptionMint,
        wallet.publicKey,
        zOptionMint, 
        TOKEN_2022_PROGRAM_ID
    );

        // instruction to initialize the metadata fields in the account
    // this packs and writes the metadata into the space previously allocated.
    const initializeMetadataIx_zOption = createInitializeMetadataInstruction({
        programId: TOKEN_2022_PROGRAM_ID, // program id
        metadata: zOptionMint, // account address where metadata is stored (the mint account) (use public key directly)
        updateAuthority: wallet.publicKey, // metadata update authority
        mint: zOptionMint, // mint associated (use public key directly)
        mintAuthority: wallet.publicKey, // authority that can mint tokens
        name: zOptionMetadata.name, // name from metadata object
        symbol: zOptionMetadata.symbol, // symbol from metadata object
        uri: zOptionMetadata.uri, // uri from metadata object
    });
    

    const initializeMintIx_zOPTION = createInitializeMintInstruction(
        zOptionMint,
        0,
        wallet.publicKey,
        null,
        TOKEN_2022_PROGRAM_ID
    );

    // // add NonTransferable extension (do we use this?)
    // const nonTransferableIx = createInitializeNonTransferableMintInstruction(
    //     zOptionMint, TOKEN_2022_PROGRAM_ID
    // );

    const updateAdditionalMetaIx_zOPTION = zOptionMetadata.additionalMetadata.map(([field, value]) =>
        createUpdateFieldInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            metadata: zOptionMint,
            updateAuthority: wallet.publicKey,
            field,
            value
        })
    );

    // transfer update authority to program PDA
    const transferAuthorityIx = createSetAuthorityInstruction(
        zOptionMint,
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
        initializeMetadataIx_zOption,
        ...updateAdditionalMetaIx_zOPTION,
        transferAuthorityIx
    );

    // sign with wallet and the new collection nft mint keypair
    const sig_zOPTION = await sendAndConfirmTransaction(connection, tx_zOPTION, [wallet, zOptionMintKeypair]);
    logSignature(sig_zOPTION);
    console.log(`   Collection NFT Initialized: ${zOptionMint.toString()}`);
    console.log(`   Collection Authority: ${wallet.publicKey}`);
}
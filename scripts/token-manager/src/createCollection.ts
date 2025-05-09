import { PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram, Keypair } from '@solana/web3.js';
import { connection, wallet, logSignature } from './utils';

// import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner, percentAmount } from '@metaplex-foundation/umi'
import {
  createV1,
  TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata';

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

const umi = createUmi("https://mainnet-beta.solana.com");

export async function createCollection(
    programId: PublicKey
) {
    /// ------------------------------------------------------------------------
    // create parent collection NFT (zOPTION)
    /// ------------------------------------------------------------------------
    console.log('\n1. creating zOption option collection NFT...');
    
    // Derive PDA for program authority
    const [authorityPDA, authorityBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        programId
    );

    const zOptionMintKeypair = Keypair.generate();
    const zOptionMint = zOptionMintKeypair.publicKey;

    // can't await without changing shit, storing this here for upload later
    // const uri = umi.uploader.uploadJson({
    //     updateAuthority: authorityPDA, // Set program PDA as authority
    //     mint: zOptionMint,
    //     name: 'zOption Collection',
    //     symbol: 'zOPTION',
    //     additionalMetadata: [
    //         ['description', 'Collection of options to convert zOption to zOption'],
    //     ]
    // })

    // this sets the collection to being a collection, we need to call VerifyCollectionV1 on initialization
    // to make a call where config pda signs the master nft to verify it
    const mint = generateSigner(umi)
    createV1(umi, {
        mint,
        name: 'zOption Collection',
        symbol: 'zOPTION',
        uri: 'https://example.com/my-collection.json',
        sellerFeeBasisPoints: percentAmount(0),
        tokenStandard: TokenStandard.NonFungible,
        isCollection: true
    }).sendAndConfirm(umi)

    // TODO: transfer authority


    console.log(`   Collection NFT Initialized: ${zOptionMint.toString()}`);
    console.log(`   Collection Authority: ${authorityPDA}`);
}
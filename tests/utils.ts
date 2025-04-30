import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { InvestInSol } from "../target/types/invest_in_sol";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";

// TODO:
// - replace these placeholders with the actual public keys of mints on test network
// - mint authority must be delegated to the config PDA *before* these tests run for deposit/convert to succeed.
export const CN_MINT_ADDRESS = new PublicKey("LdV45HahKVpiVMdTCr6QFU8gK6uUqHRycpuGHkctAsn");
export const PT_MINT_ADDRESS = new PublicKey("CZsQYCTjFcRHXVMibham5W8WKEeuQtTSARQreQ8KQ5ai");
// the below is the same as the PT mint to get around a non-base58 error and progress through the tests until i 
// create collection on devnet
export const COLLECTION_MINT_ADDRESS = new PublicKey("CZsQYCTjFcRHXVMibham5W8WKEeuQtTSARQreQ8KQ5ai");

export const METAPLEX_PID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

/**
 * initializes the protocol if it hasn't been already.
 * assumes the provided mint public keys correspond to existing mints.
 * the initializer keypair must have authority to create the PDAs.
 */
export async function initializeProtocol(
    program: Program<InvestInSol>,
    provider: anchor.AnchorProvider,
    initializer: Keypair, // use Keypair as it needs to sign
    cnMintPk: PublicKey,
    ptMintPk: PublicKey,
    collectionMintPk: PublicKey
): Promise<{ configPda: PublicKey; treasuryPda: PublicKey; }> {
    const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
    const [treasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], program.programId);

    const configInfo = await provider.connection.getAccountInfo(configPda);
    if (configInfo === null) {
        console.log(`initializing protocol (Config: ${configPda.toBase58()})...`);
        await program.methods
            .initialize()
            .accounts({
                initializer: initializer.publicKey,
                cnMint: cnMintPk,
                ptMint: ptMintPk,
                collectionMint: collectionMintPk,
                config: configPda,
                treasury: treasuryPda,
                treasuryVault: treasuryPda,
                systemProgram: SystemProgram.programId,
            })
            .signers([initializer]) // initializer needs to sign
            .rpc({ commitment: "confirmed" });
        console.log("protocol initialized.");
    } else {
         console.log("protocol already initialized.");
    }
    return { configPda, treasuryPda };
}

/**
 * performs a deposit operation.
 * assumes protocol is initialized and mints exist.
 * assumes config PDA has mint authority for PT and Collection mints.
 */
export async function performDeposit(
    program: Program<InvestInSol>,
    provider: AnchorProvider,
    depositor: Keypair, // depositor needs to sign
    configPda: PublicKey,
    treasuryPda: PublicKey,
    cnMint: PublicKey,
    ptMint: PublicKey,
    collectionMint: PublicKey,
    amount: anchor.BN
): Promise<{ nftMint: Keypair; optionDataPda: PublicKey; depositorCnAta: PublicKey; depositorOptionAta: PublicKey; protocolPtAta: PublicKey }> {
    const nftMint = Keypair.generate(); // NFT is unique per deposit. 
    const [optionDataPda] = PublicKey.findProgramAddressSync([Buffer.from("option_data"), nftMint.publicKey.toBuffer()], program.programId);
    const depositorCnAta = await anchor.utils.token.associatedAddress({ mint: cnMint, owner: depositor.publicKey });
    const depositorOptionAta = await anchor.utils.token.associatedAddress({ mint: nftMint.publicKey, owner: depositor.publicKey });
    const protocolPtAta = await anchor.utils.token.associatedAddress({ mint: ptMint, owner: configPda });

    // derive Metaplex PDAs
    const [nftMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), nftMint.publicKey.toBuffer()], METAPLEX_PID);
    const [nftMasterEditionPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), nftMint.publicKey.toBuffer(), Buffer.from("edition")], METAPLEX_PID);
    const [collectionMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), collectionMint.toBuffer()], METAPLEX_PID);
    const [collectionMasterEditionPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), collectionMint.toBuffer(), Buffer.from("edition")], METAPLEX_PID);

    console.log(`performing deposit of ${amount.toString()} lamports...`);
    await program.methods
        .deposit(amount)
        .accounts({
            depositor: depositor.publicKey,
            depositorSolAccount: depositor.publicKey,
            depositorCnAta: depositorCnAta,
            depositorOptionAta: depositorOptionAta,
            nftMint: nftMint.publicKey,
            optionData: optionDataPda,
            config: configPda,
            treasury: treasuryPda,
            treasuryVault: treasuryPda,
            cnMint: cnMint,
            ptMint: ptMint,
            collectionMint: collectionMint,
            collectionMetadata: collectionMetadataPda,
            collectionMasterEdition: collectionMasterEditionPda,
            nftMetadata: nftMetadataPda,
            nftMasterEdition: nftMasterEditionPda,
            protocolPtAta: protocolPtAta,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            metadataProgram: METAPLEX_PID,
            sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([depositor, nftMint]) // depositor and the new NFT mint sign
        .rpc({ commitment: "confirmed" });

    console.log(`deposit complete. NFT Mint: ${nftMint.publicKey.toBase58()}`);
    return { nftMint, optionDataPda, depositorCnAta, depositorOptionAta, protocolPtAta };
}

/**
 * parses AnchorError from transaction error object.
 */
export function parseAnchorError(err: any): anchor.AnchorError | null {
     if (err instanceof anchor.AnchorError) return err;
     // basic parsing attempt from logs (may need refinement)
     const errorLogs = err.logs?.find((log: string) => log.includes("Program log: AnchorError"));
     if (errorLogs) {
         try {
             const parts = errorLogs.split("AnchorError occurred. Error Code: ");
             if (parts.length > 1) {
                 const codeParts = parts[1].split(". Error Number:");
                 const errorCode = { code: codeParts[0], number: parseInt(codeParts[1]?.split(".")[0] || "0") };
                 const errorMessage = err.logs?.find((log: string) => log.includes("Program log: Error Message:"))?.split("Error Message: ")[1];
                 return { error: { errorCode, errorMessage } } as anchor.AnchorError; // cast for assertion usage
             }
         } catch (parseError) { console.error("failed to parse AnchorError from logs:", parseError); }
     }
     return null;
}

/**
 * helper to request and confirm an airdrop.
 */
export async function requestAirdrop(provider: AnchorProvider, publicKey: PublicKey, lamports: number): Promise<void> {
    try {
        console.log(`requesting ${lamports / LAMPORTS_PER_SOL} SOL for ${publicKey.toBase58()}...`);
        const signature = await provider.connection.requestAirdrop(publicKey, lamports);
        const latestBlockhash = await provider.connection.getLatestBlockhash();
        await provider.connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        }, "confirmed");
        console.log(`airdrop confirmed for ${publicKey.toBase58()}.`);
    } catch (error) {
        console.error(`airdrop failed for ${publicKey.toBase58()}:`, error);
        throw error;
    }
}
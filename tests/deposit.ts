import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { InvestInSol } from "../target/types/invest_in_sol";
import { assert, expect } from "chai";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import {
    // Import constants and helpers from utils
    CN_MINT_ADDRESS,
    PT_MINT_ADDRESS,
    COLLECTION_MINT_ADDRESS,
    METAPLEX_PID,
    initializeProtocol,
    parseAnchorError,
    requestAirdrop
} from "./utils";



describe("deposit instruction (with hardcoded mints)", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.InvestInSol as Program<InvestInSol>;
    const initializer = provider.wallet as Wallet; // use provider's wallet as initializer/authority
    const depositor = Keypair.generate(); // create a new depositor for tests


    const cnMint = CN_MINT_ADDRESS;
    const ptMint = PT_MINT_ADDRESS;
    const collectionMint = COLLECTION_MINT_ADDRESS;

    let configPda: PublicKey;
    let treasuryPda: PublicKey;
    let treasuryVaultPda: PublicKey;
    let protocolPtAta: PublicKey; // protocol's ATA for PT

    before(async () => {
        // airdrops
        await requestAirdrop(provider, initializer.publicKey, 2 * LAMPORTS_PER_SOL);
        await requestAirdrop(provider, depositor.publicKey, 2 * LAMPORTS_PER_SOL);

        console.log(`using Initializer: ${initializer.publicKey.toBase58()}`);
        console.log(`using Depositor: ${depositor.publicKey.toBase58()}`);
        console.log(`using CN Mint: ${cnMint.toBase58()}`);
        console.log(`using PT Mint: ${ptMint.toBase58()}`);
        console.log(`using Collection Mint: ${collectionMint.toBase58()}`);

        // initialize protocol using helper (idempotent check inside)
        // important: assumes the hardcoded mints exist and authority is set correctly externally.
        const initResult = await initializeProtocol(program, provider, initializer.payer, cnMint, ptMint, collectionMint);
        configPda = initResult.configPda;
        treasuryPda = initResult.treasuryPda;
        treasuryVaultPda = initResult.treasuryVaultPda;

        // derive protocol's PT ATA address (needs configPda)
        protocolPtAta = await anchor.utils.token.associatedAddress({ mint: ptMint, owner: configPda });
        console.log(`config PDA: ${configPda.toBase58()}`);
        console.log(`treasury PDA: ${treasuryPda.toBase58()}`);
        console.log(`treasury Vault PDA: ${treasuryVaultPda.toBase58()}`);
        console.log(`protocol PT ATA: ${protocolPtAta.toBase58()}`);
    });

    it("allows deposit when protocol is unlocked & verifies state changes", async () => {
        const depositAmount = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL
        const nftMint = Keypair.generate(); // NFT mint is created *during* deposit

        // derive PDAs and ATAs needed for this specific deposit
        const [optionDataPda] = PublicKey.findProgramAddressSync([Buffer.from("option_data"), nftMint.publicKey.toBuffer()], program.programId);
        const depositorCnAta = await anchor.utils.token.associatedAddress({ mint: cnMint, owner: depositor.publicKey });
        const depositorOptionAta = await anchor.utils.token.associatedAddress({ mint: nftMint.publicKey, owner: depositor.publicKey });

        // derive Metaplex PDAs
        const [nftMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), nftMint.publicKey.toBuffer()], METAPLEX_PID);
        const [nftMasterEditionPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), nftMint.publicKey.toBuffer(), Buffer.from("edition")], METAPLEX_PID);
        const [collectionMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), collectionMint.toBuffer()], METAPLEX_PID);
        const [collectionMasterEditionPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), collectionMint.toBuffer(), Buffer.from("edition")], METAPLEX_PID);

        // get initial states
        const initialTreasuryVaultBalance = await provider.connection.getBalance(treasuryVaultPda);
        const initialTreasuryData = await program.account.treasury.fetch(treasuryPda);
        const initialDepositorSol = await provider.connection.getBalance(depositor.publicKey);
        let initialProtocolPtAtaBalance = BigInt(0); // use BigInt(0)
        try {
            const acc = await getAccount(provider.connection, protocolPtAta);
            initialProtocolPtAtaBalance = acc.amount;
        } catch (e) { /* ata doesn't exist yet */ }

        console.log("attempting deposit...");
        // execute deposit
        const txSignature = await program.methods
            .deposit(depositAmount)
            .accounts({
                depositor: depositor.publicKey,
                depositorSolAccount: depositor.publicKey,
                depositorCnAta: depositorCnAta,
                depositorOptionAta: depositorOptionAta,
                nftMint: nftMint.publicKey,
                optionData: optionDataPda,
                config: configPda,
                treasury: treasuryPda,
                treasuryVault: treasuryVaultPda,
                cnMint: cnMint,
                ptMint: ptMint,
                collectionMint: collectionMint,
                collectionMetadata: collectionMetadataPda,
                collectionMasterEdition: collectionMasterEditionPda,
                nftMetadata: nftMetadataPda,
                nftMasterEdition: nftMasterEditionPda,
                protocolPtAta: protocolPtAta,
                tokenProgram: TOKEN_PROGRAM_ID, // using standard SPL Token for now
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                metadataProgram: METAPLEX_PID,
                sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([depositor, nftMint])
            .rpc({ commitment: "confirmed" });

        console.log("deposit successful:", txSignature);

        // --- assertions ---
        console.log("verifying state changes...");

        // 1. SOL transfer
        const finalTreasuryVaultBalance = await provider.connection.getBalance(treasuryVaultPda);
        const finalDepositorSol = await provider.connection.getBalance(depositor.publicKey);
        assert.strictEqual(finalTreasuryVaultBalance, initialTreasuryVaultBalance + depositAmount.toNumber(), "treasury vault balance mismatch");
        expect(finalDepositorSol).to.be.lessThan(initialDepositorSol - depositAmount.toNumber(), "depositor SOL should decrease");

        // 2. CN token mint
        const depositorCnAccount = await getAccount(provider.connection, depositorCnAta);
        assert.strictEqual(depositorCnAccount.amount.toString(), depositAmount.toString(), "depositor CN ATA balance mismatch");

        // 3. PT token mint
        const protocolPtAccount = await getAccount(provider.connection, protocolPtAta);
        assert.strictEqual(protocolPtAccount.amount.toString(), (initialProtocolPtAtaBalance + BigInt(depositAmount.toString())).toString(), "protocol PT ATA balance mismatch");

        // 4. OptionData PDA
        const optionDataAccount = await program.account.optionData.fetch(optionDataPda);
        assert.strictEqual(optionDataAccount.numOfCn.toString(), depositAmount.toString(), "OptionData num_of_cn mismatch");
        assert.isNotNull(optionDataAccount.bump, "OptionData bump not set");

        // 5. treasury state update
        const finalTreasuryData = await program.account.treasury.fetch(treasuryPda);
        assert.strictEqual(finalTreasuryData.totalDepositedSol.toString(), initialTreasuryData.totalDepositedSol.add(depositAmount).toString(), "treasury total_deposited_sol mismatch");

        // 6. NFT mint (basic check)
        const depositorOptionAccount = await getAccount(provider.connection, depositorOptionAta);
        assert.strictEqual(depositorOptionAccount.amount.toString(), "1", "depositor Option ATA should hold 1 NFT");
        assert.ok(depositorOptionAccount.mint.equals(nftMint.publicKey), "option ATA mint mismatch");
        console.log("state changes verified.");
    });

    // --- lock tests (using hardcoded mints and utils) ---

    it("fails deposit when protocol is globally locked", async () => {
        console.log("testing global lock...");
        await program.methods.updateLocks(true, null, null).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc({ commitment: "confirmed" });

        const depositAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
        const nftMint = Keypair.generate();
        // derive accounts...
        const [optionDataPda] = PublicKey.findProgramAddressSync([Buffer.from("option_data"), nftMint.publicKey.toBuffer()], program.programId);
        const depositorCnAta = await anchor.utils.token.associatedAddress({ mint: cnMint, owner: depositor.publicKey });
        const depositorOptionAta = await anchor.utils.token.associatedAddress({ mint: nftMint.publicKey, owner: depositor.publicKey });
        const [nftMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), nftMint.publicKey.toBuffer()], METAPLEX_PID);
        const [nftMasterEditionPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), nftMint.publicKey.toBuffer(), Buffer.from("edition")], METAPLEX_PID);
        const [collectionMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), collectionMint.toBuffer()], METAPLEX_PID);
        const [collectionMasterEditionPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), collectionMint.toBuffer(), Buffer.from("edition")], METAPLEX_PID);

        try {
            await program.methods.deposit(depositAmount).accounts({
                 depositor: depositor.publicKey, depositorSolAccount: depositor.publicKey, depositorCnAta, depositorOptionAta, nftMint: nftMint.publicKey, optionData: optionDataPda, config: configPda, treasury: treasuryPda, treasuryVault: treasuryVaultPda, cnMint, ptMint, collectionMint, collectionMetadata: collectionMetadataPda, collectionMasterEdition: collectionMasterEditionPda, nftMetadata: nftMetadataPda, nftMasterEdition: nftMasterEditionPda, protocolPtAta, tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId, metadataProgram: METAPLEX_PID, sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY, rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            }).signers([depositor, nftMint]).rpc({ commitment: "confirmed" });
            assert.fail("deposit should have failed due to global lock");
        } catch (err) {
            const anchorError = parseAnchorError(err);
            assert.ok(anchorError, "should be an AnchorError (global lock)");
            assert.strictEqual(anchorError.error.errorCode.code, "ProtocolLocked", "error code mismatch (global lock)");
        } finally {
            await program.methods.updateLocks(false, null, null).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc({ commitment: "confirmed" });
            console.log("global lock test finished.");
        }
    });

    it("fails deposit when deposits are locked (but protocol unlocked)", async () => {
        console.log("testing deposit lock...");
        await program.methods.updateLocks(null, true, null).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc({ commitment: "confirmed" });

        const depositAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
        const nftMint = Keypair.generate();
        // derive accounts...
        const [optionDataPda] = PublicKey.findProgramAddressSync([Buffer.from("option_data"), nftMint.publicKey.toBuffer()], program.programId);
        const depositorCnAta = await anchor.utils.token.associatedAddress({ mint: cnMint, owner: depositor.publicKey });
        const depositorOptionAta = await anchor.utils.token.associatedAddress({ mint: nftMint.publicKey, owner: depositor.publicKey });
        const [nftMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), nftMint.publicKey.toBuffer()], METAPLEX_PID);
        const [nftMasterEditionPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), nftMint.publicKey.toBuffer(), Buffer.from("edition")], METAPLEX_PID);
        const [collectionMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), collectionMint.toBuffer()], METAPLEX_PID);
        const [collectionMasterEditionPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), collectionMint.toBuffer(), Buffer.from("edition")], METAPLEX_PID);

        try {
             await program.methods.deposit(depositAmount).accounts({
                 depositor: depositor.publicKey, depositorSolAccount: depositor.publicKey, depositorCnAta, depositorOptionAta, nftMint: nftMint.publicKey, optionData: optionDataPda, config: configPda, treasury: treasuryPda, treasuryVault: treasuryVaultPda, cnMint, ptMint, collectionMint, collectionMetadata: collectionMetadataPda, collectionMasterEdition: collectionMasterEditionPda, nftMetadata: nftMetadataPda, nftMasterEdition: nftMasterEditionPda, protocolPtAta, tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId, metadataProgram: METAPLEX_PID, sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY, rent: anchor.web3.SYSVAR_RENT_PUBKEY,
             }).signers([depositor, nftMint]).rpc({ commitment: "confirmed" });
            assert.fail("deposit should have failed due to deposit lock");
        } catch (err) {
             const anchorError = parseAnchorError(err);
             assert.ok(anchorError, "should be an AnchorError (deposit lock)");
             assert.strictEqual(anchorError.error.errorCode.code, "DepositsLocked", "error code mismatch (deposit lock)");
        } finally {
            await program.methods.updateLocks(null, false, null).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc({ commitment: "confirmed" });
            console.log("deposit lock test finished.");
        }
    });
});

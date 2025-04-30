import * as anchor from "@coral-xyz/anchor";
import { Program, Wallet } from "@coral-xyz/anchor";
import { InvestInSol } from "../target/types/invest_in_sol";
import { assert } from "chai";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
    CN_MINT_ADDRESS,
    PT_MINT_ADDRESS,
    COLLECTION_MINT_ADDRESS,
    initializeProtocol,
    parseAnchorError,
    requestAirdrop,
    METAPLEX_PID,
    performDeposit
} from "./utils";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("admin instructions (with hardcoded mints)", () => {
    // configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.InvestInSol as Program<InvestInSol>;

    const initializer = provider.wallet as Wallet;
    const testUser = Keypair.generate(); // user for deposit/convert tests
    let configPda: PublicKey;
    let treasuryPda: PublicKey; // need for deposit helper

    const cnMint = CN_MINT_ADDRESS;
    const ptMint = PT_MINT_ADDRESS;
    const collectionMint = COLLECTION_MINT_ADDRESS;

    before(async () => {
        // airdrop initializer and test user
        await requestAirdrop(provider, initializer.publicKey, 2 * LAMPORTS_PER_SOL);
        await requestAirdrop(provider, testUser.publicKey, 2 * LAMPORTS_PER_SOL);

        // initialize the protocol using the helper from utils
        // pass initializer.payer as Keypair because it needs to sign
        const initResult = await initializeProtocol(program, provider, initializer.payer, cnMint, ptMint, collectionMint);
        configPda = initResult.configPda;
        treasuryPda = initResult.treasuryPda; // store treasury PDA
        treasuryPda = initResult.treasuryPda; // store vault PDA

        // verify initial state
        const configAccount = await program.account.config.fetch(configPda);
        assert.isFalse(configAccount.locked, "initial global lock should be false");
        assert.isFalse(configAccount.depositLocked, "initial deposit lock should be false");
        assert.isFalse(configAccount.convertLocked, "initial convert lock should be false");
        // assuming initializer is the authority after init for testing purposes
        assert.ok(configAccount.authority.equals(initializer.publicKey), "initializer should be authority");
    });

    it("allows authority to update all locks", async () => {
        console.log("testing update all locks...");
        await program.methods
            .updateLocks(true, true, true) // lock everything
            .accounts({
                authority: initializer.publicKey,
                config: configPda,
            })
            .signers([initializer.payer]) // use payer from wallet
            .rpc({ commitment: "confirmed" });

        const configAccountLocked = await program.account.config.fetch(configPda);
        assert.isTrue(configAccountLocked.locked, "global lock should be true");
        assert.isTrue(configAccountLocked.depositLocked, "deposit lock should be true");
        assert.isTrue(configAccountLocked.convertLocked, "convert lock should be true");

        // unlock everything again
         await program.methods
            .updateLocks(false, false, false)
            .accounts({
                authority: initializer.publicKey,
                config: configPda,
            })
            .signers([initializer.payer])
            .rpc({ commitment: "confirmed" });

        const configAccountUnlocked = await program.account.config.fetch(configPda);
        assert.isFalse(configAccountUnlocked.locked, "global lock should be false after unlock");
        assert.isFalse(configAccountUnlocked.depositLocked, "deposit lock should be false after unlock");
        assert.isFalse(configAccountUnlocked.convertLocked, "convert lock should be false after unlock");
        console.log("update all locks test finished.");
    });

     it("allows authority to update only deposit lock", async () => {
        console.log("testing update deposit lock only...");
        await program.methods
            .updateLocks(null, true, null) // lock only deposit
            .accounts({
                authority: initializer.publicKey,
                config: configPda,
            })
            .signers([initializer.payer])
            .rpc({ commitment: "confirmed" });

        const configAccount = await program.account.config.fetch(configPda);
        assert.isFalse(configAccount.locked, "global lock should remain false");
        assert.isTrue(configAccount.depositLocked, "deposit lock should be true");
        assert.isFalse(configAccount.convertLocked, "convert lock should remain false");

        // reset
        await program.methods.updateLocks(null, false, null).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc({ commitment: "confirmed" });
        console.log("update deposit lock test finished.");
    });

     it("allows authority to update only convert lock", async () => {
        console.log("testing update convert lock only...");
        await program.methods
            .updateLocks(null, null, true) // lock only convert
            .accounts({
                authority: initializer.publicKey,
                config: configPda,
            })
            .signers([initializer.payer])
            .rpc({ commitment: "confirmed" });

        const configAccount = await program.account.config.fetch(configPda);
        assert.isFalse(configAccount.locked, "global lock should remain false");
        assert.isFalse(configAccount.depositLocked, "deposit lock should remain false");
        assert.isTrue(configAccount.convertLocked, "convert lock should be true");

         // reset
        await program.methods.updateLocks(null, null, false).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc({ commitment: "confirmed" });
         console.log("update convert lock test finished.");
    });

     it("allows authority to update only global lock", async () => {
        console.log("testing update global lock only...");
        await program.methods
            .updateLocks(true, null, null) // lock only global
            .accounts({
                authority: initializer.publicKey,
                config: configPda,
            })
            .signers([initializer.payer])
            .rpc({ commitment: "confirmed" });

        const configAccount = await program.account.config.fetch(configPda);
        assert.isTrue(configAccount.locked, "global lock should be true");
        assert.isFalse(configAccount.depositLocked, "deposit lock should remain false");
        assert.isFalse(configAccount.convertLocked, "convert lock should remain false");

         // reset
        await program.methods.updateLocks(false, null, null).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc({ commitment: "confirmed" });
         console.log("update global lock test finished.");
    });


    it("fails if non-authority tries to update locks", async () => {
        console.log("testing non-authority update failure...");
        const nonAuthority = Keypair.generate();
        // airdrop nonAuthority
        await requestAirdrop(provider, nonAuthority.publicKey, 1 * LAMPORTS_PER_SOL);

        try {
            await program.methods
                .updateLocks(true, true, true)
                .accounts({
                    authority: nonAuthority.publicKey, // use wrong authority
                    config: configPda,
                })
                .signers([nonAuthority]) // sign with wrong authority
                .rpc({ commitment: "confirmed" });
            assert.fail("transaction should have failed due to incorrect authority");
        } catch (err) {

            const anchorError = parseAnchorError(err);
            assert.ok(anchorError, "should be an AnchorError (non-authority)");
            // check the specific error code from the AdminError enum
            assert.strictEqual(anchorError.error.errorCode.code, "Unauthorized", "error code mismatch (non-authority)");
            // assert.strictEqual(anchorError.error.errorCode.number, 6000); // adjust number based on AdminError enum if needed
        }

        // verify locks haven't changed
         const configAccount = await program.account.config.fetch(configPda);
         assert.isFalse(configAccount.locked, "global lock should not have changed");
         assert.isFalse(configAccount.depositLocked, "deposit lock should not have changed");
         assert.isFalse(configAccount.convertLocked, "convert lock should not have changed");
         console.log("non-authority update failure test finished.");
    });

    // --- tests for global lock affecting deposit / convert ---

    it("prevents deposit when globally locked", async () => {
        console.log("testing global lock prevents deposit...");
        // ensure unlocked first
        await program.methods.updateLocks(false, false, false).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc();
        // lock globally
        await program.methods.updateLocks(true, null, null).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc();

        const depositAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
        const nftMint = Keypair.generate();
        // derive accounts
        const [optionDataPda] = PublicKey.findProgramAddressSync([Buffer.from("option_data"), nftMint.publicKey.toBuffer()], program.programId);
        const depositorCnAta = await anchor.utils.token.associatedAddress({ mint: cnMint, owner: testUser.publicKey });
        const depositorOptionAta = await anchor.utils.token.associatedAddress({ mint: nftMint.publicKey, owner: testUser.publicKey });
        const protocolPtAta = await anchor.utils.token.associatedAddress({ mint: ptMint, owner: configPda });
        const [nftMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), nftMint.publicKey.toBuffer()], METAPLEX_PID);
        const [nftMasterEditionPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), nftMint.publicKey.toBuffer(), Buffer.from("edition")], METAPLEX_PID);
        const [collectionMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), collectionMint.toBuffer()], METAPLEX_PID);
        const [collectionMasterEditionPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), collectionMint.toBuffer(), Buffer.from("edition")], METAPLEX_PID);

        try {
            await program.methods.deposit(depositAmount).accounts({
                 depositor: testUser.publicKey, depositorSolAccount: testUser.publicKey, depositorCnAta, depositorOptionAta, nftMint: nftMint.publicKey, optionData: optionDataPda, config: configPda, treasury: treasuryPda, treasuryVault: treasuryPda, cnMint, ptMint, collectionMint, collectionMetadata: collectionMetadataPda, collectionMasterEdition: collectionMasterEditionPda, nftMetadata: nftMetadataPda, nftMasterEdition: nftMasterEditionPda, protocolPtAta, tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: anchor.web3.SystemProgram.programId, metadataProgram: METAPLEX_PID, sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY, rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            }).signers([testUser, nftMint]).rpc({ commitment: "confirmed" });
            assert.fail("deposit should have failed due to global lock set by admin");
        } catch (err) {
            const anchorError = parseAnchorError(err);
            assert.ok(anchorError, "should be an AnchorError (global lock on deposit)");
            // deposit instruction checks global lock first
            assert.strictEqual(anchorError.error.errorCode.code, "ProtocolLocked", "error code mismatch (global lock on deposit)");
        } finally {
            // unlock globally for subsequent tests
            await program.methods.updateLocks(false, null, null).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc({ commitment: "confirmed" });
            console.log("global lock deposit prevention test finished.");
        }
    });

    it("prevents convert when globally locked", async () => {
        console.log("testing global lock prevents convert...");
        // ensure unlocked first & perform a deposit to get something to convert
        await program.methods.updateLocks(false, false, false).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc();
        const depositAmount = new anchor.BN(0.2 * LAMPORTS_PER_SOL);
        const depositInfo = await performDeposit(program, provider, testUser, configPda, treasuryPda, cnMint, ptMint, collectionMint, depositAmount);

        // lock globally
        await program.methods.updateLocks(true, null, null).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc();

        const converterPtAta = await anchor.utils.token.associatedAddress({ mint: ptMint, owner: testUser.publicKey });
        // derive Metaplex PDAs
        const [nftMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), depositInfo.nftMint.publicKey.toBuffer()], METAPLEX_PID);
        const [nftMasterEditionPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), depositInfo.nftMint.publicKey.toBuffer(), Buffer.from("edition")], METAPLEX_PID);
        const [collectionMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), collectionMint.toBuffer()], METAPLEX_PID);

        try {
            await program.methods.convert().accounts({
                converter: testUser.publicKey, converterCnAta: depositInfo.depositorCnAta, converterOptionAta: depositInfo.depositorOptionAta, converterPtAta, config: configPda, protocolPtAta: depositInfo.protocolPtAta, cnMint, ptMint, nftMint: depositInfo.nftMint.publicKey, optionData: depositInfo.optionDataPda, nftMetadata: nftMetadataPda, nftMasterEdition: nftMasterEditionPda, collectionMetadata: collectionMetadataPda, tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: anchor.web3.SystemProgram.programId, metadataProgram: METAPLEX_PID, sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY, rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            }).signers([testUser]).rpc({ commitment: "confirmed" });
            assert.fail("convert should have failed due to global lock set by admin");
        } catch (err) {
            const anchorError = parseAnchorError(err);
            assert.ok(anchorError, "should be an AnchorError (global lock on convert)");
             // convert instruction checks global lock first
            assert.strictEqual(anchorError.error.errorCode.code, "ProtocolLocked", "error code mismatch (global lock on convert)");
        } finally {
             // unlock globally
            await program.methods.updateLocks(false, null, null).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc({ commitment: "confirmed" });
            console.log("global lock convert prevention test finished.");
        }
    });

});
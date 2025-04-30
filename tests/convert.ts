import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { InvestInSol } from "../target/types/invest_in_sol";
import { assert, expect } from "chai";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import {
    CN_MINT_ADDRESS,
    PT_MINT_ADDRESS,
    COLLECTION_MINT_ADDRESS,
    METAPLEX_PID,
    initializeProtocol,
    performDeposit,
    parseAnchorError,
    requestAirdrop
} from "./utils";

describe("convert instruction (with hardcoded mints)", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.InvestInSol as Program<InvestInSol>;
    const initializer = provider.wallet as Wallet; // use provider's wallet as initializer/authority
    const converter = Keypair.generate(); // create a new converter/depositor for tests


    const cnMint = CN_MINT_ADDRESS;
    const ptMint = PT_MINT_ADDRESS;
    const collectionMint = COLLECTION_MINT_ADDRESS;

    let configPda: PublicKey;
    let treasuryPda: PublicKey;

    // variables to store results from deposit setup
    let depositResult: {
        nftMint: Keypair;
        optionDataPda: PublicKey;
        depositorCnAta: PublicKey;
        depositorOptionAta: PublicKey;
        protocolPtAta: PublicKey;
    };
    const depositAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL); // 0.5 SOL

    before(async () => {
        await requestAirdrop(provider, initializer.publicKey, 2 * LAMPORTS_PER_SOL);
        await requestAirdrop(provider, converter.publicKey, 2 * LAMPORTS_PER_SOL);

        // initialize the protocol using helper (idempotent check inside)
        const initResult = await initializeProtocol(program, provider, initializer.payer, cnMint, ptMint, collectionMint);
        configPda = initResult.configPda;
        treasuryPda = initResult.treasuryPda;
        treasuryPda = initResult.treasuryPda; // store vault address

        // perform a deposit using helper to set up for conversion tests
        depositResult = await performDeposit(
            program,
            provider,
            converter, // use the converter keypair as the depositor
            configPda,
            treasuryPda,
            cnMint,
            ptMint,
            collectionMint,
            depositAmount
        );
    });

    it("allows conversion when protocol is unlocked & verifies state changes", async () => {
        // derive user's PT ATA
        const converterPtAta = await anchor.utils.token.associatedAddress({ mint: ptMint, owner: converter.publicKey });

        // derive Metaplex PDAs for the specific NFT being converted
        const [nftMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), depositResult.nftMint.publicKey.toBuffer()], METAPLEX_PID);
        const [nftMasterEditionPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), depositResult.nftMint.publicKey.toBuffer(), Buffer.from("edition")], METAPLEX_PID);
        const [collectionMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), collectionMint.toBuffer()], METAPLEX_PID);

        // get initial balances
        let initialPtBalance = BigInt(0);
        try {
            const acc = await getAccount(provider.connection, converterPtAta);
            initialPtBalance = acc.amount;
        } catch (e) { /* ata doesn't exist yet */ }

        const initialCnAccount = await getAccount(provider.connection, depositResult.depositorCnAta);
        const initialCnBalance = initialCnAccount.amount;
        // fetching initial option account state (sanity check before conversion)
        // const initialOptionAccount = await getAccount(provider.connection, depositResult.depositorOptionAta);

        // not strictly needed for assertions below, which check the *final* state (closed or zero balance).
        const initialProtocolPtAccount = await getAccount(provider.connection, depositResult.protocolPtAta);

        console.log("attempting conversion...");
        // execute conversion
        const txSignature = await program.methods
            .convert()
            .accounts({
                converter: converter.publicKey,
                converterCnAta: depositResult.depositorCnAta,
                converterOptionAta: depositResult.depositorOptionAta,
                converterPtAta: converterPtAta,
                config: configPda,
                protocolPtAta: depositResult.protocolPtAta,
                cnMint: cnMint,
                ptMint: ptMint,
                nftMint: depositResult.nftMint.publicKey,
                optionData: depositResult.optionDataPda,
                nftMetadata: nftMetadataPda,
                nftMasterEdition: nftMasterEditionPda,
                collectionMetadata: collectionMetadataPda,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                metadataProgram: METAPLEX_PID,
                sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([converter]) // only the converter needs to sign
            .rpc({ commitment: "confirmed" });

        console.log("conversion successful:", txSignature);

        // --- assertions ---
        console.log("verifying state changes after conversion...");

        // 1. PT token transfer
        const finalPtAccount = await getAccount(provider.connection, converterPtAta);
        const expectedPtBalance = initialPtBalance + BigInt(depositAmount.toString());
        assert.strictEqual(finalPtAccount.amount.toString(), expectedPtBalance.toString(), "converter PT balance mismatch");

        // 2. CN token burn
        const finalCnAccount = await getAccount(provider.connection, depositResult.depositorCnAta);
        const expectedCnBalance = initialCnBalance - BigInt(depositAmount.toString());
        assert.strictEqual(finalCnAccount.amount.toString(), expectedCnBalance.toString(), "converter CN balance mismatch");

        // 3. OptionData account closure
        const optionDataInfo = await provider.connection.getAccountInfo(depositResult.optionDataPda);
        assert.isNull(optionDataInfo, "OptionData account should be closed");

        // 4. NFT burn (check token account balance is zero or closed)
        try {
            const finalOptionAccount = await getAccount(provider.connection, depositResult.depositorOptionAta);
            assert.strictEqual(finalOptionAccount.amount.toString(), "0", "depositor Option ATA should have 0 tokens after burn");
        } catch (error) {
            expect(error.message).to.include("could not find account");
        }

        // 5. protocol PT ATA balance check
        const finalProtocolPtAccount = await getAccount(provider.connection, depositResult.protocolPtAta);
        const expectedProtocolPtBalance = initialProtocolPtAccount.amount - BigInt(depositAmount.toString());
        assert.strictEqual(finalProtocolPtAccount.amount.toString(), expectedProtocolPtBalance.toString(), "protocol PT ATA balance mismatch after transfer");

        console.log("state changes verified.");
    });

    // --- lock tests (using hardcoded mints and utils) ---

    it("fails conversion when protocol is globally locked", async () => {
        console.log("testing global lock for conversion...");
        // need to deposit again to have something to convert
        const depositResultLocked = await performDeposit(program, provider, converter, configPda, treasuryPda, cnMint, ptMint, collectionMint, depositAmount);

        // lock the protocol
        await program.methods.updateLocks(true, null, null).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc({ commitment: "confirmed" });

        const converterPtAta = await anchor.utils.token.associatedAddress({ mint: ptMint, owner: converter.publicKey });
        // derive Metaplex PDAs
        const [nftMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), depositResultLocked.nftMint.publicKey.toBuffer()], METAPLEX_PID);
        const [nftMasterEditionPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), depositResultLocked.nftMint.publicKey.toBuffer(), Buffer.from("edition")], METAPLEX_PID);
        const [collectionMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), collectionMint.toBuffer()], METAPLEX_PID);

        try {
            await program.methods.convert().accounts({
                converter: converter.publicKey, converterCnAta: depositResultLocked.depositorCnAta, converterOptionAta: depositResultLocked.depositorOptionAta, converterPtAta, config: configPda, protocolPtAta: depositResultLocked.protocolPtAta, cnMint, ptMint, nftMint: depositResultLocked.nftMint.publicKey, optionData: depositResultLocked.optionDataPda, nftMetadata: nftMetadataPda, nftMasterEdition: nftMasterEditionPda, collectionMetadata: collectionMetadataPda, tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId, metadataProgram: METAPLEX_PID, sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY, rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            }).signers([converter]).rpc({ commitment: "confirmed" });
            assert.fail("convert should have failed due to global lock");
        } catch (err) {
            const anchorError = parseAnchorError(err);
            assert.ok(anchorError, "should be an AnchorError (global lock)");
            assert.strictEqual(anchorError.error.errorCode.code, "ProtocolLocked", "error code mismatch (global lock)");
        } finally {
            await program.methods.updateLocks(false, null, null).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc({ commitment: "confirmed" });
            console.log("global lock test finished.");
        }
    });

    it("fails conversion when conversions are locked (but protocol unlocked)", async () => {
        console.log("testing convert lock...");
        // need to deposit again
        const depositResultLocked = await performDeposit(program, provider, converter, configPda, treasuryPda, cnMint, ptMint, collectionMint, depositAmount);

        // lock conversions specifically
        await program.methods.updateLocks(null, null, true).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc({ commitment: "confirmed" });

        const converterPtAta = await anchor.utils.token.associatedAddress({ mint: ptMint, owner: converter.publicKey });
        // derive Metaplex PDAs...
        const [nftMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), depositResultLocked.nftMint.publicKey.toBuffer()], METAPLEX_PID);
        const [nftMasterEditionPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), depositResultLocked.nftMint.publicKey.toBuffer(), Buffer.from("edition")], METAPLEX_PID);
        const [collectionMetadataPda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX_PID.toBuffer(), collectionMint.toBuffer()], METAPLEX_PID);

        try {
             await program.methods.convert().accounts({
                 converter: converter.publicKey, converterCnAta: depositResultLocked.depositorCnAta, converterOptionAta: depositResultLocked.depositorOptionAta, converterPtAta, config: configPda, protocolPtAta: depositResultLocked.protocolPtAta, cnMint, ptMint, nftMint: depositResultLocked.nftMint.publicKey, optionData: depositResultLocked.optionDataPda, nftMetadata: nftMetadataPda, nftMasterEdition: nftMasterEditionPda, collectionMetadata: collectionMetadataPda, tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId, metadataProgram: METAPLEX_PID, sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY, rent: anchor.web3.SYSVAR_RENT_PUBKEY,
             }).signers([converter]).rpc({ commitment: "confirmed" });
            assert.fail("convert should have failed due to convert lock");
        } catch (err) {
             const anchorError = parseAnchorError(err);
             assert.ok(anchorError, "should be an AnchorError (convert lock)");
             assert.strictEqual(anchorError.error.errorCode.code, "ConversionsLocked", "error code mismatch (convert lock)");
        } finally {
            await program.methods.updateLocks(null, null, false).accounts({ authority: initializer.publicKey, config: configPda }).signers([initializer.payer]).rpc({ commitment: "confirmed" });
            console.log("convert lock test finished.");
        }
    });
});
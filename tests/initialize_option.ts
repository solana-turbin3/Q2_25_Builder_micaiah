import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { InvestInSol } from "../target/types/invest_in_sol";
import { assert, expect } from "chai";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAccount, Mint, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";

import {
    CN_MINT_ADDRESS,
    PT_MINT_ADDRESS,
    COLLECTION_MINT_ADDRESS,
    initializeProtocol,
    requestAirdrop,
    findMetadataPda,
    findMasterEditionPda,
    TOKEN_METADATA_PROGRAM_ID
} from "./utils";

describe("initialize_option instruction", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.InvestInSol as Program<InvestInSol>;
    const initializer = provider.wallet as Wallet; // use provider's wallet as initializer/authority
    const user = Keypair.generate(); // user who will receive the option

    const cnMint = CN_MINT_ADDRESS;
    const ptMint = PT_MINT_ADDRESS;
    const collectionMint = COLLECTION_MINT_ADDRESS;
    const optionDurationSeconds = 60 * 60 * 24 * 7; // 7 days

    let configPda: PublicKey;
    let treasuryPda: PublicKey;

    before(async () => {
        // airdrops
        await requestAirdrop(provider, initializer.publicKey, 2 * LAMPORTS_PER_SOL);
        await requestAirdrop(provider, user.publicKey, 2 * LAMPORTS_PER_SOL);

        console.log(`using Initializer: ${initializer.publicKey.toBase58()}`);
        console.log(`using User: ${user.publicKey.toBase58()}`);

        // initialize protocol
        const initResult = await initializeProtocol(program, provider, initializer.payer, cnMint, ptMint, collectionMint, optionDurationSeconds);
        configPda = initResult.configPda;
        treasuryPda = initResult.treasuryPda;

        console.log(`config PDA: ${configPda.toBase58()}`);
        console.log(`treasury PDA: ${treasuryPda.toBase58()}`);
    });

    it("initializes an option NFT, metadata, master edition, and OptionData PDA", async () => {
        const optionMint = Keypair.generate(); // the mint for this specific option NFT
        const depositAmount = new anchor.BN(5 * LAMPORTS_PER_SOL); // example amount associated with this option

        // derive necessary accounts
        const userOptionAta = await anchor.utils.token.associatedAddress({ mint: optionMint.publicKey, owner: user.publicKey });
        const metadataPda = findMetadataPda(optionMint.publicKey);
        const masterEditionPda = findMasterEditionPda(optionMint.publicKey);
        const [optionDataPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("option_data"), optionMint.publicKey.toBuffer()],
            program.programId
        );

        console.log("attempting initialize_option...");
        const txSignature = await program.methods
            .initializeOption(depositAmount)
            .accounts({
                payer: user.publicKey, // user pays for initialization
                config: configPda,
                optionMint: optionMint.publicKey,
                userOptionAta: userOptionAta,
                metadataAccount: metadataPda,
                masterEditionAccount: masterEditionPda,
                optionData: optionDataPda,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            })
            .signers([user, optionMint]) // user and the new mint keypair need to sign
            .rpc({ commitment: "confirmed" });

        console.log("initialize_option successful:", txSignature);

        // --- assertions ---
        console.log("verifying state changes...");

        // 1. option NFT minted to user ATA
        const userOptionAccount = await getAccount(provider.connection, userOptionAta);
        assert.strictEqual(userOptionAccount.amount.toString(), "1", "user Option ATA should hold 1 NFT");
        assert.ok(userOptionAccount.mint.equals(optionMint.publicKey), "option ATA mint mismatch");

        // 2. metadata account created
        const metadataAccountInfo = await provider.connection.getAccountInfo(metadataPda);
        assert.ok(metadataAccountInfo, "metadata account should exist");
        // todo: deserialize and check metadata content (name, symbol, uri, creators, etc.) if needed

        // 3. master edition account created
        const masterEditionAccountInfo = await provider.connection.getAccountInfo(masterEditionPda);
        assert.ok(masterEditionAccountInfo, "master edition account should exist");
        // todo: deserialize and check master edition content (supply, maxSupply) if needed

        // 4. OptionData PDA created and initialized
        const optionDataAccount = await program.account.optionData.fetch(optionDataPda);
        assert.ok(optionDataAccount.mint.equals(optionMint.publicKey), "OptionData mint mismatch");
        assert.ok(optionDataAccount.owner.equals(user.publicKey), "OptionData owner mismatch");
        assert.strictEqual(optionDataAccount.amount.toString(), depositAmount.toString(), "OptionData amount mismatch");
        assert.ok(optionDataAccount.expiration.toNumber() > 0, "OptionData expiration should be set");
        // check expiration is roughly correct (within a tolerance for clock skew/tx time)
        const currentTime = Math.floor(Date.now() / 1000);
        const expectedExpiration = currentTime + optionDurationSeconds;
        expect(optionDataAccount.expiration.toNumber()).to.be.closeTo(expectedExpiration, 60); // allow 60s tolerance
        assert.isNotNull(optionDataAccount.bump, "OptionData bump not set");

        // TODO: check if config option count incremented, potentially swap the count
        // to be `amount` outstanding.

        console.log("state changes verified.");
    });

    // todo: add tests for failure cases (e.g., incorrect authority, address mismatch)
});
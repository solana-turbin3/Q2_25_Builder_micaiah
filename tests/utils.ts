import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { InvestInSol } from "../target/types/invest_in_sol";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  TOKEN_2022_PROGRAM_ID,
  getMint,
  createSetAuthorityInstruction,
  AuthorityType,
} from "@solana/spl-token";
import { MPL_TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";

export const CN_MINT_ADDRESS = new PublicKey(
  "LdV45HahKVpiVMdTCr6QFU8gK6uUqHRycpuGHkctAsn"
);
export const PT_MINT_ADDRESS = new PublicKey(
  "CZsQYCTjFcRHXVMibham5W8WKEeuQtTSARQreQ8KQ5ai"
);
// NOTE: the below is the same as the PT mint to get around a non-base58 error and progress through the tests until i create collection on devnet
export const COLLECTION_MINT_ADDRESS = new PublicKey(
  "CZsQYCTjFcRHXVMibham5W8WKEeuQtTSARQreQ8KQ5ai"
);

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  MPL_TOKEN_METADATA_PROGRAM_ID
); // ensure it's a PublicKey object

/**
 * finds the metadata PDA for a given mint.
 */
export function findMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  return pda;
}

/**
 * finds the master edition PDA for a given mint.
 */
export function findMasterEditionPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  return pda;
}

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
  collectionMintPk: PublicKey,
  optionDurationSeconds: number
): Promise<{ configPda: PublicKey; treasuryPda: PublicKey }> {
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );
  const [treasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    program.programId
  );

  const configInfo = await provider.connection.getAccountInfo(configPda);

  if (configInfo === null) {
    // make sure our config is the authority for the mints
    let cnMintAccount = await getMint(
      provider.connection,
      cnMintPk,
      "confirmed",
      TOKEN_PROGRAM_ID
    );
    if (cnMintAccount.mintAuthority.toBase58() !== configPda.toBase58()) {
      const tx = new Transaction().add(
        createSetAuthorityInstruction(
          cnMintPk,
          initializer.publicKey,
          AuthorityType.MintTokens,
          configPda,
          [],
          TOKEN_PROGRAM_ID
        )
      );
      const sig = await provider.connection.sendTransaction(tx, [initializer], {
        skipPreflight: true,
      });
      await confirmTransaction(provider, sig);
    }

    let ptMintAccount = await getMint(
      provider.connection,
      ptMintPk,
      "confirmed",
      TOKEN_PROGRAM_ID
    );
    if (ptMintAccount.mintAuthority.toBase58() !== configPda.toBase58()) {
      const tx = new Transaction().add(
        createSetAuthorityInstruction(
          ptMintPk,
          initializer.publicKey,
          AuthorityType.MintTokens,
          configPda,
          [],
          TOKEN_PROGRAM_ID
        )
      );
      const sig = await provider.connection.sendTransaction(tx, [initializer]);
      await confirmTransaction(provider, sig);
    }

    let collectionMintAccount = await getMint(
      provider.connection,
      collectionMintPk,
      "confirmed",
      TOKEN_PROGRAM_ID
    );
    if (
      collectionMintAccount.mintAuthority.toBase58() !== configPda.toBase58()
    ) {
      const tx = new Transaction().add(
        createSetAuthorityInstruction(
          collectionMintPk,
          initializer.publicKey,
          AuthorityType.MintTokens,
          configPda,
          [],
          TOKEN_PROGRAM_ID
        )
      );
      const sig = await provider.connection.sendTransaction(tx, [initializer]);
      await confirmTransaction(provider, sig);
    }

    console.log(`initializing protocol (Config: ${configPda.toBase58()})...`);
    const tx = await program.methods
      .initialize(optionDurationSeconds)
      .accountsStrict({
        initializer: initializer.publicKey,
        cnMint: cnMintPk,
        ptMint: ptMintPk,
        collectionMint: collectionMintPk,
        config: configPda,
        treasury: treasuryPda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();
    await sendAndConfirmTransaction(provider, tx, initializer.publicKey, [
      initializer,
    ]);
  } else {
    console.log("protocol already initialized.");
  }
  return { configPda, treasuryPda };
}

/**
 * parses AnchorError from transaction error object.
 */
export function parseAnchorError(err: any): anchor.AnchorError | null {
  if (err instanceof anchor.AnchorError) return err;
  // basic parsing attempt from logs (may need refinement)
  const logs = err.transactionMessage?.split("\n") || err.logs || null;
  const errorLogs = logs?.find((log: string) =>
    log.includes("Program log: AnchorError")
  );

  if (errorLogs) {
    try {
      const parts = errorLogs.split(". Error Code: ");
      const codeParts = parts[1]?.split(". Error Number: ") || [];
      const errorCode = {
        code: codeParts[0],
        number: parseInt(codeParts[1]?.split(".")[0] || "0"),
      };
      const errorMessage = err.logs
        ?.find((log: string) => log.includes("Program log: Error Message:"))
        ?.split("Error Message: ")[1];
      return { error: { errorCode, errorMessage } } as anchor.AnchorError; // cast for assertion usage
    } catch (parseError) {
      console.error("failed to parse AnchorError from logs:", parseError);
    }
  }
  return null;
}

export async function sendAndConfirmTransaction(
  provider: anchor.AnchorProvider,
  transaction: anchor.web3.Transaction,
  payer: PublicKey,
  signers: Array<anchor.web3.Signer>,
  options?: anchor.web3.ConfirmOptions
) {
  transaction.recentBlockhash = (
    await provider.connection.getLatestBlockhash()
  ).blockhash;
  transaction.feePayer = payer;
  for (const signer of signers) {
    transaction.partialSign(signer);
  }
  const sig = await provider.connection.sendRawTransaction(
    await transaction.serialize(),
    options
  );
  await confirmTransaction(provider, sig);
}

/**
 * Helper to wait for a transaction to be confirmed. Used to avoid pinging surfpool over websockets.
 */
export async function confirmTransaction(
  provider: anchor.AnchorProvider,
  signature: string
) {
  let confirmed = false;
  while (confirmed == false) {
    let status = await provider.connection.getSignatureStatus(signature);
    if (status.value.err) {
      throw new Error(
        `Transaction failed: ${signature}, error: ${JSON.stringify(
          status.value.err
        )}`
      );
    }
    if (
      status.value.confirmationStatus == "confirmed" ||
      status.value.confirmationStatus == "finalized"
    ) {
      confirmed = true;
    }
  }
}

/**
 * helper to request and confirm an airdrop.
 */
export async function requestAirdrop(
  provider: AnchorProvider,
  publicKey: PublicKey,
  lamports: number
): Promise<void> {
  try {
    console.log(
      `requesting ${
        lamports / LAMPORTS_PER_SOL
      } SOL for ${publicKey.toBase58()}...`
    );
    const signature = await provider.connection.requestAirdrop(
      publicKey,
      lamports
    );
    confirmTransaction(provider, signature);
    console.log(`airdrop confirmed for ${publicKey.toBase58()}.`);
  } catch (error) {
    console.error(`airdrop failed for ${publicKey.toBase58()}:`, error);
  }
}

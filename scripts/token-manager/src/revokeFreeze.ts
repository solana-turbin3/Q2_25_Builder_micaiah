import { PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createSetAuthorityInstruction, AuthorityType, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { connection, wallet, logSignature, isValidPublicKey } from './utils';

export async function revokeFreezeAuthority(mintAddresses: string[]) {
  console.log('Starting revoke freeze authority process...');
  console.log(`Using wallet: ${wallet.publicKey.toString()}`);

  if (!mintAddresses || mintAddresses.length === 0) {
    console.error('Error: No mint addresses provided.');
    return;
  }

  const instructions = [];
  for (const mintAddress of mintAddresses) {
    if (!isValidPublicKey(mintAddress)) {
        console.warn(`Skipping invalid mint address: ${mintAddress}`);
        continue;
    }
    const mintPublicKey = new PublicKey(mintAddress);
    console.log(`   Preparing to revoke freeze authority for mint: ${mintAddress}`);

    instructions.push(
      createSetAuthorityInstruction(
        mintPublicKey,          // Mint account
        wallet.publicKey,       // Current authority (freeze authority)
        AuthorityType.FreezeAccount, // Authority type to change
        null,                   // New authority (null to revoke)
        [],                     // Signers (current authority)
        TOKEN_2022_PROGRAM_ID   // Token program ID
      )
    );
  }

  if (instructions.length === 0) {
      console.log("No valid mint addresses found to process.");
      return;
  }

  const transaction = new Transaction().add(...instructions);

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    logSignature(signature);
    console.log(`Freeze authority successfully revoked for ${instructions.length} mint(s).`);
  } catch (error) {
    console.error(`Error revoking freeze authority:`, error);
    // Potentially log which mints failed if possible from the error
  }
}
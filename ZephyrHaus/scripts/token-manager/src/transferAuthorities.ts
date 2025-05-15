import { PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createSetAuthorityInstruction, AuthorityType, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { connection, wallet, logSignature, isValidPublicKey } from './utils';

export async function transferAuthorities(newAuthorityStr: string, mintAddresses: string[]) {
  console.log('Starting transfer authorities process...');
  console.log(`Using wallet: ${wallet.publicKey.toString()}`);
  console.log(`New Authority Target: ${newAuthorityStr}`);

  if (!isValidPublicKey(newAuthorityStr)) {
      console.error(`Error: Invalid new authority public key provided: ${newAuthorityStr}`);
      return;
  }
  const newAuthority = new PublicKey(newAuthorityStr);

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
    console.log(`   Preparing to transfer mint authority for mint: ${mintAddress}`);

    // Transfer Mint Authority
    instructions.push(
      createSetAuthorityInstruction(
        mintPublicKey,          // Mint account
        wallet.publicKey,       // Current authority (mint authority)
        AuthorityType.MintTokens, // Authority type to change
        newAuthority,           // New authority
        [],                     // Signers (current authority)
        TOKEN_2022_PROGRAM_ID   // Token program ID
      )
    );

    // Note: Transferring metadata update authority requires a different instruction
    // targeting the metadata account itself, using the spl-token-metadata program.
    // This is more complex and requires knowing the metadata account address.
    // We are only transferring MINT authority here.
  }

   if (instructions.length === 0) {
      console.log("No valid mint addresses found to process.");
      return;
  }

  const transaction = new Transaction().add(...instructions);

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    logSignature(signature);
    console.log(`Mint authority successfully transferred for ${instructions.length} mint(s) to ${newAuthorityStr}.`);
  } catch (error) {
    console.error(`Error transferring authorities:`, error);
  }
}
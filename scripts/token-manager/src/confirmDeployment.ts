import { PublicKey } from '@solana/web3.js';
import { getMint, getMetadataPointerState, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { unpack } from '@solana/spl-token-metadata'; // Import unpack from correct package
import { connection, isValidPublicKey } from './utils';

// Helper to safely get metadata address from a parsed Mint object
function getMetadataAddressFromMint(mintInfo: any): PublicKey | null {
    try {
        // The getMint function should return an object with extensions if TOKEN_2022_PROGRAM_ID is used
        const metadataPointer = getMetadataPointerState(mintInfo);
        return metadataPointer?.metadataAddress || null;
    } catch (error) {
        console.warn(`   Warning: Could not get metadata pointer state from mint info:`, error);
        return null;
    }
}

export async function confirmDeployment(mintAddresses: string[]) {
  console.log('Starting deployment confirmation process...');

  if (!mintAddresses || mintAddresses.length !== 3) {
    console.error('Error: Please provide exactly three mint addresses (zHAUS, zBOND, zOPTION).');
    return;
  }

  for (const mintAddress of mintAddresses) {
    if (!isValidPublicKey(mintAddress)) {
        console.warn(`\nSkipping invalid mint address: ${mintAddress}`);
        continue;
    }
    const mintPublicKey = new PublicKey(mintAddress);
    console.log(`\n--- Details for Mint: ${mintAddress} ---`);

    try {
      // 1. Fetch Mint Info
      const mintInfo = await getMint(connection, mintPublicKey, 'confirmed', TOKEN_2022_PROGRAM_ID);
      console.log(`   Supply: ${mintInfo.supply.toString()}`);
      console.log(`   Decimals: ${mintInfo.decimals}`);
      console.log(`   Mint Authority: ${mintInfo.mintAuthority?.toString() || 'None'}`);
      console.log(`   Freeze Authority: ${mintInfo.freezeAuthority?.toString() || 'None'}`);

      // 2. Get Metadata Info using the parsed mintInfo
      const metadataAddress = getMetadataAddressFromMint(mintInfo);
      if (metadataAddress) {
        console.log(`   Metadata Account: ${metadataAddress.toString()}`);
        const metadataAccountInfo = await connection.getAccountInfo(metadataAddress, 'confirmed');
        if (metadataAccountInfo) {
          const metadata = unpack(metadataAccountInfo.data);
          console.log(`   Metadata Update Authority: ${metadata.updateAuthority?.toString() || 'None'}`);
          console.log(`   Metadata Name: ${metadata.name}`);
          console.log(`   Metadata Symbol: ${metadata.symbol}`);
          console.log(`   Metadata URI: ${metadata.uri}`);
          console.log(`   Additional Metadata:`);
          metadata.additionalMetadata.forEach(([key, value]) => {
            console.log(`     - ${key}: ${value}`);
          });
        } else {
          console.log(`   Warning: Metadata account ${metadataAddress.toString()} not found.`);
        }
      } else {
        console.log(`   Metadata Pointer: Not set or could not be fetched.`);
      }

    } catch (error) {
      console.error(`   Error fetching details for mint ${mintAddress}:`, error);
    }
  }
   console.log('\nConfirmation process finished.');
}
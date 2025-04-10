
import wallet from "/Users/micaiahreid/.config/solana/id.json";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { 
    createMetadataAccountV3, 
    CreateMetadataAccountV3InstructionAccounts, 
    CreateMetadataAccountV3InstructionArgs,
    DataV2Args,
    updateMetadataAccountV2,
    UpdateMetadataAccountV2InstructionAccounts,
    UpdateMetadataAccountV2InstructionArgs
} from "@metaplex-foundation/mpl-token-metadata";
import { createSignerFromKeypair, signerIdentity, publicKey } from "@metaplex-foundation/umi";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { PublicKey } from "@solana/web3.js";

// Define our Mint address
const mint = publicKey("A1xMjCgjTkM1TwbGSHHxJecVoLQ3UNyDa84cXCKuGn3w")

// Create a UMI connection
const umi = createUmi('https://turbine-solanad-4cde.devnet.rpcpool.com/168dd64f-ce5e-4e19-a836-f6482ad6b396');
const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(createSignerFromKeypair(umi, keypair)));

(async () => {
    try {
        let accounts: CreateMetadataAccountV3InstructionAccounts = {
            // metadata: 
            mint,
            payer: signer,
            mintAuthority: signer,
        }

        let data: DataV2Args = {
            name: "micaiah",
            symbol: "MIC",
            uri: "https://micaiah.dev",
            sellerFeeBasisPoints: 500,
            creators: null,
            collection: null,
            uses: null,
        };

        let args: CreateMetadataAccountV3InstructionArgs = {
            data,
            isMutable: true,
            collectionDetails: null,
        }

        // let tx = createMetadataAccountV3(
        //     umi,
        //     {
        //         ...accounts,
        //         ...args
        //     }
        // )

        const metadataProgram = new PublicKey(
            "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
          );
        let metadataPda = PublicKey.findProgramAddressSync(
            [Buffer.from("metadata"), metadataProgram.toBuffer(), new PublicKey("A1xMjCgjTkM1TwbGSHHxJecVoLQ3UNyDa84cXCKuGn3w").toBuffer()],
            metadataProgram,
          )[0];
          console.log("Metadata PDA: ", metadataPda.toBase58());

        let updateAccounts: UpdateMetadataAccountV2InstructionAccounts = {
            metadata: publicKey(metadataPda.toBase58()),
            updateAuthority: signer,
        };

        let updateData: DataV2Args = {
            name: "micaiah",
            symbol: "MiC",
            uri: "https://micaiah.dev",
            sellerFeeBasisPoints: 500,
            creators: null,
            collection: null,
            uses: null,
        };

        let updateArgs: UpdateMetadataAccountV2InstructionArgs = {
            data: updateData,
            newUpdateAuthority: null,
            primarySaleHappened: null,
            isMutable: true,
        };
        let updateTx = updateMetadataAccountV2(
            umi,
            {
                ...updateAccounts,
                ...updateArgs
            }
        )

        let result = await updateTx.sendAndConfirm(umi);
        console.log(`Success! Check out your TX here:
            https://explorer.solana.com/tx/${bs58.encode(result.signature)}?cluster=devnet`);
    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
})();

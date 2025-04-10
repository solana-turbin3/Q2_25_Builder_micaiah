import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createSignerFromKeypair, signerIdentity, generateSigner, percentAmount } from "@metaplex-foundation/umi"
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";

import wallet from "/Users/micaiahreid/.config/solana/id.json";
import base58 from "bs58";

const RPC_ENDPOINT = "https://turbine-solanad-4cde.devnet.rpcpool.com/168dd64f-ce5e-4e19-a836-f6482ad6b396";
const umi = createUmi(RPC_ENDPOINT);

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const myKeypairSigner = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(myKeypairSigner));
umi.use(mplTokenMetadata())

const mint = generateSigner(umi);
const uri =  "https://devnet.irys.xyz/EJb8H4W689WPWFSeurWaZQ8ewvqndkVBWcMg7g8P6FWJ"; //"https://devnet.irys.xyz/4JkV8hnBNNmFiciQbzXce8MBHLBPWH9hfiqQuNSavJ1v"

(async () => {
    let tx = createNft(umi, {
        mint,
        name: "gEt RugGeD",
        symbol: "grg",
        uri,
        sellerFeeBasisPoints: percentAmount(5)
    });
    let result = await tx.sendAndConfirm(umi);
    const signature = base58.encode(result.signature);
    
    console.log(`Succesfully Minted! Check out your TX here:\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`)

    console.log("Mint Address: ", mint.publicKey);
})();

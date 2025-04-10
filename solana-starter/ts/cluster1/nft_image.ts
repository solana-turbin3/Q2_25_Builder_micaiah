
import wallet from "/Users/micaiahreid/.config/solana/id.json";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import { readFile } from "fs/promises"

// Create a devnet connection
const umi = createUmi('https://turbine-solanad-4cde.devnet.rpcpool.com/168dd64f-ce5e-4e19-a836-f6482ad6b396');

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader({address: "https://devnet.irys.xyz/",}));
umi.use(signerIdentity(signer));
const filename = "generug.png";

(async () => {
    try {
        //1. Load image
        const image = await readFile(`./cluster1/assets/${filename}`);
        //2. Convert image to generic file.
        const file = createGenericFile(image, filename, {
            contentType: "image/jpg",
        });
        //3. Upload image
        const result = await umi.uploader.upload([file]);


        const [myUri] = result;
        const irysURI = myUri.replace(
            "https://arweave.net/",
            "https://devnet.irys.xyz/"
        );
        console.log("Your image URI: ", irysURI);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();

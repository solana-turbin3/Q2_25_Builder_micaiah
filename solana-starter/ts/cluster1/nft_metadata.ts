
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

const rugUri = "https://devnet.irys.xyz/2wLHmJpbNpXWHHoMKqAe4aXnfHRQQZShwxVxdV6Mv89y";

(async () => {
    try {
        // Follow this JSON structure
        // https://docs.metaplex.com/programs/token-metadata/changelog/v1.0#json-structure

        const image = await readFile(`./cluster1/assets/${filename}`);
        //2. Convert image to generic file.
        const file = createGenericFile(image, filename, {
            contentType: "image/jpg",
        });
        // const image = ???
        const metadata = {
            name: "micrug",
            symbol: "McRug",
            description: "The ruggiest of all rugs",
            // image: "https://devnet.irys.xyz/2wLHmJpbNpXWHHoMKqAe4aXnfHRQQZShwxVxdV6Mv89y",
            image: file,
            attributes: [
                {trait_type: 'idk', value: 'idk'}
            ],
            properties: {
                files: [
                    {
                        type: "image/png",
                        uri: "image"
                    },
                ]
            },
            creators: [
                keypair.publicKey
            ]
        };
        const myUri = await umi.uploader.uploadJson([metadata]);
        console.log("Your metadata URI: ", myUri);
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

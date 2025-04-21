import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { InvestInSol } from "../target/types/invest_in_sol";
// What do we initialize: 
//    - Tokens (Convertible note and protocol token)
//    - NFT Collection
//    - A vault pda
//        - Holds: 
//            - PT
//            - Mint authority / Metadata authority for nfts
describe("does initialize the protocol", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.investInSol as Program<InvestInSol>;


  it("swaps USDC -> SOL", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);

    // get starting USDC balance on devnet

    // get starting SOL balance on devnet

    // get quote

    // swap USDC to sol
  });

  it("mints protocol token, transfers token to vault", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });

  it("creates NFT metadata account", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });

  it("mints NFT to user", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });

  it("mints protocol token, transfers fee to protocol and remaining tokens to depositor", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });

});

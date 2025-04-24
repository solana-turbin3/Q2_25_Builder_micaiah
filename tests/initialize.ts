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
  
  it("creates vault PDA", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);

    // now generate PDA account address via seed and confirm the account exists on-chain

  });

  it("creates treasury PDA", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);

    // now generate PDA account address via seed and confirm it exists on-chain

  });
  
  it("creates convertible note token", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);

    // get total supply, should be 0. 

    // get metadata for token, check name

  });

  it("creates protocol token", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);

    // get total supply, should be 0. 

    // get metadata for token, check name

  });

  it("creates NFT collection", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });

  // 

});

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

  it("deploy LP pool config account", async () => {
    // Add your test here.
    // const tx = await program.methods.initialize().rpc();
    // console.log("Your transaction signature", tx);
    // now generate PDA account address via seed and confirm it exists on-chain
  });

  it("create LP pool", async () => {
    // Add your test here.
    // const tx = await program.methods.initialize().rpc();
    // console.log("Your transaction signature", tx);
    // now generate PDA account address via seed and confirm it exists on-chain
  });

  it("create LP position", async () => {
    // Add your test here.
    // const tx = await program.methods.initialize().rpc();
    // console.log("Your transaction signature", tx);
    // get total supply, should be 0.
    // get metadata for token, check name
  });

  it("performs swap", async () => {
    // Add your test here.
    // const tx = await program.methods.initialize().rpc();
    // console.log("Your transaction signature", tx);
  });

  it("checks LP position, returns token a / b balance + quote", async () => {
    // Add your test here.
    // const tx = await program.methods.initialize().rpc();
    // console.log("Your transaction signature", tx);
  });

  it("collects fees", async () => {
    // Add your test here.
    // const tx = await program.methods.initialize().rpc();
    // console.log("Your transaction signature", tx);
  });

  //
});

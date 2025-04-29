use anchor_lang::prelude::*;
//    - A treasury PDA
//        - tracks deposited sol
//    - A treasury vault
//        - Holds:
//            - PT token ata
//            - Ability to hold sol

#[account]
#[derive(InitSpace)]
pub struct Treasury {
    /// The authority that can update the treasury.
    pub authority: Option<Pubkey>,
    /// The bump used to generate the treasury account.
    pub treasury_bump: u8,
    /// The total amount of SOL deposited into the treasury vault.
    #[max_len(8)] // u64 size
    pub total_deposited_sol: u64,
}

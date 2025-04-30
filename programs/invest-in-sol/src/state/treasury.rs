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
impl Treasury {
    /// calculates the net asset value (nav) of the treasury.
    /// todo: implement actual nav calculation based on treasury assets (sol, lps, etc.).
    pub fn calculate_nav(&self) -> Result<u64> {
        // placeholder: currently returns 1 sol per 1 cn token outstanding (implicitly)
        // this needs to be updated to reflect the actual value of assets held.
        Ok(1) // represents a 1:1 value for now
    }
}

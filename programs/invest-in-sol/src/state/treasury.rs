use anchor_lang::prelude::*;
//    - a treasury PDA
//        - tracks deposited sol
//    - a treasury vault
//        - holds:
//            - PT token ata
//            - ability to hold sol

#[account]
#[derive(InitSpace)]
pub struct Treasury {
    /// the authority that can update the treasury.
    pub authority: Option<Pubkey>,
    /// the bump used to generate the treasury account.
    pub treasury_bump: u8,
    /// the total amount of SOL deposited into the treasury vault.
    #[max_len(8)] // u64 size
    pub total_deposited_sol: u64,
}
impl Treasury {
    pub const SEED_PREFIX: &'static [u8] = b"treasury";

    pub fn get_seeds<'a>() -> [&'a [u8]; 1] {
        [Self::SEED_PREFIX]
    }

    pub fn get_seeds_with_bump<'a>(bump: &'a [u8]) -> [&'a [u8]; 2] {
        [Self::SEED_PREFIX, bump]
    }

    /// calculates the net asset value (nav) of the treasury.
    /// todo: implement actual nav calculation based on treasury assets (sol, lps, etc.).
    pub fn calculate_nav(&self) -> Result<u64> {
        // placeholder: currently returns 1 sol per 1 cn token outstanding (implicitly)
        // this needs to be updated to reflect the actual value of assets held.
        Ok(1) // represents a 1:1 value for now
    }
}

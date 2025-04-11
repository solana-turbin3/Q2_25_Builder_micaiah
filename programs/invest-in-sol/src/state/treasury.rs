use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Treasury {
    /// The seed used to generate this Treasury account.
    pub seed: u64,
    /// The authority that can update the treasury.
    pub authority: Option<Pubkey>,
}

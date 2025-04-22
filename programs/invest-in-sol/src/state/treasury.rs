use anchor_lang::prelude::*;
//    - A treasury PDA
//        - Holds:
//            - CN / PT token account references
//            - Ability to hold sol
//            - address of LP Token look up table
//        - methods:
//          - update look up table, takes address which must be

#[account]
#[derive(InitSpace)]
pub struct Treasury {
    /// The authority that can update the treasury.
    pub authority: Option<Pubkey>,
    /// The bump used to generate the treasury account.
    pub treasury_bump: u8,
}

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct OptionData {
    pub mint: Pubkey, // the mint address of the option NFT
    pub amount: u64, // the amount of underlying deposited / CN tokens minted
    pub expiration: i64, // unix timestamp of expiration
    pub bump: u8,
}

impl OptionData {
    // define seeds for the PDA
    // using the option mint seems appropriate for uniqueness
    pub const SEED_PREFIX: &'static [u8] = b"option_data";

     pub fn get_seeds_with_bump<'a>(mint: &'a Pubkey, bump: &'a [u8]) -> [&'a [u8]; 3] {
        [
            Self::SEED_PREFIX,
            mint.as_ref(),
            bump,
        ]
    }


    // method to check expiration of the option
    pub fn is_expired(&self, current_timestamp: i64) -> bool {
        current_timestamp >= self.expiration
    }
}
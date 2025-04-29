use anchor_lang::prelude::*;

/// stores the amount of Convertible Notes (CN) associated with a specific NFT Option.
/// the PDA seeds are [b"option_data", nft_mint_pubkey].
#[account]
#[derive(InitSpace)]
pub struct OptionData {
    /// The number of CN tokens required to convert this option.
    pub num_of_cn: u64,
    /// The bump seed for the PDA.
    pub bump: u8,
}
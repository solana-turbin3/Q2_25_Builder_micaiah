use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    /// The seed used to generate this Config account.
    pub seed: u64,
    /// The authority that can update the config.
    pub authority: Option<Pubkey>,
    /// The address of the Convertible Note we'll be issuing.
    pub cn_mint: Pubkey,
    /// The address of the Convertible Note we'll be issuing.
    pub pt_mint: Pubkey,
    /// The address of the options NFT collection.
    pub collection_mint: Pubkey,
    /// The optional fee for using the protocol.
    pub fee: Option<u16>,
    /// Used to lock the protocol.
    pub locked: bool,
    /// The bump used to generate this Config account.
    pub config_bump: u8,
    /// The bump used to generate the LP account.
    pub pt_bump: u8,
    /// The bump used to generate the treasury account.
    pub treasury_bump: u8,
}

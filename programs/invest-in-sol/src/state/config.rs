use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    /// The authority that can update the config.
    pub authority: Option<Pubkey>,
    /// The address of the Convertible Note we'll be issuing.
    pub cn_mint: Pubkey,
    /// The address of the Protocol Token we'll be issuing.
    pub pt_mint: Pubkey,
    /// The address of the options NFT collection.
    pub collection_mint: Pubkey,
    /// The optional fee for using the protocol.
    pub fee: Option<u16>,
    /// Used to lock the protocol in totality.
    pub locked: bool, // Global lock for all user-facing instructions
    /// Lock specifically for the deposit instruction.
    pub deposit_locked: bool,
    /// Lock specifically for the convert instruction.
    pub convert_locked: bool,
    /// The bump used to generate this Config account.
    pub config_bump: u8,
}

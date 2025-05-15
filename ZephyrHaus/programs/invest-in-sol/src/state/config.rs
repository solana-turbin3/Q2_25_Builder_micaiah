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
    /// Counter for naming/tracking options (optional).
    pub option_count: u64,
    /// Total amount of tokens in all outstanding options.
    pub total_option_amount: u64,
    /// Counter for unique deposit receipts.
    pub deposit_nonce: u64,
    /// Used to lock the protocol in totality.
    pub locked: bool, // Global lock for all user-facing instructions
    /// Lock specifically for the deposit instruction.
    pub deposit_locked: bool,
    /// Lock specifically for the convert instruction.
    pub convert_locked: bool,
    /// The bump used to generate this Config account.
    pub bump: u8, // Renamed from config_bump
}

impl Config {
    pub const SEED_PREFIX: &'static [u8] = b"config";

    pub fn get_seeds<'a>() -> [&'a [u8]; 1] {
        [Self::SEED_PREFIX]
    }

    pub fn get_seeds_with_bump<'a>(bump: &'a [u8]) -> [&'a [u8]; 2] {
        [Self::SEED_PREFIX, bump]
    }
}

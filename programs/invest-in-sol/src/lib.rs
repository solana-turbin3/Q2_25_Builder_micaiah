#![allow(unexpected_cfgs)]
mod instructions;
use instructions::*;
pub mod state;

use anchor_lang::prelude::*;

declare_id!("GwuTyisS2uwa8SNZ7gR298gyLLWioSfrwPEZQeTScfvS");

#[program]
pub mod invest_in_sol {
    use super::*;

    /// initializes the protocol config, treasury, and treasury vault.
    /// requires pre-existing CN, PT, and collection mints with authority
    /// delegated to the config PDA before calling.
    pub fn initialize(ctx: Context<Initialize>, option_duration: u32) -> Result<()> { // add argument
        Initialize::handler(ctx, option_duration) // pass argument
    }
    /// deposits SOL, mints CN tokens to the depositor,
    /// and mints PT tokens to the protocol treasury. (NFT minting moved)
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        Deposit::handler(ctx, amount)
    }
    /// initializes the option NFT, metadata, master edition, and OptionData PDA.
    /// this is intended to be called separately before or after deposit.
    pub fn initialize_option(ctx: Context<InitializeOption>, amount: u64) -> Result<()> {
        InitializeOption::handler(ctx, amount)
    }

    /// burns user's CN tokens and NFT option, mints PT tokens to the user,
    /// and closes the OptionData account.
    pub fn convert(ctx: Context<Convert>) -> Result<()> {
        Convert::handler(ctx)
    }

    /// updates the protocol locks (global, deposit, convert).
    /// only callable by the config authority.
    pub fn update_locks(
        ctx: Context<UpdateLocks>,
        locked: Option<bool>,
        deposit_locked: Option<bool>,
        convert_locked: Option<bool>,
    ) -> Result<()> {
        UpdateLocks::handler(ctx, locked, deposit_locked, convert_locked)
    }
}

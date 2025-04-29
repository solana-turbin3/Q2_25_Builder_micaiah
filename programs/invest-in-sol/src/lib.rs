#![allow(unexpected_cfgs)]
mod instructions;
use instructions::*;
pub mod state;

use anchor_lang::prelude::*;

declare_id!("GwuTyisS2uwa8SNZ7gR298gyLLWioSfrwPEZQeTScfvS");

#[program]
pub mod invest_in_sol {
    use super::*;

    /// Initializes the protocol config, treasury, and treasury vault.
    /// Requires pre-existing CN, PT, and Collection mints with authority
    /// delegated to the config PDA before calling.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Initialize::handler(ctx)
    }
    /// Deposits SOL, mints CN tokens and an NFT Option to the depositor,
    /// and mints PT tokens to the protocol treasury.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        Deposit::handler(ctx, amount)
    }

    /// Burns user's CN tokens and NFT Option, mints PT tokens to the user,
    /// and closes the OptionData account.
    pub fn convert(ctx: Context<Convert>) -> Result<()> {
        Convert::handler(ctx)
    }

    /// Updates the protocol locks (global, deposit, convert).
    /// Only callable by the config authority.
    pub fn update_locks(
        ctx: Context<UpdateLocks>,
        locked: Option<bool>,
        deposit_locked: Option<bool>,
        convert_locked: Option<bool>,
    ) -> Result<()> {
        UpdateLocks::handler(ctx, locked, deposit_locked, convert_locked)
    }
}

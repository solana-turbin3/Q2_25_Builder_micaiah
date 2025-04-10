#![allow(unexpected_cfgs)]
mod instructions;
use instructions::*;
mod state;

use anchor_lang::prelude::*;

declare_id!("DvoXqdQjd6Y9T25Xo7NZxkG8sKyUp9wZDudumey2DTaG");

#[program]
pub mod escrow {

    use super::*;

    pub fn make(ctx: Context<Make>, seed: u64, receive: u64, deposit: u64) -> Result<()> {
        ctx.accounts.init_escrow(seed, receive, &ctx.bumps)?;
        ctx.accounts.deposit(deposit)
    }

    pub fn take(ctx: Context<Take>) -> Result<()> {
        ctx.accounts.deposit()?;
        ctx.accounts.withdraw_and_close()
    }
}

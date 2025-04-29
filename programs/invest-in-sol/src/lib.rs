#![allow(unexpected_cfgs)]
mod instructions;
use instructions::*;
pub mod state;

use anchor_lang::prelude::*;

declare_id!("GwuTyisS2uwa8SNZ7gR298gyLLWioSfrwPEZQeTScfvS");

#[program]
pub mod invest_in_sol {
    use super::*;

    pub fn initialize_convertible_note(ctx: Context<InitializeConvertibleNote>) -> Result<()> {
        ctx.accounts.initialize(&ctx.bumps)
    }

    pub fn initialize_protocol_token(ctx: Context<InitializeProtocolToken>) -> Result<()> {
        ctx.accounts.initialize(&ctx.bumps)
    }

    pub fn initialize_nft_collection(ctx: Context<InitializeNftCollection>) -> Result<()> {
        ctx.accounts.initialize(&ctx.bumps)
    }
}

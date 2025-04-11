#![allow(unexpected_cfgs)]
mod instructions;
use instructions::*;
pub mod state;

use anchor_lang::prelude::*;

declare_id!("7HLJsmGgZ37JAqmihGYNqmcuxG1qvt4s9t3EWJyaaPVo");

#[program]
pub mod invest_in_sol {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        seed: u64,
        authority: Option<Pubkey>,
    ) -> Result<()> {
        ctx.accounts.initialize(seed, authority, ctx.bumps)
    }
}

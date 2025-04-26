#![allow(unexpected_cfgs)]
mod instructions;
use instructions::*;
pub mod state;

use anchor_lang::prelude::*;

declare_id!("3SUC8vzo7YcLvgDYo5xoDeMf7ReQdYZUDmi6Hnb9HAv3");

#[program]
pub mod invest_in_sol {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, authority: Option<Pubkey>) -> Result<()> {
        ctx.accounts.initialize_cn_metadata(&ctx.bumps)?;
        ctx.accounts.initialize_pt_metadata(&ctx.bumps)?;
        ctx.accounts.initialize_nft_metadata(&ctx.bumps)?;
        // ctx.accounts.initialize_nft_master_edition()?;
        // ctx.accounts.initialize_states(
        //     authority,
        //     ctx.bumps,
        // )
        Ok(())
    }
}

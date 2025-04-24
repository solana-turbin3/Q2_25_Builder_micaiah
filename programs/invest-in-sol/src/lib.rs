#![allow(unexpected_cfgs)]
mod instructions;
use instructions::*;
pub mod state;

use anchor_lang::prelude::*;

declare_id!("7HLJsmGgZ37JAqmihGYNqmcuxG1qvt4s9t3EWJyaaPVo");

#[program]
pub mod invest_in_sol {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, authority: Option<Pubkey>) -> Result<()> {
        let cn_metadata_bump = ctx.accounts.initialize_cn_metadata()?;
        let pt_metadata_bump = ctx.accounts.initialize_pt_metadata()?;
        let collection_meta_bump = ctx.accounts.initialize_nft_metadata()?;
        let collection_master_edition_bump = ctx.accounts.initialize_nft_master_edition()?;
        ctx.accounts.initialize_states(
            authority,
            ctx.bumps,
            cn_metadata_bump,
            pt_metadata_bump,
            collection_meta_bump,
            collection_master_edition_bump,
        )
    }
}

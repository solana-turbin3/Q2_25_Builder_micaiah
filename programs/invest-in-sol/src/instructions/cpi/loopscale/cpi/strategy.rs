use anchor_lang::prelude::*;
use crate::instructions::loopscale::types::{
    accounts::*, instructions::*, pod::*,
};

#[derive(Accounts)]
pub struct CreateStrategy<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub manager: Signer<'info>,
    #[account(mut)]
    pub strategy: AccountInfo<'info>,
    pub principal_mint: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub event_authority: AccountInfo<'info>,
    pub program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdateStrategy<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub manager: Signer<'info>,
    #[account(mut)]
    pub strategy: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub event_authority: AccountInfo<'info>,
    pub program: AccountInfo<'info>,
}

pub fn create_strategy<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, CreateStrategy<'a>>,
    params: CreateStrategyParams,
) -> Result<()> {
    let ix = crate::instructions::loopscale::instruction::create_strategy(
        ctx.program.key(),
        params,
    )?;
    solana_program::program::invoke_signed(
        &ix,
        &ToAccountInfos::to_account_infos(&ctx),
        ctx.signer_seeds,
    )?;
    Ok(())
}

pub fn update_strategy<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, UpdateStrategy<'a>>,
    params: UpdateStrategyParams,
) -> Result<()> {
    let ix = crate::instructions::loopscale::instruction::update_strategy(
        ctx.program.key(),
        params,
    )?;
    solana_program::program::invoke_signed(
        &ix,
        &ToAccountInfos::to_account_infos(&ctx),
        ctx.signer_seeds,
    )?;
    Ok(())
} 
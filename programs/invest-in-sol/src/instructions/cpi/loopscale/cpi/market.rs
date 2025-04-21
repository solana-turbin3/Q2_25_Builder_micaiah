use anchor_lang::prelude::*;
use crate::instructions::loopscale::types::{
    accounts::*, instructions::*, pod::*,
};

#[derive(Accounts)]
pub struct CreateMarketInformation<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub manager: Signer<'info>,
    #[account(mut)]
    pub market_information: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub event_authority: AccountInfo<'info>,
    pub program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdateMarketInformation<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub manager: Signer<'info>,
    #[account(mut)]
    pub market_information: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub event_authority: AccountInfo<'info>,
    pub program: AccountInfo<'info>,
}

pub fn create_market_information<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, CreateMarketInformation<'a>>,
    params: CreateMarketInformationParams,
) -> Result<()> {
    let ix = crate::instructions::loopscale::instruction::create_market_information(
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

pub fn update_market_information<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, UpdateMarketInformation<'a>>,
    params: UpdateMarketInformationParams,
) -> Result<()> {
    let ix = crate::instructions::loopscale::instruction::update_market_information(
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
use anchor_lang::prelude::*;
use crate::instructions::loopscale::types::{
    accounts::*, instructions::*, pod::*,
};

#[derive(Accounts)]
pub struct DepositCollateral<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub borrower: Signer<'info>,
    #[account(mut)]
    pub loan: AccountInfo<'info>,
    #[account(mut)]
    pub borrower_collateral_ta: AccountInfo<'info>,
    #[account(mut)]
    pub loan_collateral_ta: AccountInfo<'info>,
    pub deposit_mint: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    pub associated_token_program: AccountInfo<'info>,
    pub event_authority: AccountInfo<'info>,
    pub program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct WithdrawCollateral<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(mut)]
    pub loan: AccountInfo<'info>,
    #[account(mut)]
    pub borrower_ta: AccountInfo<'info>,
    #[account(mut)]
    pub loan_ta: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub asset_mint: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    pub associated_token_program: AccountInfo<'info>,
    pub event_authority: AccountInfo<'info>,
    pub program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ManageCollateralClaimOrcaFee<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub borrower: Signer<'info>,
    pub loan: AccountInfo<'info>,
    #[account(mut)]
    pub whirlpool: AccountInfo<'info>,
    #[account(mut)]
    pub token_vault_a: AccountInfo<'info>,
    #[account(mut)]
    pub token_vault_b: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_lower: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_upper: AccountInfo<'info>,
    #[account(mut)]
    pub position: AccountInfo<'info>,
    #[account(mut)]
    pub position_token_account: AccountInfo<'info>,
    #[account(mut)]
    pub borrower_ta_a: AccountInfo<'info>,
    #[account(mut)]
    pub borrower_ta_b: AccountInfo<'info>,
    #[account(mut)]
    pub loan_ta_a: AccountInfo<'info>,
    #[account(mut)]
    pub loan_ta_b: AccountInfo<'info>,
    pub mint_a: AccountInfo<'info>,
    pub mint_b: AccountInfo<'info>,
    pub whirlpool_program: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    pub token_2022_program: AccountInfo<'info>,
    pub associated_token_program: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub memo_program: AccountInfo<'info>,
}

pub fn deposit_collateral<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, DepositCollateral<'a>>,
    params: DepositCollateralParams,
) -> Result<()> {
    let ix = crate::instructions::loopscale::instruction::deposit_collateral(
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

pub fn withdraw_collateral<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, WithdrawCollateral<'a>>,
    params: WithdrawCollateralParams,
) -> Result<()> {
    let ix = crate::instructions::loopscale::instruction::withdraw_collateral(
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

pub fn manage_collateral_claim_orca_fee<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, ManageCollateralClaimOrcaFee<'a>>,
    close_ta: bool,
) -> Result<()> {
    let ix = crate::instructions::loopscale::instruction::manage_collateral_claim_orca_fee(
        ctx.program.key(),
        close_ta,
    )?;
    solana_program::program::invoke_signed(
        &ix,
        &ToAccountInfos::to_account_infos(&ctx),
        ctx.signer_seeds,
    )?;
    Ok(())
} 
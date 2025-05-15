use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use whirlpool_cpi::{self, state::*, program::Whirlpool as WhirlpoolProgram};
use crate::cpi::orca::types::SwapParams;

#[derive(Accounts)]
pub struct Swap<'info> {
    pub whirlpool_program: Program<'info, WhirlpoolProgram>,
    
    #[account(mut)]
    pub token_authority: Signer<'info>,
    
    #[account(mut)]
    pub whirlpool: AccountInfo<'info>,
    
    #[account(mut)]
    pub token_owner_account_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_vault_a: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub token_owner_account_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_vault_b: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub tick_array_0: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_1: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_2: AccountInfo<'info>,
    
    #[account(mut)]
    pub oracle: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

pub fn swap<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, Swap<'a>>,
    params: SwapParams,
) -> Result<()> {
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = whirlpool_cpi::cpi::accounts::Swap {
        whirlpool: ctx.accounts.whirlpool.to_account_info(),
        token_authority: ctx.accounts.token_authority.to_account_info(),
        token_owner_account_a: ctx.accounts.token_owner_account_a.to_account_info(),
        token_vault_a: ctx.accounts.token_vault_a.to_account_info(),
        token_owner_account_b: ctx.accounts.token_owner_account_b.to_account_info(),
        token_vault_b: ctx.accounts.token_vault_b.to_account_info(),
        tick_array_0: ctx.accounts.tick_array_0.to_account_info(),
        tick_array_1: ctx.accounts.tick_array_1.to_account_info(),
        tick_array_2: ctx.accounts.tick_array_2.to_account_info(),
        oracle: ctx.accounts.oracle.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    whirlpool_cpi::cpi::swap(
        cpi_ctx,
        params.amount,
        params.other_amount_threshold,
        params.sqrt_price_limit,
        params.amount_specified_is_input,
        params.a_to_b,
    )?;
    
    Ok(())
} 
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Mint, TokenAccount};
use whirlpool_cpi::{self, state::*, program::Whirlpool as WhirlpoolProgram};
use crate::cpi::orca::types::{InitializePoolParams};

#[derive(Accounts)]
pub struct InitializePool<'info> {
    pub whirlpool_program: Program<'info, WhirlpoolProgram>,
    
    #[account(mut)]
    pub whirlpools_config: AccountInfo<'info>,
    
    #[account(mut)]
    pub token_mint_a: Account<'info, Mint>,
    #[account(mut)]
    pub token_mint_b: Account<'info, Mint>,
    
    #[account(mut)]
    pub funder: Signer<'info>,
    
    #[account(mut)]
    pub whirlpool: AccountInfo<'info>,
    
    #[account(mut)]
    pub token_vault_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_vault_b: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub fee_tier: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct InitializeTickArray<'info> {
    pub whirlpool_program: Program<'info, WhirlpoolProgram>,
    
    #[account(mut)]
    pub whirlpool: AccountInfo<'info>,
    
    #[account(mut)]
    pub funder: Signer<'info>,
    
    #[account(mut)]
    pub tick_array: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn initialize_pool<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, InitializePool<'a>>,
    params: InitializePoolParams,
) -> Result<()> {
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = whirlpool_cpi::cpi::accounts::InitializePool {
        whirlpools_config: ctx.accounts.whirlpools_config.to_account_info(),
        token_mint_a: ctx.accounts.token_mint_a.to_account_info(),
        token_mint_b: ctx.accounts.token_mint_b.to_account_info(),
        funder: ctx.accounts.funder.to_account_info(),
        whirlpool: ctx.accounts.whirlpool.to_account_info(),
        token_vault_a: ctx.accounts.token_vault_a.to_account_info(),
        token_vault_b: ctx.accounts.token_vault_b.to_account_info(),
        fee_tier: ctx.accounts.fee_tier.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    whirlpool_cpi::cpi::initialize_pool(cpi_ctx, params.tick_spacing, params.initial_sqrt_price)?;
    
    Ok(())
}

pub fn initialize_tick_array<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, InitializeTickArray<'a>>,
    start_tick_index: i32,
) -> Result<()> {
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = whirlpool_cpi::cpi::accounts::InitializeTickArray {
        whirlpool: ctx.accounts.whirlpool.to_account_info(),
        funder: ctx.accounts.funder.to_account_info(),
        tick_array: ctx.accounts.tick_array.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    whirlpool_cpi::cpi::initialize_tick_array(cpi_ctx, start_tick_index)?;
    
    Ok(())
} 
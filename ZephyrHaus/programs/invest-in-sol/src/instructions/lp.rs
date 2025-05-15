use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Mint, TokenAccount};
use crate::cpi::orca::types::{OrcaPoolConfig, InitializePoolParams};
use whirlpool_cpi::{self, state::*, program::Whirlpool as WhirlpoolProgram};

#[derive(Accounts)]
pub struct InitializeOrcaPool<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + std::mem::size_of::<OrcaPoolConfig>(),
        seeds = [b"orca-pool-config", token_mint_a.key().as_ref(), token_mint_b.key().as_ref()],
        bump
    )]
    pub pool_config: Account<'info, OrcaPoolConfig>,
    
    pub whirlpool_program: Program<'info, WhirlpoolProgram>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub token_mint_a: Account<'info, Mint>,
    pub token_mint_b: Account<'info, Mint>,
    
    #[account(mut)]
    pub token_vault_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_vault_b: Account<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateOrcaPoolConfig<'info> {
    #[account(
        mut,
        has_one = authority,
        seeds = [b"orca-pool-config", pool_config.token_mint_a.as_ref(), pool_config.token_mint_b.as_ref()],
        bump = pool_config.bump
    )]
    pub pool_config: Account<'info, OrcaPoolConfig>,
    
    pub authority: Signer<'info>,
}

pub fn initialize_orca_pool(
    ctx: Context<InitializeOrcaPool>,
    params: InitializePoolParams,
) -> Result<()> {
    let pool_config = &mut ctx.accounts.pool_config;
    
    // initialize the whirlpool
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = whirlpool_cpi::cpi::accounts::InitializePool {
        whirlpools_config: ctx.accounts.whirlpools_config.to_account_info(),
        token_mint_a: ctx.accounts.token_mint_a.to_account_info(),
        token_mint_b: ctx.accounts.token_mint_b.to_account_info(),
        funder: ctx.accounts.payer.to_account_info(),
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
    
    // initialize the pool config
    pool_config.version = 1;
    pool_config.bump = *ctx.bumps.get("pool_config").unwrap();
    pool_config.authority = ctx.accounts.payer.key();
    pool_config.whirlpool = ctx.accounts.whirlpool.key();
    pool_config.token_mint_a = ctx.accounts.token_mint_a.key();
    pool_config.token_mint_b = ctx.accounts.token_mint_b.key();
    pool_config.token_vault_a = ctx.accounts.token_vault_a.key();
    pool_config.token_vault_b = ctx.accounts.token_vault_b.key();
    
    Ok(())
}

pub fn update_orca_pool_config(
    ctx: Context<UpdateOrcaPoolConfig>,
    new_config: OrcaPoolConfig,
) -> Result<()> {
    let pool_config = &mut ctx.accounts.pool_config;
    
    // update the config with new values
    pool_config.fee_rate = new_config.fee_rate;
    pool_config.protocol_fee_rate = new_config.protocol_fee_rate;
    pool_config.reward_infos = new_config.reward_infos;
    
    Ok(())
} 
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Mint, TokenAccount};
use whirlpool_cpi::{self, state::*, program::Whirlpool as WhirlpoolProgram};
use crate::cpi::orca::types::{OpenPositionParams, IncreaseLiquidityParams, DecreaseLiquidityParams};

#[derive(Accounts)]
pub struct OpenPosition<'info> {
    pub whirlpool_program: Program<'info, WhirlpoolProgram>,
    
    #[account(mut)]
    pub funder: Signer<'info>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(mut)]
    pub position: AccountInfo<'info>,
    
    #[account(mut)]
    pub position_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub position_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub whirlpool: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct IncreaseLiquidity<'info> {
    pub whirlpool_program: Program<'info, WhirlpoolProgram>,
    
    #[account(mut)]
    pub position_authority: Signer<'info>,
    
    #[account(mut)]
    pub position: AccountInfo<'info>,
    
    #[account(mut)]
    pub position_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub whirlpool: AccountInfo<'info>,
    
    #[account(mut)]
    pub token_owner_account_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_owner_account_b: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub token_vault_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_vault_b: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub tick_array_lower: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_upper: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DecreaseLiquidity<'info> {
    pub whirlpool_program: Program<'info, WhirlpoolProgram>,
    
    #[account(mut)]
    pub position_authority: Signer<'info>,
    
    #[account(mut)]
    pub position: AccountInfo<'info>,
    
    #[account(mut)]
    pub position_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub whirlpool: AccountInfo<'info>,
    
    #[account(mut)]
    pub token_owner_account_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_owner_account_b: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub token_vault_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_vault_b: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub tick_array_lower: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_upper: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClosePosition<'info> {
    pub whirlpool_program: Program<'info, WhirlpoolProgram>,
    
    #[account(mut)]
    pub position_authority: Signer<'info>,
    
    #[account(mut)]
    pub receiver: AccountInfo<'info>,
    
    #[account(mut)]
    pub position: AccountInfo<'info>,
    
    #[account(mut)]
    pub position_mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub position_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

pub fn open_position<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, OpenPosition<'a>>,
    params: OpenPositionParams,
) -> Result<()> {
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = whirlpool_cpi::cpi::accounts::OpenPosition {
        funder: ctx.accounts.funder.to_account_info(),
        owner: ctx.accounts.owner.to_account_info(),
        position: ctx.accounts.position.to_account_info(),
        position_mint: ctx.accounts.position_mint.to_account_info(),
        position_token_account: ctx.accounts.position_token_account.to_account_info(),
        whirlpool: ctx.accounts.whirlpool.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    whirlpool_cpi::cpi::open_position(cpi_ctx, params.tick_lower_index, params.tick_upper_index)?;
    
    Ok(())
}

pub fn increase_liquidity<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, IncreaseLiquidity<'a>>,
    params: IncreaseLiquidityParams,
) -> Result<()> {
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = whirlpool_cpi::cpi::accounts::IncreaseLiquidity {
        position_authority: ctx.accounts.position_authority.to_account_info(),
        position: ctx.accounts.position.to_account_info(),
        position_token_account: ctx.accounts.position_token_account.to_account_info(),
        whirlpool: ctx.accounts.whirlpool.to_account_info(),
        token_owner_account_a: ctx.accounts.token_owner_account_a.to_account_info(),
        token_owner_account_b: ctx.accounts.token_owner_account_b.to_account_info(),
        token_vault_a: ctx.accounts.token_vault_a.to_account_info(),
        token_vault_b: ctx.accounts.token_vault_b.to_account_info(),
        tick_array_lower: ctx.accounts.tick_array_lower.to_account_info(),
        tick_array_upper: ctx.accounts.tick_array_upper.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    whirlpool_cpi::cpi::increase_liquidity(
        cpi_ctx,
        params.liquidity_amount,
        params.token_max_a,
        params.token_max_b,
    )?;
    
    Ok(())
}

pub fn decrease_liquidity<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, DecreaseLiquidity<'a>>,
    params: DecreaseLiquidityParams,
) -> Result<()> {
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = whirlpool_cpi::cpi::accounts::DecreaseLiquidity {
        position_authority: ctx.accounts.position_authority.to_account_info(),
        position: ctx.accounts.position.to_account_info(),
        position_token_account: ctx.accounts.position_token_account.to_account_info(),
        whirlpool: ctx.accounts.whirlpool.to_account_info(),
        token_owner_account_a: ctx.accounts.token_owner_account_a.to_account_info(),
        token_owner_account_b: ctx.accounts.token_owner_account_b.to_account_info(),
        token_vault_a: ctx.accounts.token_vault_a.to_account_info(),
        token_vault_b: ctx.accounts.token_vault_b.to_account_info(),
        tick_array_lower: ctx.accounts.tick_array_lower.to_account_info(),
        tick_array_upper: ctx.accounts.tick_array_upper.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    whirlpool_cpi::cpi::decrease_liquidity(
        cpi_ctx,
        params.liquidity_amount,
        params.token_min_a,
        params.token_min_b,
    )?;
    
    Ok(())
}

pub fn close_position<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, ClosePosition<'a>>,
) -> Result<()> {
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = whirlpool_cpi::cpi::accounts::ClosePosition {
        position_authority: ctx.accounts.position_authority.to_account_info(),
        receiver: ctx.accounts.receiver.to_account_info(),
        position: ctx.accounts.position.to_account_info(),
        position_mint: ctx.accounts.position_mint.to_account_info(),
        position_token_account: ctx.accounts.position_token_account.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    whirlpool_cpi::cpi::close_position(cpi_ctx)?;
    
    Ok(())
} 
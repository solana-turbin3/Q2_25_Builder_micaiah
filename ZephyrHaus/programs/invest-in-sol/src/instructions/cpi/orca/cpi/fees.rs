use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use whirlpool_cpi::{self, state::*, program::Whirlpool as WhirlpoolProgram};

#[derive(Accounts)]
pub struct CollectFees<'info> {
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
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CollectReward<'info> {
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
    pub reward_owner_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub reward_vault: Account<'info, TokenAccount>,
    
    pub reward_authority: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateFeesAndRewards<'info> {
    pub whirlpool_program: Program<'info, WhirlpoolProgram>,
    
    #[account(mut)]
    pub whirlpool: AccountInfo<'info>,
    
    #[account(mut)]
    pub position: AccountInfo<'info>,
    
    #[account(mut)]
    pub tick_array_lower: AccountInfo<'info>,
    #[account(mut)]
    pub tick_array_upper: AccountInfo<'info>,
}

pub fn collect_fees<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, CollectFees<'a>>,
) -> Result<()> {
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = whirlpool_cpi::cpi::accounts::CollectFees {
        position_authority: ctx.accounts.position_authority.to_account_info(),
        position: ctx.accounts.position.to_account_info(),
        position_token_account: ctx.accounts.position_token_account.to_account_info(),
        whirlpool: ctx.accounts.whirlpool.to_account_info(),
        token_owner_account_a: ctx.accounts.token_owner_account_a.to_account_info(),
        token_owner_account_b: ctx.accounts.token_owner_account_b.to_account_info(),
        token_vault_a: ctx.accounts.token_vault_a.to_account_info(),
        token_vault_b: ctx.accounts.token_vault_b.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    whirlpool_cpi::cpi::collect_fees(cpi_ctx)?;
    
    Ok(())
}

pub fn collect_reward<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, CollectReward<'a>>,
    reward_index: u8,
) -> Result<()> {
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = whirlpool_cpi::cpi::accounts::CollectReward {
        position_authority: ctx.accounts.position_authority.to_account_info(),
        position: ctx.accounts.position.to_account_info(),
        position_token_account: ctx.accounts.position_token_account.to_account_info(),
        whirlpool: ctx.accounts.whirlpool.to_account_info(),
        reward_owner_account: ctx.accounts.reward_owner_account.to_account_info(),
        reward_vault: ctx.accounts.reward_vault.to_account_info(),
        reward_authority: ctx.accounts.reward_authority.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    whirlpool_cpi::cpi::collect_reward(cpi_ctx, reward_index)?;
    
    Ok(())
}

pub fn update_fees_and_rewards<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, UpdateFeesAndRewards<'a>>,
) -> Result<()> {
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = whirlpool_cpi::cpi::accounts::UpdateFeesAndRewards {
        whirlpool: ctx.accounts.whirlpool.to_account_info(),
        position: ctx.accounts.position.to_account_info(),
        tick_array_lower: ctx.accounts.tick_array_lower.to_account_info(),
        tick_array_upper: ctx.accounts.tick_array_upper.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    whirlpool_cpi::cpi::update_fees_and_rewards(cpi_ctx)?;
    
    Ok(())
} 
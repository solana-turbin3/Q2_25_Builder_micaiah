use anchor_lang::prelude::*;
use whirlpool_cpi::{self, state::*, program::Whirlpool as WhirlpoolProgram};

#[derive(Accounts)]
pub struct VerifyAccount<'info> {
    pub whirlpool_program: Program<'info, WhirlpoolProgram>,
    
    pub account: AccountInfo<'info>,
}

pub fn verify_account<'a>(
    ctx: CpiContext<'_, '_, '_, 'a, VerifyAccount<'a>>,
) -> Result<()> {
    let cpi_program = ctx.accounts.whirlpool_program.to_account_info();
    let cpi_accounts = whirlpool_cpi::cpi::accounts::VerifyAccount {
        account: ctx.accounts.account.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    whirlpool_cpi::cpi::verify_account(cpi_ctx)?;
    
    Ok(())
} 
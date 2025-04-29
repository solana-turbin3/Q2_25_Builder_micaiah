use anchor_lang::prelude::*;
use crate::state::Config;

#[derive(Accounts)]
pub struct UpdateLocks<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.config_bump,
        // has_one = authority @ AdminError::Unauthorized, // removed: manual check needed due to Option<Pubkey>
    )]
    pub config: Account<'info, Config>,
}

impl<'info> UpdateLocks<'info> {
    pub fn handler(
        ctx: Context<UpdateLocks>,
        locked: Option<bool>,
        deposit_locked: Option<bool>,
        convert_locked: Option<bool>,
    ) -> Result<()> {
        // manual authority check
        require!(
            ctx.accounts.config.authority.is_some(),
            AdminError::Unauthorized
        );
        require!(
            ctx.accounts.config.authority.unwrap() == ctx.accounts.authority.key(),
            AdminError::Unauthorized
        );

        let config = &mut ctx.accounts.config;

        if let Some(val) = locked {
            config.locked = val;
            msg!("global lock updated to: {}", val);
        }
        if let Some(val) = deposit_locked {
            config.deposit_locked = val;
            msg!("deposit lock updated to: {}", val);
        }
        if let Some(val) = convert_locked {
            config.convert_locked = val;
            msg!("convert lock updated to: {}", val);
        }

        Ok(())
    }
}

#[error_code]
pub enum AdminError {
    #[msg("unauthorized: signer is not the config authority.")]
    Unauthorized,
}
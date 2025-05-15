use anchor_lang::prelude::*;
use crate::state::{Config, OptionData};
use crate::ErrorCode;

#[derive(Accounts)]
pub struct CloseOptionAccount<'info> {
    // Authority: The Config PDA, which signs to authorize the closure.
    #[account(
        seeds = [Config::SEED_PREFIX],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    // OptionData PDA to be closed.
    #[account(
        mut,
        seeds = [OptionData::SEED_PREFIX, option_mint.key().as_ref()],
        bump = option_data.bump,
        // Constraint: Ensure the option is fully spent.
        constraint = option_data.amount == 0 @ ErrorCode::OptionNotFullyConverted,
        // Close to the receiver (which will be the config.authority).
        close = receiver
    )]
    pub option_data: Account<'info, OptionData>,

    // The Option NFT mint, used as a seed for the option_data PDA.
    /// CHECK: Validated by its use as a seed for option_data.
    pub option_mint: AccountInfo<'info>,

    // Receiver of the lamports from the closed option_data account.
    // This will be the system account designated by config.authority.
    #[account(mut)]
    pub receiver: SystemAccount<'info>, // This MUST be a SystemAccount

    // System program, required by Anchor for account closure.
    pub system_program: Program<'info, System>,
}

// Additional constraint to verify receiver is the config.authority
impl<'info> CloseOptionAccount<'info> {
    pub fn validate_receiver(&self) -> Result<()> {
        require_keys_eq!(
            self.receiver.key(),
            self.config.authority.ok_or(ErrorCode::AuthorityNotSet)?, // Assuming authority in Config is Option<Pubkey>
            ErrorCode::ReceiverAuthorityMismatch
        );
        Ok(())
    }
}

pub fn handler(ctx: Context<CloseOptionAccount>) -> Result<()> {
    ctx.accounts.validate_receiver()?; // Perform the custom validation

    msg!("OptionData account for mint {} will be closed by Anchor.",
         ctx.accounts.option_mint.key());
    msg!("Lamports will be transferred to {}.", ctx.accounts.receiver.key());
    // Anchor handles the account closure and lamport transfer automatically.
    Ok(())
}
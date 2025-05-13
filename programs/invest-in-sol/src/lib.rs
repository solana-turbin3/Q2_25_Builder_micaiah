#![allow(unexpected_cfgs)]
mod instructions;
use instructions::*;
pub mod state;

use anchor_lang::prelude::*;

declare_id!("3EdJ94TjbyqmZJartpZHHdavKtH5aXQdUS6RyiPzGrmE");

#[program]
pub mod invest_in_sol {
    use super::*;

    /// initializes the protocol config, treasury, and treasury vault.
    /// requires pre-existing CN, PT, and collection mints with authority
    /// delegated to the config PDA before calling.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Initialize::handler(ctx)
    }
    /// deposits SOL, mints CN tokens to the depositor,
    /// and mints PT tokens to the protocol treasury.
    /// NFT minting is handled separately in the initialize_option instruction.
    pub fn deposit(mut ctx: Context<Deposit>, amount: u64, option_duration: u32) -> Result<()> {
        Deposit::assert_protocol_state(&ctx)?;
        Deposit::deposit_sol(&mut ctx, amount)?;
        let tokens_to_mint = Deposit::calculate_tokens_to_mint(&ctx, amount)?;
        Deposit::set_deposit_receipt(&mut ctx, tokens_to_mint, option_duration)?;
        Deposit::mint_cn_to_depositor(&ctx, tokens_to_mint)?;
        Deposit::mint_pt_to_protocol(&ctx, tokens_to_mint)?;
        Ok(())
    }
    /// initializes the option NFT, metadata, master edition, and OptionData PDA.
    /// this is intended to be called separately before or after deposit.
    /// if the main collection doesn't exist, it will be created.
    pub fn initialize_option(ctx: Context<InitializeOption>) -> Result<()> {
        // Use the new process_initialize_option function that handles collection creation
        InitializeOption::process_initialize_option(ctx)
    }

    /// burns user's CN tokens and optionally the NFT option, mints PT tokens to the user.
    /// If amount_to_convert_ui equals the full amount in OptionData, burns the NFT and sets amount to 0.
    /// If amount_to_convert_ui is less than the full amount, decrements OptionData.amount and keeps the NFT.
    pub fn convert(ctx: Context<Convert>, amount_to_convert_ui: u64) -> Result<()> {
        Convert::handler(ctx, amount_to_convert_ui)
    }

    /// updates the protocol locks (global, deposit, convert).
    /// only callable by the config authority.
    pub fn update_locks(
        ctx: Context<UpdateLocks>,
        locked: Option<bool>,
        deposit_locked: Option<bool>,
        convert_locked: Option<bool>,
    ) -> Result<()> {
        UpdateLocks::handler(ctx, locked, deposit_locked, convert_locked)
    }

    /// closes a fully converted OptionData account and returns the rent to the config authority.
    /// can only be called when option_data.amount = 0 (fully converted).
    /// only the Config PDA can authorize this closure.
    pub fn close_option_account(ctx: Context<CloseOptionAccount>) -> Result<()> {
        close_option_account::handler(ctx)
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("calculation overflow")]
    Overflow,
    #[msg("address mismatch")]
    AddressMismatch,
    #[msg("option not fully converted (amount > 0)")]
    OptionNotFullyConverted,
    #[msg("config authority not set")]
    AuthorityNotSet,
    #[msg("receiver must be the config authority")]
    ReceiverAuthorityMismatch,
}

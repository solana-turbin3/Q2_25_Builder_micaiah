use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use anchor_spl::token_interface::Mint;

use crate::state::{Config, Treasury};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,

    #[account(
        mint::token_program = token_program,
        mint::authority = config // config PDA will be mint authority
    )]
    pub cn_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mint::token_program = token_program,
        mint::authority = config // config PDA will be mint authority
    )]
    pub pt_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mint::token_program = token_program,
        mint::authority = config // config PDA will be mint authority
    )]
    pub collection_mint: InterfaceAccount<'info, Mint>,

    // --- PDAs & accounts to initialize ---
    #[account(
        init,
        payer = initializer,
        seeds = [Config::SEED_PREFIX], // use constant seed
        bump,
        space = 8 + Config::INIT_SPACE
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = initializer,
        seeds = [Treasury::SEED_PREFIX], // use constant seed
        bump,
        space = 8 + Treasury::INIT_SPACE
    )]
    pub treasury: Account<'info, Treasury>,

    // --- programs ---
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

impl<'info> Initialize<'info> {
    // update handler signature
    pub fn handler(ctx: Context<Initialize>) -> Result<()> {
        // initialize config PDA
        let config = &mut ctx.accounts.config;
        config.authority = Some(ctx.accounts.initializer.key());
        config.cn_mint = ctx.accounts.cn_mint.key();
        config.pt_mint = ctx.accounts.pt_mint.key();
        config.collection_mint = ctx.accounts.collection_mint.key();
        config.fee = None; // default to no fee
        config.option_count = 0; // initialize count
        config.total_option_amount = 0; // initialize total option amount
        config.deposit_nonce = 0; // initialize deposit nonce
        config.locked = false; // default to unlocked
        config.deposit_locked = true; // default deposit to locked
        config.convert_locked = true; // default convert to locked
        config.bump = ctx.bumps.config; // use correct bump field name

        // initialize treasury PDA
        let treasury = &mut ctx.accounts.treasury;
        treasury.authority = Some(ctx.accounts.initializer.key());
        treasury.treasury_bump = ctx.bumps.treasury; // use correct bump field name 'treasury_bump'

        // treasury_vault is initialized via account constraints.
        // anchor should automatically assign ownership to the program
        // we might want to explicitly transfer ownership to the treasury PDA if needed later,
        // but for holding SOL deposited via CPI, program ownership is often sufficient.

        msg!("protocol initialized:");
        msg!("  config PDA: {}", config.key());
        msg!("  treasury PDA: {}", treasury.key());
        msg!("  CN Mint: {}", config.cn_mint);
        msg!("  PT Mint: {}", config.pt_mint);
        msg!("  Collection Mint: {}", config.collection_mint);
        msg!("  Option Count: {}", config.option_count);
        msg!("  Total Option Amount: {}", config.total_option_amount);
        msg!("  authority: {}", config.authority.unwrap());

        Ok(())
    }
}

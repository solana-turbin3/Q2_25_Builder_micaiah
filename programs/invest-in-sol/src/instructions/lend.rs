use anchor_lang::prelude::*;
use anchor_spl::{
    token::{Token, TokenAccount, Mint, mint_to},
    associated_token::AssociatedToken,
};
use crate::{state::*, error::*};
use crate::instructions::loopscale::cpi::{strategy::*, vault::*};

#[derive(Accounts)]
pub struct LendTreasurySol<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// treasury PDA that holds the SOL
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, Treasury>,

    /// CHECK: validated by loopscale program
    #[account(mut)]
    pub loopscale_strategy: AccountInfo<'info>,

    /// CHECK: validated by loopscale program
    pub market_information: AccountInfo<'info>,

    /// WSOL mint
    #[account(
        mut,
        address = anchor_spl::token::spl_token::native_mint::ID
    )]
    pub wsol_mint: Account<'info, Mint>,

    /// treasury's wrapped SOL account
    #[account(
        mut,
        constraint = treasury_wsol_account.owner == treasury.key(),
        constraint = treasury_wsol_account.mint == wsol_mint.key()
    )]
    pub treasury_wsol_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: validated by loopscale program
    #[account(mut)]
    pub strategy_wsol_account: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,

    /// CHECK: validated by loopscale program
    pub event_authority: AccountInfo<'info>,

    /// CHECK: validated by loopscale program
    pub loopscale_program: AccountInfo<'info>,
}

pub fn lend_treasury_sol(ctx: Context<LendTreasurySol>, amount: u64) -> Result<()> {
    // verify the treasury has enough native SOL
    require!(
        ctx.accounts.treasury.to_account_info().lamports() >= amount,
        ErrorCode::InsufficientTreasuryBalance
    );

    // verify amount is not zero
    require!(amount > 0, ErrorCode::InvalidAmount);

    // create CPI context for loopscale deposit
    let cpi_accounts = CreateStrategy {
        payer: ctx.accounts.authority.to_account_info(),
        manager: ctx.accounts.authority.to_account_info(),
        strategy: ctx.accounts.loopscale_strategy.to_account_info(),
        principal_mint: ctx.accounts.wsol_mint.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        event_authority: ctx.accounts.event_authority.to_account_info(),
        program: ctx.accounts.loopscale_program.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.loopscale_program.to_account_info(),
        cpi_accounts,
    );

    // create strategy params
    let strategy_params = CreateStrategyParams {
        lender: ctx.accounts.treasury.key(),
        origination_cap: amount,
        liquidity_buffer: 0, // no buffer needed for treasury lending
        interest_fee: 0, // no fee for treasury lending
        origination_fee: 0, // no origination fee
        principal_fee: 0, // no principal fee
        originations_enabled: true,
        external_yield_source_args: None,
    };

    // create the strategy
    create_strategy(cpi_ctx, strategy_params)?;

    // convert native SOL to WSOL
    let seeds = &[
        b"treasury".as_ref(),
        &[ctx.accounts.treasury.bump],
    ];
    let signer = &[&seeds[..]];

    // verify WSOL mint is valid
    require!(
        ctx.accounts.wsol_mint.key() == anchor_spl::token::spl_token::native_mint::ID,
        ErrorCode::InvalidMint
    );

    // verify treasury WSOL account exists and is valid
    if ctx.accounts.treasury_wsol_account.to_account_info().owner != &anchor_spl::token::ID {
        // create WSOL account if it doesn't exist
        let create_ata_accounts = anchor_spl::associated_token::Create {
            payer: ctx.accounts.treasury.to_account_info(),
            associated_token: ctx.accounts.treasury_wsol_account.to_account_info(),
            authority: ctx.accounts.treasury.to_account_info(),
            mint: ctx.accounts.wsol_mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.associated_token_program.to_account_info(),
            create_ata_accounts,
            signer,
        );

        anchor_spl::associated_token::create(cpi_ctx)?;
    }

    // mint WSOL to treasury's WSOL account
    let mint_to_accounts = anchor_spl::token::MintTo {
        mint: ctx.accounts.wsol_mint.to_account_info(),
        to: ctx.accounts.treasury_wsol_account.to_account_info(),
        authority: ctx.accounts.treasury.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        mint_to_accounts,
        signer,
    );

    // verify mint was successful
    let pre_balance = ctx.accounts.treasury_wsol_account.amount;
    mint_to(cpi_ctx, amount)?;
    let post_balance = ctx.accounts.treasury_wsol_account.amount;
    require!(
        post_balance == pre_balance + amount,
        ErrorCode::MintFailed
    );

    // transfer WSOL to strategy
    let transfer_accounts = anchor_spl::token::Transfer {
        from: ctx.accounts.treasury_wsol_account.to_account_info(),
        to: ctx.accounts.strategy_wsol_account.to_account_info(),
        authority: ctx.accounts.treasury.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_accounts,
        signer,
    );

    // verify transfer was successful
    let pre_transfer_balance = ctx.accounts.treasury_wsol_account.amount;
    anchor_spl::token::transfer(cpi_ctx, amount)?;
    let post_transfer_balance = ctx.accounts.treasury_wsol_account.amount;
    require!(
        post_transfer_balance == pre_transfer_balance - amount,
        ErrorCode::TransferFailed
    );

    Ok(())
}

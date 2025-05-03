use anchor_lang::{prelude::*, system_program};
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{mint_to, Mint, MintTo, Token2022, TokenAccount},
};

use crate::state::{Config, Treasury};

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    /// CHECK: using SystemAccount for direct SOL transfer.
    #[account(mut)]
    pub depositor_sol_account: SystemAccount<'info>,

    // depositor's CN ATA (initialized if needed)
    #[account(
        init_if_needed,
        payer = depositor,
        associated_token::mint = cn_mint,
        associated_token::authority = depositor,
        token::token_program = token_program, // specify token program for ATA? or token 2022?
    )]
    pub depositor_cn_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [Config::SEED_PREFIX],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.treasury_bump,
    )]
    pub treasury: Account<'info, Treasury>,

    // mints (checked against config)
    #[account(
        mut,
        address = config.cn_mint @ DepositError::AddressMismatch
    )]
    pub cn_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        address = config.pt_mint @ DepositError::AddressMismatch
    )]
    pub pt_mint: InterfaceAccount<'info, Mint>,

    // protocol's PT ATA
    #[account(
        init_if_needed,
        payer = depositor,
        associated_token::mint = pt_mint,
        associated_token::authority = config, // config PDA owns the protocol's PT ATA
        token::token_program = token_program, // specify token program for ATA
    )]
    pub protocol_pt_ata: InterfaceAccount<'info, TokenAccount>,

    // programs
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>, // needed for init_if_needed
}

impl<'info> Deposit<'info> {
    pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // check locks first
        require!(!ctx.accounts.config.locked, DepositError::ProtocolLocked);
        require!(!ctx.accounts.config.deposit_locked, DepositError::DepositsLocked);

        require!(amount > 0, DepositError::ZeroAmount);

        // 1. transfer SOL depositor -> treasury
        let transfer_accounts = system_program::Transfer {
            from: ctx.accounts.depositor_sol_account.to_account_info(),
            to: ctx.accounts.treasury.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            transfer_accounts,
        );
        system_program::transfer(cpi_ctx, amount)?;
        msg!("transferred {} SOL to treasury vault", amount);

        // calculate nav and determine tokens to mint
        let nav = ctx.accounts.treasury.calculate_nav()?;
        // todo: add precision handling here. for now, nav=1 so amount/nav = amount
        let tokens_to_mint = amount.checked_div(nav).ok_or(ProgramError::ArithmeticOverflow)?; // placeholder calculation
        msg!("calculated nav: {}, tokens_to_mint: {}", nav, tokens_to_mint);

        // prepare PDA signer seeds using helper
        let bump_seed = [ctx.accounts.config.bump];
        let config_seeds_with_bump = Config::get_seeds_with_bump(&bump_seed);
        let signer_seeds = &[&config_seeds_with_bump[..]];

        // 2. mint CN tokens -> depositor_cn_ata
        let cpi_accounts_cn = MintTo {
            mint: ctx.accounts.cn_mint.to_account_info(),
            to: ctx.accounts.depositor_cn_ata.to_account_info(),
            authority: ctx.accounts.config.to_account_info(),
        };
        let cpi_ctx_cn = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_cn,
            signer_seeds,
        );
        mint_to(cpi_ctx_cn, tokens_to_mint)?;
        msg!("minted {} CN tokens to depositor", tokens_to_mint);

        // 3. mint PT tokens -> protocol_pt_ata
        let cpi_accounts_pt = MintTo {
            mint: ctx.accounts.pt_mint.to_account_info(),
            to: ctx.accounts.protocol_pt_ata.to_account_info(),
            authority: ctx.accounts.config.to_account_info(),
        };
        let cpi_ctx_pt = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_pt,
            signer_seeds,
        );
        mint_to(cpi_ctx_pt, tokens_to_mint)?;
        msg!("minted {} PT tokens to protocol ATA", tokens_to_mint);

        // TODO: mint an nft and verify the collection

        // createUpdateFieldInstruction({
        //     programId: TOKEN_2022_PROGRAM_ID,
        //     metadata: childMint,
        //     updateAuthority: authorityPDA, // Your PDA signs this
        //     field: 'collection_verified',
        //     value: 'true'
        //   });

        // update treasury state to track total sol deposits
        let treasury = &mut ctx.accounts.treasury;
        treasury.total_deposited_sol = treasury.total_deposited_sol.checked_add(amount).ok_or(ProgramError::ArithmeticOverflow)?;

        Ok(())
    }
}

#[error_code]
pub enum DepositError {
    #[msg("deposit amount must be greater than zero.")]
    ZeroAmount,
    #[msg("account address mismatch.")]
    AddressMismatch,
    #[msg("protocol is locked.")]
    ProtocolLocked,
    #[msg("deposits are currently locked.")]
    DepositsLocked,
}
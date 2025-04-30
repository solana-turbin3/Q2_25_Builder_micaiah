use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        burn, transfer_checked, Burn, Mint, Token2022, TokenAccount, TransferChecked,
    },
    metadata::Metadata as MetaplexMetadataProgram,
};
use mpl_token_metadata::instructions::BurnV1CpiBuilder; // using BurnV1 for pNFTs

use crate::state::{Config, OptionData}; // assuming treasury state is not needed directly here yet

#[derive(Accounts)]
pub struct Convert<'info> {
    #[account(mut)]
    pub converter: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = cn_mint,
        associated_token::authority = converter,
    )]
    pub converter_cn_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = nft_mint, // the specific NFT being burned
        associated_token::authority = converter,
        token::token_program = token_program, // specify token program
    )]
    pub converter_option_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed, // initialize user's PT ATA if they don't have one
        payer = converter,
        associated_token::mint = pt_mint,
        associated_token::authority = converter,
        token::token_program = token_program,
    )]
    pub converter_pt_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [Config::SEED_PREFIX], // use constant for seed
        bump = config.bump, // use correct field name
    )]
    pub config: Account<'info, Config>,

    // protocol's PT holding ATA (source for transfer)
    #[account(
        mut,
        associated_token::mint = pt_mint,
        associated_token::authority = config, // owned by config PDA
        token::token_program = token_program, // specify token program
    )]
    pub protocol_pt_ata: InterfaceAccount<'info, TokenAccount>,

    // mints
    #[account(
        mut, // still needs mut for burn
        address = config.cn_mint @ ConvertError::AddressMismatch
    )]
    pub cn_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        address = config.pt_mint @ ConvertError::AddressMismatch
    )]
    pub pt_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut, // needs to be mutable for Metaplex BurnV1 CPI
        token::token_program = token_program,
    )]
    pub nft_mint: InterfaceAccount<'info, Mint>,

    // option data PDA (linked to the NFT mint)
    #[account(
        mut,
        seeds = [OptionData::SEED_PREFIX, nft_mint.key().as_ref()], // use constant for seed
        bump = option_data.bump,
        close = converter // close account and return rent to the converter
    )]
    pub option_data: Account<'info, OptionData>,

    // Metaplex accounts needed for BurnV1
    /// CHECK: checked by Metaplex CPI. PDA derived from nft_mint.
    #[account(mut)]
    pub nft_metadata: UncheckedAccount<'info>,
    /// CHECK: checked by Metaplex CPI. PDA derived from nft_mint.
    #[account(mut)]
    pub nft_master_edition: UncheckedAccount<'info>,
    /// CHECK: checked by Metaplex CPI. PDA derived from collection_mint.
    #[account(mut)]
    pub collection_metadata: UncheckedAccount<'info>, // required for BurnV1

    // programs
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub metadata_program: Program<'info, MetaplexMetadataProgram>,
    /// CHECK: required by Metaplex
    pub sysvar_instructions: UncheckedAccount<'info>,
    pub rent: Sysvar<'info, Rent>, // needed for init_if_needed
}

impl<'info> Convert<'info> {
    pub fn handler(ctx: Context<Convert>) -> Result<()> {
        // check locks first
        require!(!ctx.accounts.config.locked, ConvertError::ProtocolLocked);
        require!(!ctx.accounts.config.convert_locked, ConvertError::ConversionsLocked);

        // get clock and check expiration
        let clock = Clock::get()?;
        let option_data = &ctx.accounts.option_data;
        require!(
            !option_data.is_expired(clock.unix_timestamp),
            ConvertError::OptionExpired
        );

        // get amount from option data
        let amount_to_process = option_data.amount;
        require!(amount_to_process > 0, ConvertError::InvalidOptionData); // ensure amount is valid

        msg!(
            "attempting to convert option NFT {} for {} tokens (amount/expiration: {}/{})",
            ctx.accounts.nft_mint.key(),
            amount_to_process,
            option_data.amount,
            option_data.expiration
        );

        // 1. burn CN tokens from converter's ATA
        let burn_cn_accounts = Burn {
            mint: ctx.accounts.cn_mint.to_account_info(),
            from: ctx.accounts.converter_cn_ata.to_account_info(),
            authority: ctx.accounts.converter.to_account_info(),
        };
        let burn_cn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            burn_cn_accounts,
        );
        burn(burn_cn_ctx, amount_to_process)?;
        msg!("burned {} CN tokens", amount_to_process);

        // prepare PDA signer seeds for PT transfer using helper and longer-lived binding
        let bump_seed = [ctx.accounts.config.bump];
        let config_seeds_with_bump = Config::get_seeds_with_bump(&bump_seed);
        let signer_seeds = &[&config_seeds_with_bump[..]];

        // 2. burn the NFT Option using Metaplex BurnV1
        // pass raw AccountInfo where needed by Metaplex CPI builder
        BurnV1CpiBuilder::new(&ctx.accounts.metadata_program.to_account_info()) // pass AccountInfo
            .authority(&ctx.accounts.converter.to_account_info()) // the owner burning the token
            .collection_metadata(Some(&ctx.accounts.collection_metadata.to_account_info())) // required for pNFT burn
            .metadata(&ctx.accounts.nft_metadata.to_account_info())
            .edition(Some(&ctx.accounts.nft_master_edition.to_account_info()))
            .mint(&ctx.accounts.nft_mint.to_account_info())
            .token(&ctx.accounts.converter_option_ata.to_account_info()) // the ATA holding the token to burn
            .spl_token_program(&ctx.accounts.token_program.to_account_info())
            .invoke() // invoke without signer seeds, converter signs
            .map_err(|e| {
                msg!("error burning nft: {:?}", e);
                ProgramError::from(e) // map metaplex error to program error
            })?;
        msg!("burned NFT Option {}", ctx.accounts.nft_mint.key());


        // 3. transfer PT tokens from Protocol ATA to converter's ATA
        let transfer_pt_accounts = TransferChecked {
            from: ctx.accounts.protocol_pt_ata.to_account_info(),
            to: ctx.accounts.converter_pt_ata.to_account_info(),
            authority: ctx.accounts.config.to_account_info(), // Config PDA is the authority over protocol_pt_ata
            mint: ctx.accounts.pt_mint.to_account_info(), // mint required for transfer_checked
        };
        let transfer_pt_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_pt_accounts,
            signer_seeds, // sign with config PDA seeds
        );
        transfer_checked(
            transfer_pt_ctx,
            amount_to_process, // transfer the same amount as CN burned
            ctx.accounts.pt_mint.decimals, // decimals needed for transfer_checked
        )?;
        msg!(
            "transferred {} PT tokens from protocol to converter",
            amount_to_process
        );

        // 4. close the OptionData account (handled by `close = converter` constraint)
        msg!("closed OptionData account {}", ctx.accounts.option_data.key());

        Ok(())
    }
}

#[error_code]
pub enum ConvertError {
    #[msg("invalid OptionData account or amount.")]
    InvalidOptionData,
    #[msg("insufficient CN token balance.")]
    InsufficientCnBalance,
    #[msg("account address mismatch.")]
    AddressMismatch,
    #[msg("protocol is locked.")]
    ProtocolLocked,
    #[msg("conversions are currently locked.")]
    ConversionsLocked,
    #[msg("option has expired.")]
    OptionExpired,
}
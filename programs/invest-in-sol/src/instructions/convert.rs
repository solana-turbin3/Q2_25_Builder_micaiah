use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        burn, transfer_checked, Burn, Mint, Token2022, TokenAccount, TransferChecked,
    }, // Removed mint_to, MintTo; Added transfer_checked, TransferChecked
    metadata::Metadata as MetaplexMetadataProgram,
};
use mpl_token_metadata::instructions::BurnV1CpiBuilder; // Using BurnV1 for pNFTs

use crate::state::{Config, OptionData}; // assuming Treasury state is not needed directly here yet

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
        seeds = [b"config"],
        bump = config.config_bump,
    )]
    pub config: Account<'info, Config>,

    // protocol's PT Holding ATA (source for transfer)
    #[account(
        mut,
        associated_token::mint = pt_mint,
        associated_token::authority = config, // owned by Config PDA
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

    // option Data PDA (linked to the NFT mint)
    #[account(
        mut,
        seeds = [b"option_data", nft_mint.key().as_ref()],
        bump = option_data.bump,
        close = converter // close account and return rent to the converter
    )]
    pub option_data: Account<'info, OptionData>,

    // metaplex accounts needed for BurnV1
    /// CHECK: Checked by Metaplex CPI. PDA derived from nft_mint.
    #[account(mut)]
    pub nft_metadata: UncheckedAccount<'info>,
    /// CHECK: Checked by Metaplex CPI. PDA derived from nft_mint.
    #[account(mut)]
    pub nft_master_edition: UncheckedAccount<'info>,
    /// CHECK: Checked by Metaplex CPI. PDA derived from collection_mint.
    #[account(mut)]
    pub collection_metadata: UncheckedAccount<'info>, // required for BurnV1

    // programs
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub metadata_program: Program<'info, MetaplexMetadataProgram>,
    /// CHECK: Required by Metaplex
    pub sysvar_instructions: UncheckedAccount<'info>,
    pub rent: Sysvar<'info, Rent>, // needed for init_if_needed
}

impl<'info> Convert<'info> {
    pub fn handler(ctx: Context<Convert>) -> Result<()> {
        // check locks first
        require!(!ctx.accounts.config.locked, ConvertError::ProtocolLocked);
        require!(!ctx.accounts.config.convert_locked, ConvertError::ConversionsLocked);

        let num_of_cn_to_burn = ctx.accounts.option_data.num_of_cn;
        require!(num_of_cn_to_burn > 0, ConvertError::InvalidOptionData);

        msg!(
            "attempting to convert option NFT {} for {} CN tokens",
            ctx.accounts.nft_mint.key(),
            num_of_cn_to_burn
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
        burn(burn_cn_ctx, num_of_cn_to_burn)?;
        msg!("burned {} CN tokens", num_of_cn_to_burn);

        // prepare PDA signer seeds for minting PT
        let config_seeds = &[&b"config"[..], &[ctx.accounts.config.config_bump]];
        let signer_seeds = &[&config_seeds[..]];

        // 2. burn the NFT Option using Metaplex BurnV1
        // BurnV1 requires the owner (converter) to sign, and potentially the collection metadata authority if rules apply.
        // we are burning the token from the converter's ATA.
        // pass raw AccountInfo where needed by Metaplex CPI builder
        // BurnV1CpiBuilder::new(&ctx.accounts.metadata_program.to_account_info()) // pass AccountInfo
        //     .authority(&ctx.accounts.converter.to_account_info()) // the owner burning the token
        //     .collection_metadata(Some(&ctx.accounts.collection_metadata.to_account_info())) // required for pNFT burn
        //     .metadata(&ctx.accounts.nft_metadata.to_account_info())
        //     .edition(Some(&ctx.accounts.nft_master_edition.to_account_info()))
        //     .mint(&ctx.accounts.nft_mint.to_account_info())
        //     .token(&ctx.accounts.converter_option_ata.to_account_info()) // the ATA holding the token to burn
        //     // .master_edition_mint(Some(&ctx.accounts.collection_mint.to_account_info())) // not typically needed for burning instance
        //     // .master_edition_token_account(None) // not typically needed for burning instance
        //     .spl_token_program(&ctx.accounts.token_program.to_account_info())
        //     .invoke()?; // let's see if '?' works now, otherwise map error
        // msg!("burned NFT Option {}", ctx.accounts.nft_mint.key());


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
            num_of_cn_to_burn, // transfer the same amount as CN burned
            ctx.accounts.pt_mint.decimals, // decimals needed for transfer_checked
        )?;
        msg!(
            "transferred {} PT tokens from protocol to converter",
            num_of_cn_to_burn
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
    #[msg("insufficient CN token balance.")] // anchor automatically checks this via ATA constraints usually
    InsufficientCnBalance,
    #[msg("account address mismatch.")]
    AddressMismatch,
    #[msg("protocol is locked.")]
    ProtocolLocked,
    #[msg("conversions are currently locked.")]
    ConversionsLocked,
}
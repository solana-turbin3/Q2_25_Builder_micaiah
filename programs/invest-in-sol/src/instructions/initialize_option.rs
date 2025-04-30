use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, set_and_verify_sized_collection_item, // added for collection verification
        CreateMetadataAccountsV3, SetAndVerifySizedCollectionItem, // added for collection verification
    },
    token_interface::{mint_to, Mint, MintTo, Token2022, TokenAccount},
};
// import specific MPL types and ID
use mpl_token_metadata::{
    accounts::{MasterEdition, Metadata}, // import account types for PDA derivation
    types::{Creator, DataV2},
    ID as MPL_TOKEN_METADATA_ID,
};

use crate::state::{Config, OptionData};

// instruction accounts
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct InitializeOption<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut, // needs mut to increment option_count
        seeds = [Config::SEED_PREFIX],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = payer,
        mint::decimals = 0, // NFTs have 0 decimals
        mint::authority = config, // PDA is mint authority
        mint::freeze_authority = config, // PDA is freeze authority
        token::token_program = token_program, // specify token program
    )]
    pub option_mint: InterfaceAccount<'info, Mint>, // use interfaceaccount for token2022

    #[account(
        init_if_needed, // initialize ATA if it doesn't exist
        payer = payer,
        associated_token::mint = option_mint,
        associated_token::authority = payer, // user owns the ATA
        token::token_program = token_program, // specify token program
    )]
    pub user_option_ata: InterfaceAccount<'info, TokenAccount>, // use interfaceaccount for token2022

    /// CHECK: checked via CPI to token metadata program
    #[account(
        mut,
        address = Metadata::find_pda(&option_mint.key()).0 @ ErrorCode::AddressMismatch, // use imported metadata account type
    )]
    pub metadata_account: UncheckedAccount<'info>,

    // --- collection accounts ---
    /// CHECK: checked in constraints and CPI
    #[account(
        address = config.collection_mint @ ErrorCode::AddressMismatch,
    )]
    pub collection_mint: UncheckedAccount<'info>, // read-only, just need the key

    /// CHECK: checked in constraints and CPI
    #[account(
        mut, // verification might change collection metadata account (e.g., size)
        address = Metadata::find_pda(&collection_mint.key()).0 @ ErrorCode::AddressMismatch,
    )]
    pub collection_metadata: UncheckedAccount<'info>,

    /// CHECK: checked in constraints and CPI
    #[account(
        address = MasterEdition::find_pda(&collection_mint.key()).0 @ ErrorCode::AddressMismatch,
    )]
    pub collection_master_edition: UncheckedAccount<'info>,

    // --- option data PDA ---
    #[account(
        init,
        payer = payer,
        space = 8 + OptionData::INIT_SPACE,
        seeds = [OptionData::SEED_PREFIX, option_mint.key().as_ref()],
        bump
    )]
    pub option_data: Account<'info, OptionData>,

    // programs
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: address checked
    #[account(address = MPL_TOKEN_METADATA_ID)]
    pub token_metadata_program: UncheckedAccount<'info>,
}

impl<'info> InitializeOption<'info> {
    pub fn handler(ctx: Context<InitializeOption>, amount: u64) -> Result<()> {
        let config_bump = ctx.accounts.config.bump;
        let option_duration = ctx.accounts.config.option_duration;
        let option_count = ctx.accounts.config.option_count;
        let config_key = ctx.accounts.config.key();

        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;
        let expiration = current_timestamp
            .checked_add(option_duration as i64)
            .ok_or(ErrorCode::Overflow)?;

        // format the metadata uri
        let uri = format!(
            "https://metadata.zephyr.haus/metadata/{}/{}",
            amount, expiration
        );

        // PDA seeds using helper and longer-lived binding for bump
        let bump_seed = [config_bump];
        let config_seeds_with_bump = Config::get_seeds_with_bump(&bump_seed);
        let signer_seeds = &[&config_seeds_with_bump[..]];

        // 1. mint the NFT
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.option_mint.to_account_info(),
                    to: ctx.accounts.user_option_ata.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer_seeds,
            ),
            1, // mint 1 NFT
        )?;

        // 2. create metadata account
        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.metadata_account.to_account_info(),
                    mint: ctx.accounts.option_mint.to_account_info(),
                    mint_authority: ctx.accounts.config.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    update_authority: ctx.accounts.config.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            DataV2 {
                name: format!("zOption"), // using the updated name
                symbol: "zOption".to_string(), // using the updated symbol
                uri,
                seller_fee_basis_points: 0,
                creators: Some(vec![Creator {
                    address: config_key,
                    verified: true,
                    share: 100,
                }]),
                collection: None,
                uses: None,
            },
            true, // is_mutable
            true, // update_authority_is_signer
            None, // collection details
        )?;

        // 3. set and verify collection item
        msg!("setting and verifying collection item");
        set_and_verify_sized_collection_item(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.to_account_info(),
                SetAndVerifySizedCollectionItem {
                    metadata: ctx.accounts.metadata_account.to_account_info(), // the metadata of the NFT being verified
                    collection_authority: ctx.accounts.config.to_account_info(), // the authority signing (update authority of the NFT)
                    payer: ctx.accounts.payer.to_account_info(), // payer for potential rent
                    update_authority: ctx.accounts.config.to_account_info(), // the NFT's update authority (often same as collection_authority)
                    collection_mint: ctx.accounts.collection_mint.to_account_info(), // the collection NFT's mint
                    collection_metadata: ctx.accounts.collection_metadata.to_account_info(), // the collection NFT's metadata account (corrected field name)
                    collection_master_edition: ctx.accounts.collection_master_edition.to_account_info(), // the collection NFT's master edition account (corrected field name)
                    // collection_authority_record: none, // optional: for pNFT delegate auth record
                },
                signer_seeds, // config PDA signs as update authority
            ),
            None, // collection_authority_record (pNFTs)
        )?;


        // 4. initialize the option data PDA
        let option_data = &mut ctx.accounts.option_data;
        option_data.mint = ctx.accounts.option_mint.key();
        option_data.owner = ctx.accounts.payer.key();
        option_data.amount = amount;
        option_data.expiration = expiration;
        option_data.bump = ctx.bumps.option_data;

        // 5. increment option count in config (mutable borrow here)
        ctx.accounts.config.option_count = option_count.checked_add(1).ok_or(ErrorCode::Overflow)?;

        msg!(
            "option nft initialized and added to collection. mint: {}, amount: {}, expiration: {}",
            ctx.accounts.option_mint.key(),
            amount,
            expiration
        );

        Ok(())
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("calculation overflow")]
    Overflow,
    #[msg("address mismatch")] // added
    AddressMismatch,
}
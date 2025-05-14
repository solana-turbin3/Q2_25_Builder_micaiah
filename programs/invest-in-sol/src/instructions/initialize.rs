use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{mint_to, Mint, MintTo, TokenAccount};
use mpl_token_metadata::{
    instructions::{CreateMasterEditionV3CpiBuilder, CreateMetadataAccountV3CpiBuilder},
    types::{Creator, DataV2},
    ID as MetadataID,
};

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
        init,
        payer = initializer,
        seeds = [b"collection_mint", config.key().as_ref()],
        bump,
        mint::token_program = token_program,
        mint::authority = config,
        mint::freeze_authority = config,
        mint::decimals = 0
    )]
    pub collection_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = initializer,
        associated_token::mint = collection_mint,
        associated_token::authority = config,
        token::token_program = token_program,
    )]
    pub collection_mint_ata: InterfaceAccount<'info, TokenAccount>,

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

    /// CHECK: This is the token metadata program
    #[account(address = MetadataID)]
    pub token_metadata_program: UncheckedAccount<'info>,

    /// CHECK: This account is initialized by the token metadata program
    #[account(
        mut,
        seeds = [
            b"metadata",
            token_metadata_program.key().as_ref(),
            collection_mint.key().as_ref(),
        ],
        bump,
        seeds::program = token_metadata_program.key()
    )]
    pub collection_metadata: UncheckedAccount<'info>,

    /// CHECK: This account is initialized by the token metadata program
    #[account(
        mut,
        seeds = [
            b"metadata",
            token_metadata_program.key().as_ref(),
            collection_mint.key().as_ref(),
            b"edition",
        ],
        bump,
        seeds::program = token_metadata_program.key()
    )]
    pub collection_master_edition: UncheckedAccount<'info>,

    // --- programs ---
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

impl<'info> Initialize<'info> {
    // update handler signature
    pub fn handler(ctx: &mut Context<Initialize>) -> Result<()> {
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

        Initialize::create_collection(ctx)?;
        Ok(())
    }

    pub fn create_collection(ctx: &mut Context<Initialize>) -> Result<()> {
        let config_bump = ctx.accounts.config.bump;
        let bump_seed = [config_bump];
        let config_seeds = Config::get_seeds_with_bump(&bump_seed);

        // create metadata with collection details
        let collection_data = DataV2 {
            name: "zOption".to_string(),
            symbol: "zOption".to_string(),
            uri: "https://metadata.zephyr.haus/collection".to_string(),
            seller_fee_basis_points: 0,
            creators: Some(vec![Creator {
                address: ctx.accounts.config.key(),
                verified: true,
                share: 100,
            }]),
            collection: None,
            uses: None,
        };

        let mint_to_accounts = MintTo {
            mint: ctx.accounts.collection_mint.to_account_info(),
            to: ctx.accounts.collection_mint_ata.to_account_info(),
            authority: ctx.accounts.config.to_account_info(),
        };
        let seeds = &[&config_seeds[..]];
        let mint_to_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            mint_to_accounts,
            &seeds[..],
        );
        mint_to(mint_to_ctx, 1)?;

        // invoke the create metadata instruction
        CreateMetadataAccountV3CpiBuilder::new(
            &ctx.accounts.token_metadata_program.to_account_info(),
        )
        .metadata(&ctx.accounts.collection_metadata.to_account_info())
        .mint(&ctx.accounts.collection_mint.to_account_info())
        .mint_authority(&ctx.accounts.config.to_account_info())
        .payer(&ctx.accounts.initializer.to_account_info())
        .update_authority(&ctx.accounts.config.to_account_info(), true)
        .system_program(&ctx.accounts.system_program.to_account_info())
        .data(collection_data.clone())
        .is_mutable(true)
        .collection_details(mpl_token_metadata::types::CollectionDetails::V1 { size: 0 })
        .invoke_signed(&[&config_seeds[..]])?;

        // create master edition for the collection NFT
        CreateMasterEditionV3CpiBuilder::new(
            &ctx.accounts.token_metadata_program.to_account_info(),
        )
        .edition(&ctx.accounts.collection_master_edition.to_account_info())
        .mint(&ctx.accounts.collection_mint.to_account_info())
        .update_authority(&ctx.accounts.config.to_account_info())
        .mint_authority(&ctx.accounts.config.to_account_info())
        .payer(&ctx.accounts.initializer.to_account_info())
        .metadata(&ctx.accounts.collection_metadata.to_account_info())
        .system_program(&ctx.accounts.system_program.to_account_info())
        .token_program(&ctx.accounts.token_program.to_account_info())
        // .rent(&ctx.accounts.rent.to_account_info())
        .max_supply(1) // 1 for master editions NFTs
        .invoke_signed(&[&config_seeds[..]])?;

        Ok(())
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("calculation overflow")]
    Overflow,
    #[msg("address mismatch")]
    AddressMismatch,
    #[msg("already issued deposit receipt")]
    DepositReceiptIssued,
    #[msg("deposit receipt expired")]
    DepositReceiptExpired,
}

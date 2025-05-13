use anchor_lang::prelude::*;
use anchor_spl::token_2022::Token2022;
use anchor_spl::token_interface::Mint;
use mpl_token_metadata::{
    instructions::{CreateMasterEditionV3, CreateMetadataAccountV3},
    types::{Creator, DataV2},
};

use crate::state::{Config, Treasury};

#[derive(Accounts)]
#[instruction(option_duration: u32)] // add instruction argument
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

    /// CHECK: This account is initialized by the token metadata program
    #[account(mut)]
    pub collection_metadata: UncheckedAccount<'info>,

    /// CHECK: This account is initialized by the token metadata program
    #[account(mut)]
    pub collection_master_edition: UncheckedAccount<'info>,

    // --- programs ---
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token2022>,
}

impl<'info> Initialize<'info> {
    // update handler signature
    pub fn handler(ctx: Context<Initialize>, option_duration: u32) -> Result<()> {

        // initialize config PDA
        let config = &mut ctx.accounts.config;
        config.authority = Some(ctx.accounts.initializer.key());
        config.cn_mint = ctx.accounts.cn_mint.key();
        config.pt_mint = ctx.accounts.pt_mint.key();
        config.collection_mint = ctx.accounts.collection_mint.key();
        config.fee = None; // default to no fee
        config.option_duration = option_duration; // set from argument
        config.option_count = 0; // initialize count
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
        msg!("  Option Duration: {} seconds", config.option_duration);
        msg!("  authority: {}", config.authority.unwrap());

        Ok(())
    }

    pub fn create_collection(ctx: &mut Context<Initialize>) -> Result<()> {

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

        // invoke the create metadata instruction
        let create_metadata_account_ix = CreateMetadataAccountV3 {
            metadata: ctx.accounts.collection_metadata.key(),
            mint: ctx.accounts.collection_mint.key(),
            mint_authority: ctx.accounts.config.key(),
            payer: ctx.accounts.config.key(),
            update_authority: (ctx.accounts.config.key(), true),
            system_program: ctx.accounts.system_program.key(),
            rent: None,
        }
        .instruction(
            mpl_token_metadata::instructions::CreateMetadataAccountV3InstructionArgs {
                data: collection_data,
                is_mutable: true,
                collection_details: Some(mpl_token_metadata::types::CollectionDetails::V1 {
                    size: 0,
                }),
            },
        );

        solana_program::program::invoke_signed(
            &create_metadata_account_ix,
            &[
                ctx.accounts.collection_metadata.to_account_info(),
                ctx.accounts.collection_mint.to_account_info(),
                ctx.accounts.config.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[],
        )?;

        // create master edition for the collection NFT
        let master_edition_ix = CreateMasterEditionV3 {
            edition: ctx.accounts.collection_master_edition.key(),
            mint: ctx.accounts.collection_mint.key(),
            update_authority: ctx.accounts.config.key(),
            mint_authority: ctx.accounts.config.key(),
            payer: ctx.accounts.config.key(),
            metadata: ctx.accounts.collection_metadata.key(),
            token_program: ctx.accounts.token_program.key(),
            system_program: ctx.accounts.system_program.key(),
            rent: None,
        }
        .instruction(
            mpl_token_metadata::instructions::CreateMasterEditionV3InstructionArgs {
                max_supply: Some(0), // 0 for collection NFTs
            },
        );

        solana_program::program::invoke_signed(
            &master_edition_ix,
            &[
                ctx.accounts.collection_master_edition.to_account_info(),
                ctx.accounts.collection_mint.to_account_info(),
                ctx.accounts.config.to_account_info(),
                ctx.accounts.config.to_account_info(),
                ctx.accounts.config.to_account_info(),
                ctx.accounts.collection_metadata.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[],
        )?;

        Ok(())
    }
}

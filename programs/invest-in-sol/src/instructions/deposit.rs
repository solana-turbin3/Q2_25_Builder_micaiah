use anchor_lang::{prelude::*, system_program};
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        // create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
        Metadata as MetaplexMetadataProgram, // alias to avoid conflict with Account<'info, Metadata>
    },
    token_interface::{mint_to, Mint, MintTo, Token2022, TokenAccount},
};
// use the correct crate name based on your Cargo.toml for Metaplex
// use mpl_token_metadata::{
//     instructions::{CreateV1CpiBuilder, MintV1CpiBuilder, UpdateV1CpiBuilder},
//     types::{Collection, CollectionDetails, Creator, PrintSupply, TokenStandard, UseMethod, Uses},
// };


use crate::state::{Config, Treasury, OptionData};

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    /// CHECK: Can be SystemAccount or ATA, checked in handler logic if needed. Using SystemAccount for direct SOL transfer.
    #[account(mut)]
    pub depositor_sol_account: SystemAccount<'info>,

    #[account(
        init_if_needed,
        payer = depositor,
        associated_token::mint = cn_mint,
        associated_token::authority = depositor,
        token::token_program = token_program, // specify token program for ATA
    )]
    pub depositor_cn_ata: InterfaceAccount<'info, TokenAccount>,

    // NFT accounts (mint needs to be defined before ATA that uses it)
    #[account(
        init,
        payer = depositor,
        mint::decimals = 0,
        mint::authority = config, // Config PDA is mint authority for the NFT
        mint::freeze_authority = config,
        mint::token_program = token_program,
    )]
    pub nft_mint: InterfaceAccount<'info, Mint>,

    // ATA for the NFT Option
    #[account(
        init_if_needed,
        payer = depositor,
        associated_token::mint = nft_mint, // the mint created in this instruction
        associated_token::authority = depositor,
        token::token_program = token_program, // specify token program for ATA
    )]
    pub depositor_option_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [b"config"],
        bump = config.config_bump,
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

    #[account(
        address = config.collection_mint @ DepositError::AddressMismatch
    )]
    pub collection_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: Checked by Metaplex CPIs. PDA derived from collection_mint.
    #[account(mut)]
    pub collection_metadata: UncheckedAccount<'info>,
    /// CHECK: Checked by Metaplex CPIs. PDA derived from collection_mint.
    #[account(mut)]
    pub collection_master_edition: UncheckedAccount<'info>,

    /// CHECK: Checked by Metaplex CPI. PDA derived from nft_mint.
    #[account(mut)]
    pub nft_metadata: UncheckedAccount<'info>,
    /// CHECK: Checked by Metaplex CPI. PDA derived from nft_mint.
    #[account(mut)]
    pub nft_master_edition: UncheckedAccount<'info>,

    // PDA to store custom option data
    #[account(
        init,
        payer = depositor,
        seeds = [b"option_data", nft_mint.key().as_ref()],
        bump,
        space = 8 + OptionData::INIT_SPACE
    )]
    pub option_data: Account<'info, OptionData>,

    // protocol's PT ATA
    #[account(
        init_if_needed,
        payer = depositor,
        associated_token::mint = pt_mint,
        associated_token::authority = config, // Config PDA owns the protocol's PT ATA
        token::token_program = token_program, // specify token program for ATA
    )]
    pub protocol_pt_ata: InterfaceAccount<'info, TokenAccount>,

    // programs
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub metadata_program: Program<'info, MetaplexMetadataProgram>,
    /// CHECK: Required by Metaplex
    pub sysvar_instructions: UncheckedAccount<'info>,
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

        // prepare PDA signer seeds
        let config_seeds = &[&b"config"[..], &[ctx.accounts.config.config_bump]];
        let signer_seeds = &[&config_seeds[..]];

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
        mint_to(cpi_ctx_cn, amount)?;
        msg!("minted {} CN tokens to depositor", amount);

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
        mint_to(cpi_ctx_pt, amount)?;
        msg!("minted {} PT tokens to protocol ATA", amount);

        // todo: implement NFT option
        // // 4. mint NFT Option (pNFT) using Metaplex MintV1
        // // we need to build the CPI call carefully.
        // // assuming the collection metadata/master edition already exist.
        // // creator expects raw Pubkey, dereference Anchor Pubkey
        // let creators = vec![Creator {
        //     address: *ctx.accounts.config.to_account_info().key, // Config PDA is a creator
        //     verified: true, // verified because it's signing (PDA)
        //     share: 100,
        // }];

        // // note: MintV1 requires the metadata and master edition accounts to be passed,
        // // but it *creates* them as part of the CPI.
        // // the authority needs to be the update authority of the collection metadata.
        // // pass raw AccountInfo where needed by Metaplex CPI builder.
        // MintV1CpiBuilder::new(&ctx.accounts.metadata_program.to_account_info()) // pass AccountInfo
        //     .token(&ctx.accounts.depositor_option_ata.to_account_info()) // the ATA to mint to
        //     .token_owner(Some(&ctx.accounts.depositor.to_account_info())) // pass AccountInfo of owner
        //     .metadata(&ctx.accounts.nft_metadata.to_account_info()) // NFT's metadata account (to be created)
        //     .master_edition(Some(&ctx.accounts.nft_master_edition.to_account_info())) // NFT's master edition account (to be created)
        //     .mint(&ctx.accounts.nft_mint.to_account_info()) // the NFT mint account itself (already initialized)
        //     .payer(&ctx.accounts.depositor.to_account_info()) // payer for account creation
        //     .authority(&ctx.accounts.config.to_account_info()) // authority signing (Config PDA - must be update authority of collection)
        //     .system_program(&ctx.accounts.system_program.to_account_info())
        //     .sysvar_instructions(&ctx.accounts.sysvar_instructions.to_account_info())
        //     .spl_token_program(&ctx.accounts.token_program.to_account_info())
        //     .spl_ata_program(Some(&ctx.accounts.associated_token_program.to_account_info()))
        //     // --- NFT details ---
        //     .amount(1) // minting a single NFT
        //     // .token_standard(TokenStandard::ProgrammableNonFungible) // likely not present/needed in older MPL version
        //     // --- collection details ---
        //     // these are needed to link the new pNFT to the existing collection
        //     .collection_mint(&ctx.accounts.collection_mint.to_account_info())
        //     .collection_metadata(&ctx.accounts.collection_metadata.to_account_info())
        //     .collection_master_edition(Some(&ctx.accounts.collection_master_edition.to_account_info()))
        //     // this authority needs to be the update authority of the *collection* metadata account
        //     .authority_pda_signer(Some(&ctx.accounts.config.to_account_info()))
        //     .invoke_signed(signer_seeds)?; // let's see if '?' works now, otherwise map error

        msg!("todo: mint NFT Option to depositor");


        // 5. initialize OptionData PDA
        let option_data = &mut ctx.accounts.option_data;
        option_data.num_of_cn = amount;
        option_data.bump = ctx.bumps.option_data;
        msg!("initialized OptionData PDA for NFT with num_of_cn: {}", amount);

        // update Treasury state to track total deposits
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
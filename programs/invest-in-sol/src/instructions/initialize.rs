use anchor_lang::prelude::*;
use anchor_spl::metadata::mpl_token_metadata::accounts::MasterEdition;
use anchor_spl::metadata::mpl_token_metadata::accounts::Metadata as TokenMetadataAccount;
use anchor_spl::metadata::mpl_token_metadata::types::DataV2;
use anchor_spl::metadata::{
    create_master_edition_v3, create_metadata_accounts_v3, CreateMasterEditionV3,
    CreateMetadataAccountsV3, Metadata,
};
use anchor_spl::token_2022::Token2022;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount},
};

use mpl_token_metadata::instructions::CreateV1CpiBuilder;
use mpl_token_metadata::types::CollectionDetails;
use mpl_token_metadata::types::TokenStandard;
use solana_program::sysvar::instructions::Instructions;

use crate::state::Config;
use crate::state::Treasury;

// What do we initialize:
//    - Tokens (Convertible note and protocol token)
//    - NFT Collection
//    - A vault (config) pda: user facing actions
//        - Holds:
//            - PT
//            - Mint authority / Metadata authority for nfts
//    - A treasury pda: admin actions
//        - Holds:
//            - CN / PT token account references

pub const PROTOCOL_TOKEN_NAME: &str = "Zephyr Haus Protocol Token";
pub const PROTOCOL_TOKEN_SYMBOL: &str = "zHAUS";
pub const CONVERTIBLE_NOTE_NAME: &str = "Zephyr Haus Convertible Note";
pub const CONVERTIBLE_NOTE_SYMBOL: &str = "zCN";
pub const OPTIONS_NAME: &str = "Zephyr Haus Option NFT";
pub const OPTIONS_SYMBOL: &str = "ZHS";
pub const OPTIONS_URI: &str = "https://zephyr.haus/metadata.json";

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,

    // ******************** Convertible Note Accounts ********************
    #[account(
        init,
        payer = initializer,
        seeds = [b"cn", config.key().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = config,
        mint::token_program = token_program,
    )]
    pub cn_mint: InterfaceAccount<'info, Mint>,
    // #[account(
    //     init,
    //     payer = initializer,
    //     associated_token::mint = cn_mint,
    //     associated_token::authority = treasury,
    //     associated_token::token_program = token_program,
    // )]
    // pub treasury_cn_token_account: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: Metaplex metadata account, created by `initialize_cn_metadata` function
    #[account(mut)]
    pub cn_metadata: UncheckedAccount<'info>,

    // ******************** Protocol Token Accounts ********************
    #[account(
        init,
        payer = initializer,
        seeds = [b"pt", config.key().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = config,
        mint::token_program = token_program,
    )]
    pub pt_mint: InterfaceAccount<'info, Mint>,
    // #[account(
    //     init,
    //     payer = initializer,
    //     associated_token::mint = pt_mint,
    //     associated_token::authority = config,
    //     associated_token::token_program = token_program,
    // )]
    // pub config_pt_token_account: InterfaceAccount<'info, TokenAccount>,
    // #[account(
    //     init,
    //     payer = initializer,
    //     associated_token::mint = pt_mint,
    //     associated_token::authority = treasury,
    //     associated_token::token_program = token_program,
    // )]
    // pub treasury_pt_token_account: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: Metaplex metadata account, created by `initialize_pt_metadata` function
    #[account(mut)]
    pub pt_metadata: UncheckedAccount<'info>,

    // ******************** NFT Option Accounts ********************
    #[account(
        init,
        payer = initializer,
        seeds = [b"collection_mint", config.key().as_ref()],
        bump,
        mint::decimals = 0,
        mint::authority = config,
        mint::freeze_authority = config,
        mint::token_program = token_program,
    )]
    collection_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: Metaplex metadata account, created by `initialize_nft_metadata` function
    #[account(mut)]
    pub collection_metadata: UncheckedAccount<'info>,

    // /// CHECK: Metaplex master edition account, created by `initialize_nft_master_edition` function
    // #[account(mut)]
    // pub collection_master_edition: UncheckedAccount<'info>,

    // ******************** State Accounts ********************
    #[account(
        init,
        payer = initializer,
        seeds = [b"config"],
        bump,
        space = 8 + Config::INIT_SPACE
    )]
    pub config: Account<'info, Config>,
    // #[account(
    //     init,
    //     payer = initializer,
    //     seeds = [b"treasury"],
    //     bump,
    //     space = 8 + Treasury::INIT_SPACE
    // )]
    // pub treasury: Account<'info, Treasury>,

    // pub rent: Sysvar<'info, Rent>,
    /// CHECK: This is a system program account
    pub sysvar_instructions: UncheckedAccount<'info>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub metadata_program: Program<'info, Metadata>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    // pub fn initialize_states(
    //     &mut self,
    //     authority: Option<Pubkey>,
    //     bumps: InitializeBumps,
    // ) -> Result<()> {
    //     *self.config = Config {
    //         authority,
    //         cn_mint: self.cn_mint.key(),
    //         pt_mint: self.pt_mint.key(),
    //         collection_mint: self.collection_mint.key(),
    //         fee: None,
    //         locked: false,
    //         config_bump: bumps.config,
    //         pt_bump: bumps.pt_mint,
    //         cn_bump: bumps.cn_mint,
    //     };

    //     *self.treasury = Treasury {
    //         authority: Some(self.initializer.key()),
    //         treasury_bump: bumps.treasury,
    //     };

    //     Ok(())
    // }

    pub fn initialize_cn_metadata(&mut self, bumps: &InitializeBumps) -> Result<()> {
        msg!("Initializing CN Metadata");

        CreateV1CpiBuilder::new(&self.metadata_program.to_account_info())
            .mint(&self.cn_mint.to_account_info(), false)
            .metadata(&self.cn_metadata.to_account_info())
            .update_authority(&self.config.to_account_info(), true)
            .authority(&self.config.to_account_info())
            .payer(&self.initializer.to_account_info())
            .system_program(&self.system_program.to_account_info())
            .sysvar_instructions(&self.sysvar_instructions.to_account_info())
            .name(CONVERTIBLE_NOTE_NAME.to_string())
            .symbol(CONVERTIBLE_NOTE_SYMBOL.to_string())
            .uri("".into())
            .seller_fee_basis_points(0)
            .token_standard(TokenStandard::FungibleAsset)
            .add_remaining_accounts(&[(&self.config.to_account_info(), false, true)])
            .invoke_signed(&[&[b"config", &[bumps.config]]])?;
        Ok(())
    }

    pub fn initialize_pt_metadata(&mut self, bumps: &InitializeBumps) -> Result<()> {
        msg!("Initializing PT Metadata");
        CreateV1CpiBuilder::new(&self.metadata_program.to_account_info())
            .mint(&self.pt_mint.to_account_info(), false)
            .metadata(&self.pt_metadata.to_account_info())
            .update_authority(&self.config.to_account_info(), true)
            .authority(&self.config.to_account_info())
            .payer(&self.initializer.to_account_info())
            .system_program(&self.system_program.to_account_info())
            .sysvar_instructions(&self.sysvar_instructions.to_account_info())
            .name(PROTOCOL_TOKEN_NAME.to_string())
            .symbol(PROTOCOL_TOKEN_SYMBOL.to_string())
            .uri("".into())
            .seller_fee_basis_points(0)
            .token_standard(TokenStandard::FungibleAsset)
            .add_remaining_accounts(&[(&self.config.to_account_info(), false, true)])
            .invoke_signed(&[&[b"config", &[bumps.config]]])?;
        Ok(())
    }

    pub fn initialize_nft_metadata(&mut self, bumps: &InitializeBumps) -> Result<()> {
        msg!("Initializing NFT Metadata");

        CreateV1CpiBuilder::new(&self.metadata_program.to_account_info())
            .mint(&self.collection_mint.to_account_info(), false)
            .metadata(&self.collection_metadata.to_account_info())
            .update_authority(&self.config.to_account_info(), true)
            .authority(&self.config.to_account_info())
            .payer(&self.initializer.to_account_info())
            .system_program(&self.system_program.to_account_info())
            .sysvar_instructions(&self.sysvar_instructions.to_account_info())
            .name(OPTIONS_NAME.to_string())
            .symbol(OPTIONS_SYMBOL.to_string())
            .uri(OPTIONS_URI.to_string())
            .seller_fee_basis_points(0)
            .token_standard(TokenStandard::ProgrammableNonFungibleEdition)
            .collection_details(CollectionDetails::V1 { size: 0 })
            .add_remaining_accounts(&[(&self.config.to_account_info(), false, true)])
            .invoke_signed(&[&[b"config", &[bumps.config]]])?;
        Ok(())
    }

    // pub fn initialize_nft_master_edition(&mut self) -> Result<()> {
    //     let create_master_edition_accounts = CreateMasterEditionV3 {
    //         edition: self.collection_master_edition.to_account_info(),
    //         mint: self.collection_mint.to_account_info(),
    //         update_authority: self.config.to_account_info(),
    //         mint_authority: self.config.to_account_info(),
    //         payer: self.initializer.to_account_info(),
    //         metadata: self.collection_metadata.to_account_info(),
    //         token_program: self.token_program.to_account_info(),
    //         system_program: self.system_program.to_account_info(),
    //         rent: self.rent.to_account_info(),
    //     };

    //     let collection_mint_pubkey = self.collection_mint.key();
    //     let (_, collection_master_edition_bump) = MasterEdition::find_pda(&collection_mint_pubkey);
    //     let collection_master_edition_seeds = [
    //         MasterEdition::PREFIX.0,
    //         self.metadata_program.key.as_ref(),
    //         collection_mint_pubkey.as_ref(),
    //         MasterEdition::PREFIX.1,
    //         &[collection_master_edition_bump],
    //     ];
    //     let collection_master_edition_seeds = [&collection_master_edition_seeds[..]];

    //     let cpi = CpiContext::new_with_signer(
    //         self.token_program.to_account_info(),
    //         create_master_edition_accounts,
    //         &collection_master_edition_seeds,
    //     );
    //     let _ = create_master_edition_v3(cpi, None)?; // TODO: confirm the `None` on the max supply here
    //     Ok(())
    // }
}

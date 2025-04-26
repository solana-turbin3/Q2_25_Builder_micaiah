use anchor_lang::prelude::*;
use anchor_spl::metadata::Metadata;
use anchor_spl::token_2022::Token2022;
use anchor_spl::token_interface::Mint;

use mpl_token_metadata::instructions::CreateV1CpiBuilder;
use mpl_token_metadata::types::CollectionDetails;
use mpl_token_metadata::types::TokenStandard;

use crate::state::Config;

pub const PROTOCOL_TOKEN_NAME: &str = "ZephyrHaus Protocol Token";
pub const PROTOCOL_TOKEN_SYMBOL: &str = "zHAUS";
pub const CONVERTIBLE_NOTE_NAME: &str = "ZephyrHaus Convertible Note";
pub const CONVERTIBLE_NOTE_SYMBOL: &str = "zCN";
pub const OPTIONS_NAME: &str = "ZephyrHaus Option";
pub const OPTIONS_SYMBOL: &str = "ZHS";
// this is the base metadata containing image / website / socials / etc
// we will need to have custom metadta fields in addition to this which
// are stored on-chain in the metadata account. 
// example: expiration
pub const OPTIONS_URI: &str = "https://zephyr.haus/base-metadata.json";


// NOTE:
// -----
// tbf another thing we can do is create these outside of the program and 
// pass authority to the program after creation. it would then have the 
// ability to do what it needs to. there's no real reason to make them 
// here in hindsight. 


#[derive(Accounts)]
pub struct InitializeConvertibleNote<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,

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

    /// CHECK: this account is safe because:
    /// 1) it's only used as a target account for metaplex cpi call
    /// 2) the account will be created by metaplex
    /// 3) all validation is handled by metaplex
    #[account(mut)]
    pub cn_metadata: UncheckedAccount<'info>,

    #[account(
        init,
        payer = initializer,
        seeds = [b"config"],
        bump,
        space = 8 + Config::INIT_SPACE
    )]
    pub config: Account<'info, Config>,

    /// CHECK: this is a system sysvar account that is required by metaplex
    pub sysvar_instructions: UncheckedAccount<'info>,
    pub metadata_program: Program<'info, Metadata>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeProtocolToken<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,

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

    /// CHECK: this account is safe because:
    /// 1) it's only used as a target account for metaplex cpi call
    /// 2) the account will be created by metaplex
    /// 3) all validation is handled by metaplex
    #[account(mut)]
    pub pt_metadata: UncheckedAccount<'info>,

    #[account(
        init,
        payer = initializer,
        seeds = [b"config"],
        bump,
        space = 8 + Config::INIT_SPACE
    )]
    pub config: Account<'info, Config>,

    /// CHECK: this is a system sysvar account that is required by metaplex
    pub sysvar_instructions: UncheckedAccount<'info>,
    pub metadata_program: Program<'info, Metadata>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeNftCollection<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,

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

    /// CHECK: this account is safe because:
    /// 1) it's only used as a target account for metaplex cpi call
    /// 2) the account will be created by metaplex
    /// 3) all validation is handled by metaplex
    #[account(mut)]
    pub collection_metadata: UncheckedAccount<'info>,

    #[account(
        init,
        payer = initializer,
        seeds = [b"config"],
        bump,
        space = 8 + Config::INIT_SPACE
    )]
    pub config: Account<'info, Config>,

    /// CHECK: this is a system sysvar account that is required by metaplex
    pub sysvar_instructions: UncheckedAccount<'info>,
    pub metadata_program: Program<'info, Metadata>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeConvertibleNote<'info> {
    pub fn initialize(&mut self, bumps: &InitializeConvertibleNoteBumps) -> Result<()> {
        msg!("Initializing Convertible Note");
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
}

impl<'info> InitializeProtocolToken<'info> {
    pub fn initialize(&mut self, bumps: &InitializeProtocolTokenBumps) -> Result<()> {
        msg!("Initializing Protocol Token");
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
}

impl<'info> InitializeNftCollection<'info> {
    pub fn initialize(&mut self, bumps: &InitializeNftCollectionBumps) -> Result<()> {
        msg!("Initializing NFT Collection");
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
}

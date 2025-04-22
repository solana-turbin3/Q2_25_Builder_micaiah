use anchor_lang::prelude::*;
use anchor_spl::metadata::mpl_token_metadata::accounts::MasterEdition;
use anchor_spl::metadata::mpl_token_metadata::accounts::Metadata as TokenMetadataAccount;
use anchor_spl::metadata::mpl_token_metadata::types::{CollectionDetails, DataV2};
use anchor_spl::metadata::{
    create_master_edition_v3, create_metadata_accounts_v3, CreateMasterEditionV3,
    CreateMetadataAccountsV3, Metadata,
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::state::Config;
use crate::state::Treasury;

// What do we initialize:
//    - Tokens (Convertible note and protocol token)
//    - NFT Collection
//    - A vault (config) pda
//        - Holds:
//            - PT
//            - Mint authority / Metadata authority for nfts
//    - A treasury pda
//        - Holds:
//            - CN / PT token account references

pub const PROTOCOL_NAME: &str = "Zephyr Haus";
pub const PROTOCOL_SYMBOL: &str = "ZHS";
pub const PROTOCOL_URI: &str = "https://zephyr.haus/metadata.json";

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,

    // todo: I think rather than this being just a `Mint`, we want it to be a _specific_ mint.
    // it's a token that we've already created an know the address to. maybe it just needs to
    // be another PDA generated in this initialize function?

    // ******************** Convertible Note Accounts ********************
    #[account(
        init,
        payer = initializer,
        seeds = [b"cn", config.key().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = config
    )]
    pub cn_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = initializer,
        associated_token::mint = cn_mint,
        associated_token::authority = treasury,
    )]
    pub treasury_cn_token_account: Account<'info, TokenAccount>,

    // ******************** Protocol Token Accounts ********************
    #[account(
        init,
        payer = initializer,
        seeds = [b"pt", config.key().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = config
    )]
    pub pt_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = initializer,
        associated_token::mint = pt_mint,
        associated_token::authority = config,
    )]
    pub config_pt_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = initializer,
        associated_token::mint = pt_mint,
        associated_token::authority = treasury,
    )]
    pub treasury_pt_token_account: Account<'info, TokenAccount>,

    // ******************** NFT Option Accounts ********************
    #[account(
        init,
        payer = initializer,
        seeds = [b"nft_options", config.key().as_ref()],
        bump,
        mint::decimals = 0,
        mint::authority = config,
        mint::freeze_authority = config
    )]
    collection_mint: Account<'info, Mint>,

    /// CHECK: Metaplex metadata account, created by `initialize_nft_metadata` function
    #[account(mut)]
    pub collection_metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex master edition account, created by `initialize_nft_master_edition` function
    #[account(mut)]
    pub collection_master_edition: UncheckedAccount<'info>,

    // ******************** State Accounts ********************
    #[account(
        init,
        payer = initializer,
        seeds = [b"config"],
        bump,
        space = 8 + Config::INIT_SPACE
    )]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = initializer,
        seeds = [b"treasury"],
        bump,
        space = 8 + Treasury::INIT_SPACE
    )]
    pub treasury: Account<'info, Treasury>,

    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub metadata_program: Program<'info, Metadata>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    pub fn initialize_states(
        &mut self,
        authority: Option<Pubkey>,
        bumps: InitializeBumps,
        collection_meta_bump: u8,
        collection_master_edition_bump: u8,
    ) -> Result<()> {
        *self.config = Config {
            authority,
            cn_mint: self.cn_mint.key(),
            pt_mint: self.pt_mint.key(),
            collection_mint: self.collection_mint.key(),
            fee: None,
            locked: false,
            config_bump: bumps.config,
            pt_bump: bumps.pt_mint,
            cn_bump: bumps.cn_mint,
            collection_mint_bump: bumps.collection_mint,
            collection_meta_bump,
            collection_master_edition_bump,
        };

        *self.treasury = Treasury {
            authority: Some(self.initializer.key()),
            treasury_bump: bumps.treasury,
        };

        Ok(())
    }

    pub fn initialize_nft_metadata(&mut self) -> Result<u8> {
        let create_metadata_accounts = CreateMetadataAccountsV3 {
            metadata: self.collection_metadata.to_account_info(),
            mint_authority: self.config.to_account_info(),
            payer: self.initializer.to_account_info(),
            update_authority: self.config.to_account_info(),
            system_program: self.system_program.to_account_info(),
            mint: self.collection_mint.to_account_info(),
            rent: self.rent.to_account_info(),
        };

        let collection_mint_pubkey = self.collection_mint.key();
        let (_, collection_meta_bump) = TokenMetadataAccount::find_pda(&collection_mint_pubkey);
        let collection_metadata_seeds = [
            TokenMetadataAccount::PREFIX,
            self.metadata_program.key.as_ref(),
            collection_mint_pubkey.as_ref(),
            &[collection_meta_bump],
        ];
        let collection_metadata_seeds = [&collection_metadata_seeds[..]];

        let ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            create_metadata_accounts,
            &collection_metadata_seeds,
        );

        let data = DataV2 {
            name: PROTOCOL_NAME.to_string(),
            symbol: PROTOCOL_SYMBOL.to_string(),
            uri: PROTOCOL_URI.to_string(),
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        let _ = create_metadata_accounts_v3(
            ctx,
            data,
            true,
            false,
            Some(CollectionDetails::V1 { size: 0 }),
        )?;
        Ok(collection_meta_bump)
    }

    pub fn initialize_nft_master_edition(&mut self) -> Result<u8> {
        let create_master_edition_accounts = CreateMasterEditionV3 {
            edition: self.collection_master_edition.to_account_info(),
            mint: self.collection_mint.to_account_info(),
            update_authority: self.config.to_account_info(),
            mint_authority: self.config.to_account_info(),
            payer: self.initializer.to_account_info(),
            metadata: self.collection_metadata.to_account_info(),
            token_program: self.token_program.to_account_info(),
            system_program: self.system_program.to_account_info(),
            rent: self.rent.to_account_info(),
        };

        let collection_mint_pubkey = self.collection_mint.key();
        let (_, collection_master_edition_bump) = MasterEdition::find_pda(&collection_mint_pubkey);
        let collection_master_edition_seeds = [
            MasterEdition::PREFIX.0,
            self.metadata_program.key.as_ref(),
            collection_mint_pubkey.as_ref(),
            MasterEdition::PREFIX.1,
            &[collection_master_edition_bump],
        ];
        let collection_master_edition_seeds = [&collection_master_edition_seeds[..]];

        let cpi = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            create_master_edition_accounts,
            &collection_master_edition_seeds,
        );
        let _ = create_master_edition_v3(cpi, None)?; // TODO: confirm the `None` on the max supply here
        Ok(collection_master_edition_bump)
    }
}

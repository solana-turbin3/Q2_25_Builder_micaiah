use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::Token,
    token_interface::{
        burn, transfer_checked, Burn, Mint, TokenAccount, TransferChecked,
    },
    metadata::Metadata as MetaplexMetadataProgram,
};
use mpl_token_metadata::instructions::BurnV1CpiBuilder; // use BurnV1 for pNFTs

use crate::state::{Config, OptionData}; // assuming treasury state is not needed directly here yet

#[derive(Accounts)]
#[instruction(amount_to_convert_ui: u64)]
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
        associated_token::mint = nft_mint, // NFT being burned
        associated_token::authority = converter,
        token::token_program = token_program, // using token program, not 2022
    )]
    pub converter_option_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed, // init users PT ATA if they don't have one
        payer = converter,
        associated_token::mint = pt_mint,
        associated_token::authority = converter,
        token::token_program = token_program,
    )]
    pub converter_pt_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut, // needs mut to decrement option_count
        seeds = [Config::SEED_PREFIX],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    // protocol's PT holding ATA (source for transfer)
    #[account(
        mut,
        associated_token::mint = pt_mint,
        associated_token::authority = config, // owned by config PDA
        token::token_program = token_program, // use token program, not 2022
    )]
    pub protocol_pt_ata: InterfaceAccount<'info, TokenAccount>,

    // mints
    #[account(
        mut, // needs mut for burn?
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
        seeds = [OptionData::SEED_PREFIX, nft_mint.key().as_ref()],
        bump = option_data.bump,
        // no 'close = converter' constraint - we handle closure manually in separate instruction
    )]
    pub option_data: Account<'info, OptionData>,

    // Metaplex accounts needed for BurnV1
    /// CHECK: checked by Metaplex CPI. PDA derived from nft_mint.
    #[account(
        mut,
        address = Metadata::find_pda(&nft_mint.key()).0 @ ConvertError::AddressMismatch,
    )]
    pub nft_metadata: UncheckedAccount<'info>,
    /// CHECK: checked by Metaplex CPI. PDA derived from nft_mint.
    #[account(
        mut,
        address = MasterEdition::find_pda(&nft_mint.key()).0 @ ConvertError::AddressMismatch,
    )]
    pub nft_master_edition: UncheckedAccount<'info>,
    /// CHECK: checked by Metaplex CPI. PDA derived from collection_mint.
    #[account(
        mut,
        address =  Metadata::find_pda(&config.collection_mint.key()).0 @ ConvertError::AddressMismatch,
    )]
    pub collection_metadata: UncheckedAccount<'info>, // required for BurnV1

    // programs
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub metadata_program: Program<'info, MetaplexMetadataProgram>,
    /// CHECK: required by Metaplex
    pub sysvar_instructions: UncheckedAccount<'info>,
    pub rent: Sysvar<'info, Rent>, // needed for init_if_needed
}

impl<'info> Convert<'info> {
    pub fn handler(mut ctx: Context<Convert>, amount_to_convert_ui: u64) -> Result<()> {
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

        // validate amount_to_convert_ui
        require!(amount_to_convert_ui > 0, ConvertError::ZeroAmountToConvert);
        require!(amount_to_convert_ui <= option_data.amount, ConvertError::InsufficientOptionAmount);

        msg!(
            "attempting to convert option NFT {} for {} tokens (amount/expiration: {}/{})",
            ctx.accounts.nft_mint.key(),
            amount_to_convert_ui,
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
        burn(burn_cn_ctx, amount_to_convert_ui)?;
        msg!("burned {} CN tokens", amount_to_convert_ui);

        // prepare PDA signer seeds for PT transfer using helper and longer-lived binding
        let bump_seed = [ctx.accounts.config.bump];
        let config_seeds_with_bump = Config::get_seeds_with_bump(&bump_seed);
        let signer_seeds = &[&config_seeds_with_bump[..]];

        // 2. transfer PT tokens from Protocol ATA to converter's ATA
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
            amount_to_convert_ui, // transfer the same amount as CN burned
            ctx.accounts.pt_mint.decimals, // decimals needed for transfer_checked
        )?;
        msg!(
            "transferred {} PT tokens from protocol to converter",
            amount_to_convert_ui
        );

        // 3. handle NFT and OptionData based on conversion type
        // if amount_to_convert_ui == amount in option_data, we know its full
        let is_full_conversion = amount_to_convert_ui == ctx.accounts.option_data.amount;
        
        if is_full_conversion {
            msg!("full conversion for NFT {}. Burning NFT.", ctx.accounts.nft_mint.key());
            
            // burn the NFT Option using Metaplex BurnV1
            BurnV1CpiBuilder::new(&ctx.accounts.metadata_program.to_account_info())
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
            
            // set amount to 0 in option data acct to mark as fully spent
            let option_data = &mut ctx.accounts.option_data;
            option_data.amount = 0;
            
            // decrement the option count and total amount in the config account
            Self::decrement_config_option_count(&mut ctx)?;
            Self::decrement_total_option_amount(&mut ctx, amount_to_convert_ui)?;
            
            msg!("OptionData for mint {} marked as fully spent (amount = 0). Use close_option_account to reclaim rent.",
                 ctx.accounts.nft_mint.key());

        } else {
            // Partial Conversion: Decrement OptionData.amount, don't burn NFT
            msg!("partial conversion for NFT {}. Decrementing amount.", ctx.accounts.nft_mint.key());
            let option_data = &mut ctx.accounts.option_data;
            option_data.amount = option_data.amount
                .checked_sub(amount_to_convert_ui)
                .ok_or(ConvertError::ArithmeticOverflow)?;
                
            msg!("OptionData amount updated to {} for mint {}.", option_data.amount, ctx.accounts.nft_mint.key());
            
            // Decrement the total option amount in the config account
            Self::decrement_total_option_amount(&mut ctx, amount_to_convert_ui)?;
        }

        Ok(())
    }

    pub fn decrement_config_option_count(ctx: &mut Context<Convert>) -> Result<()> {
        // decrement the option count in the config account
        // only if it's greater than 0 to prevent underflow
        if ctx.accounts.config.option_count > 0 {
            ctx.accounts.config.option_count = ctx
                .accounts
                .config
                .option_count
                .checked_sub(1)
                .ok_or(ConvertError::ArithmeticOverflow)?;
            
            msg!("decremented config option_count to {}", ctx.accounts.config.option_count);
        } else {
            msg!("warning: config option_count is already 0, not decrementing");
        }
        
        Ok(())
    }
    
    pub fn decrement_total_option_amount(ctx: &mut Context<Convert>, amount_to_convert: u64) -> Result<()> {
        // decrement the total option amount in the config account
        // verify there's enough to decrement
        require!(
            ctx.accounts.config.total_option_amount >= amount_to_convert,
            ConvertError::InsufficientTotalOptionAmount
        );
        
        // safe to decrement now
        ctx.accounts.config.total_option_amount = ctx
            .accounts
            .config
            .total_option_amount
            .checked_sub(amount_to_convert)
            .ok_or(ConvertError::ArithmeticOverflow)?;
        
        msg!("decremented total_option_amount by {} to {}",
            amount_to_convert, ctx.accounts.config.total_option_amount);
        
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
    #[msg("amount to convert must be greater than zero.")]
    ZeroAmountToConvert,
    #[msg("amount to convert exceeds remaining amount on the option NFT.")]
    InsufficientOptionAmount,
    #[msg("amount to convert exceeds total option amount tracked in config.")]
    InsufficientTotalOptionAmount,
    #[msg("arithmetic overflow occurred.")]
    ArithmeticOverflow,
}

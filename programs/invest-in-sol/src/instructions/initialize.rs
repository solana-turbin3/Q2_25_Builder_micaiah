use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::state::Config;
use crate::state::Treasury;


// What do we initialize: 
//    - Tokens (Convertible note and protocol token)
//    - NFT Collection
//    - A vault pda
//        - Holds: 
//            - PT
//            - Mint authority / Metadata authority for nfts


#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,

    // todo: I think rather than this being just a `Mint`, we want it to be a _specific_ mint.
    // it's a token that we've already created an know the address to. maybe it just needs to
    // be another PDA generated in this initialize function?
    pub cn_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = initializer,
        seeds = [b"cn", config.key().as_ref() ],
        bump,
        mint::decimals = 6,
        mint::authority = config
    )]
    pub conv_note: Account<'info, TokenAccount>,

    pub pt_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = initializer,
        seeds = [b"pt", config.key().as_ref() ],
        bump,
        mint::decimals = 6,
        mint::authority = config
    )]
    pub protocol_token: Account<'info, Mint>,

    // TODO: confirm this
    pub collection_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = initializer,
        seeds = [b"pt", config.key().as_ref() ],
        bump,
        mint::decimals = 6,
        mint::authority = config
    )]
    pub nft_collection: Account<'info, Mint>,

    #[account(
        init,
        payer = initializer,
        seeds = [b"config", seed.to_le_bytes().as_ref()],
        bump,
        space = 8 + Config::INIT_SPACE
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = initializer,
        seeds = [b"treasury", seed.to_le_bytes().as_ref()],
        bump,
        space = 8 + Treasury::INIT_SPACE
    )]
    pub treasury: Account<'info, Treasury>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    pub fn initialize(
        &mut self,
        seed: u64,
        authority: Option<Pubkey>,
        bumps: InitializeBumps,
    ) -> Result<()> {
        *self.config = Config {
            seed,
            authority,
            cn_mint: self.cn_mint.key(),
            pt_mint: self.pt_mint.key(),
            collection_mint: self.collection_mint.key(),
            fee: None,
            locked: false,
            config_bump: bumps.config,
            pt_bump: bumps.protocol_token,
            treasury_bump: bumps.treasury,
        };

        Ok(())
    }
}

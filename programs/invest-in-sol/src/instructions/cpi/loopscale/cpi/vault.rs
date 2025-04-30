// use anchor_lang::prelude::*;
// use crate::instructions::loopscale::types::{
//     accounts::*, instructions::*, pod::*,
// };

// #[derive(Accounts)]
// pub struct ClaimVaultFee<'info> {
//     #[account(mut)]
//     pub payer: Signer<'info>,
//     pub manager: Signer<'info>,
//     #[account(mut)]
//     pub vault: AccountInfo<'info>,
//     #[account(mut)]
//     pub strategy: AccountInfo<'info>,
//     pub principal_mint: AccountInfo<'info>,
//     #[account(mut)]
//     pub manager_principal_ta: AccountInfo<'info>,
//     #[account(mut)]
//     pub strategy_principal_ta: AccountInfo<'info>,
//     pub token_program: AccountInfo<'info>,
//     pub associated_token_program: AccountInfo<'info>,
//     pub system_program: AccountInfo<'info>,
//     pub event_authority: AccountInfo<'info>,
//     pub program: AccountInfo<'info>,
// }

// #[derive(Accounts)]
// pub struct CreateVault<'info> {
//     #[account(mut)]
//     pub payer: Signer<'info>,
//     pub manager: Signer<'info>,
//     #[account(mut)]
//     pub vault: AccountInfo<'info>,
//     pub principal_mint: AccountInfo<'info>,
//     pub system_program: AccountInfo<'info>,
//     pub event_authority: AccountInfo<'info>,
//     pub program: AccountInfo<'info>,
// }

// #[derive(Accounts)]
// pub struct UpdateVault<'info> {
//     #[account(mut)]
//     pub payer: Signer<'info>,
//     pub manager: Signer<'info>,
//     #[account(mut)]
//     pub vault: AccountInfo<'info>,
//     pub system_program: AccountInfo<'info>,
//     pub event_authority: AccountInfo<'info>,
//     pub program: AccountInfo<'info>,
// }

// pub fn claim_vault_fee<'a>(
//     ctx: CpiContext<'_, '_, '_, 'a, ClaimVaultFee<'a>>,
//     params: ClaimVaultFeeParams,
// ) -> Result<()> {
//     let ix = crate::instructions::loopscale::instruction::claim_vault_fee(
//         ctx.program.key(),
//         params,
//     )?;
//     anchor_lang::solana_program::program::invoke_signed(
//         &ix,
//         &ToAccountInfos::to_account_infos(&ctx),
//         ctx.signer_seeds,
//     )?;
//     Ok(())
// }

// pub fn create_vault<'a>(
//     ctx: CpiContext<'_, '_, '_, 'a, CreateVault<'a>>,
//     params: CreateVaultParams,
// ) -> Result<()> {
//     let ix = crate::instructions::loopscale::instruction::create_vault(
//         ctx.program.key(),
//         params,
//     )?;
//     anchor_lang::solana_program::program::invoke_signed(
//         &ix,
//         &ToAccountInfos::to_account_infos(&ctx),
//         ctx.signer_seeds,
//     )?;
//     Ok(())
// }

// pub fn update_vault<'a>(
//     ctx: CpiContext<'_, '_, '_, 'a, UpdateVault<'a>>,
//     params: UpdateVaultParams,
// ) -> Result<()> {
//     let ix = crate::instructions::loopscale::instruction::update_vault(
//         ctx.program.key(),
//         params,
//     )?;
//     anchor_lang::solana_program::program::invoke_signed(
//         &ix,
//         &ToAccountInfos::to_account_infos(&ctx),
//         ctx.signer_seeds,
//     )?;
//     Ok(())
// } 
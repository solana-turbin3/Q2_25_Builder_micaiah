// use anchor_lang::prelude::*;
// use crate::instructions::loopscale::types::{
//     accounts::*, instructions::*, pod::*,
// };

// #[derive(Accounts)]
// pub struct CancelTimelock<'info> {
//     #[account(mut)]
//     pub payer: Signer<'info>,
//     pub manager: Signer<'info>,
//     #[account(mut)]
//     pub vault: AccountInfo<'info>,
//     #[account(mut)]
//     pub timelock: AccountInfo<'info>,
//     pub system_program: AccountInfo<'info>,
//     pub event_authority: AccountInfo<'info>,
//     pub program: AccountInfo<'info>,
// }

// #[derive(Accounts)]
// pub struct CreateTimelock<'info> {
//     #[account(mut)]
//     pub payer: Signer<'info>,
//     pub manager: Signer<'info>,
//     #[account(mut)]
//     pub vault: AccountInfo<'info>,
//     #[account(mut)]
//     pub timelock: AccountInfo<'info>,
//     pub system_program: AccountInfo<'info>,
//     pub event_authority: AccountInfo<'info>,
//     pub program: AccountInfo<'info>,
// }

// #[derive(Accounts)]
// pub struct ExecuteTimelock<'info> {
//     #[account(mut)]
//     pub payer: Signer<'info>,
//     pub manager: Signer<'info>,
//     #[account(mut)]
//     pub vault: AccountInfo<'info>,
//     #[account(mut)]
//     pub timelock: AccountInfo<'info>,
//     pub system_program: AccountInfo<'info>,
//     pub event_authority: AccountInfo<'info>,
//     pub program: AccountInfo<'info>,
// }

// pub fn cancel_timelock<'a>(
//     ctx: CpiContext<'_, '_, '_, 'a, CancelTimelock<'a>>,
// ) -> Result<()> {
//     let ix = crate::instructions::loopscale::instruction::cancel_timelock(
//         ctx.program.key(),
//     )?;
//     anchor_lang::solana_program::program::invoke_signed(
//         &ix,
//         &ToAccountInfos::to_account_infos(&ctx),
//         ctx.signer_seeds,
//     )?;
//     Ok(())
// }

// pub fn create_timelock<'a>(
//     ctx: CpiContext<'_, '_, '_, 'a, CreateTimelock<'a>>,
//     params: CreateTimelockParams,
// ) -> Result<()> {
//     let ix = crate::instructions::loopscale::instruction::create_timelock(
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

// pub fn execute_timelock<'a>(
//     ctx: CpiContext<'_, '_, '_, 'a, ExecuteTimelock<'a>>,
// ) -> Result<()> {
//     let ix = crate::instructions::loopscale::instruction::execute_timelock(
//         ctx.program.key(),
//     )?;
//     anchor_lang::solana_program::program::invoke_signed(
//         &ix,
//         &ToAccountInfos::to_account_infos(&ctx),
//         ctx.signer_seeds,
//     )?;
//     Ok(())
// } 
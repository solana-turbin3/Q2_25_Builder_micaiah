// use anchor_lang::prelude::*;
// use crate::instructions::loopscale::types::{
//     accounts::*, instructions::*, pod::*,
// };

// #[derive(Accounts)]
// pub struct CreateLoan<'info> {
//     #[account(mut)]
//     pub payer: Signer<'info>,
//     #[account(mut)]
//     pub borrower: Signer<'info>,
//     #[account(mut)]
//     pub loan: AccountInfo<'info>,
//     #[account(mut)]
//     pub strategy: AccountInfo<'info>,
//     pub market_information: AccountInfo<'info>,
//     pub principal_mint: AccountInfo<'info>,
//     pub collateral_mint: AccountInfo<'info>,
//     #[account(mut)]
//     pub borrower_principal_ta: AccountInfo<'info>,
//     #[account(mut)]
//     pub strategy_principal_ta: AccountInfo<'info>,
//     #[account(mut)]
//     pub borrower_collateral_ta: AccountInfo<'info>,
//     #[account(mut)]
//     pub loan_collateral_ta: AccountInfo<'info>,
//     pub principal_token_program: AccountInfo<'info>,
//     pub collateral_token_program: AccountInfo<'info>,
//     pub associated_token_program: AccountInfo<'info>,
//     pub system_program: AccountInfo<'info>,
//     pub event_authority: AccountInfo<'info>,
//     pub program: AccountInfo<'info>,
// }

// #[derive(Accounts)]
// pub struct OpenLoop<'info> {
//     #[account(mut)]
//     pub payer: Signer<'info>,
//     pub borrower: Signer<'info>,
//     #[account(mut)]
//     pub loan: AccountInfo<'info>,
//     #[account(mut)]
//     pub strategy: AccountInfo<'info>,
//     pub market_information: AccountInfo<'info>,
//     pub principal_mint: AccountInfo<'info>,
//     pub collateral_mint: AccountInfo<'info>,
//     #[account(mut)]
//     pub borrower_principal_ta: AccountInfo<'info>,
//     #[account(mut)]
//     pub strategy_principal_ta: AccountInfo<'info>,
//     #[account(mut)]
//     pub borrower_collateral_ta: AccountInfo<'info>,
//     #[account(mut)]
//     pub loan_collateral_ta: AccountInfo<'info>,
//     pub principal_token_program: AccountInfo<'info>,
//     pub collateral_token_program: AccountInfo<'info>,
//     pub associated_token_program: AccountInfo<'info>,
//     pub system_program: AccountInfo<'info>,
//     pub event_authority: AccountInfo<'info>,
//     pub program: AccountInfo<'info>,
// }

// #[derive(Accounts)]
// pub struct CloseLoop<'info> {
//     #[account(mut)]
//     pub payer: Signer<'info>,
//     pub borrower: Signer<'info>,
//     #[account(mut)]
//     pub loan: AccountInfo<'info>,
//     #[account(mut)]
//     pub strategy: AccountInfo<'info>,
//     pub principal_mint: AccountInfo<'info>,
//     pub collateral_mint: AccountInfo<'info>,
//     #[account(mut)]
//     pub borrower_collateral_ta: AccountInfo<'info>,
//     #[account(mut)]
//     pub loan_collateral_ta: AccountInfo<'info>,
//     #[account(mut)]
//     pub borrower_principal_ta: AccountInfo<'info>,
//     #[account(mut)]
//     pub strategy_principal_ta: AccountInfo<'info>,
//     pub principal_token_program: AccountInfo<'info>,
//     pub collateral_token_program: AccountInfo<'info>,
//     pub associated_token_program: AccountInfo<'info>,
//     pub system_program: AccountInfo<'info>,
//     pub event_authority: AccountInfo<'info>,
//     pub program: AccountInfo<'info>,
// }

// #[derive(Accounts)]
// pub struct LiquidateLedger<'info> {
//     #[account(mut)]
//     pub payer: Signer<'info>,
//     #[account(mut)]
//     pub liquidator: Signer<'info>,
//     #[account(mut)]
//     pub borrower: AccountInfo<'info>,
//     #[account(mut)]
//     pub loan: AccountInfo<'info>,
//     #[account(mut)]
//     pub strategy: AccountInfo<'info>,
//     pub market_information: AccountInfo<'info>,
//     #[account(mut)]
//     pub liquidator_ta: AccountInfo<'info>,
//     #[account(mut)]
//     pub strategy_ta: AccountInfo<'info>,
//     pub principal_mint: AccountInfo<'info>,
//     pub associated_token_program: AccountInfo<'info>,
//     pub token_program: AccountInfo<'info>,
//     pub token_2022_program: AccountInfo<'info>,
//     pub system_program: AccountInfo<'info>,
//     pub event_authority: AccountInfo<'info>,
//     pub program: AccountInfo<'info>,
// }

// #[derive(Accounts)]
// pub struct RefinanceLedger<'info> {
//     pub bs_auth: Signer<'info>,
//     #[account(mut)]
//     pub payer: Signer<'info>,
//     #[account(mut)]
//     pub loan: AccountInfo<'info>,
//     #[account(mut)]
//     pub old_strategy: AccountInfo<'info>,
//     #[account(mut)]
//     pub new_strategy: AccountInfo<'info>,
//     #[account(mut)]
//     pub old_strategy_ta: AccountInfo<'info>,
//     #[account(mut)]
//     pub new_strategy_ta: AccountInfo<'info>,
//     pub old_strategy_market_information: AccountInfo<'info>,
//     pub new_strategy_market_information: AccountInfo<'info>,
//     pub principal_mint: AccountInfo<'info>,
//     pub token_program: AccountInfo<'info>,
//     pub associated_token_program: AccountInfo<'info>,
//     pub system_program: AccountInfo<'info>,
//     pub event_authority: AccountInfo<'info>,
//     pub program: AccountInfo<'info>,
// }

// #[derive(Accounts)]
// pub struct SellLedger<'info> {
//     #[account(mut)]
//     pub payer: Signer<'info>,
//     pub lender_auth: Signer<'info>,
//     #[account(mut)]
//     pub loan: AccountInfo<'info>,
//     #[account(mut)]
//     pub new_strategy_ta: AccountInfo<'info>,
//     #[account(mut)]
//     pub lender_auth_ta: AccountInfo<'info>,
//     #[account(mut)]
//     pub old_strategy: AccountInfo<'info>,
//     #[account(mut)]
//     pub new_strategy: AccountInfo<'info>,
//     pub old_strategy_market_information: AccountInfo<'info>,
//     pub new_strategy_market_information: AccountInfo<'info>,
//     pub principal_mint: AccountInfo<'info>,
//     pub token_program: AccountInfo<'info>,
//     pub associated_token_program: AccountInfo<'info>,
//     pub system_program: AccountInfo<'info>,
//     #[account(mut)]
//     pub vault: Option<AccountInfo<'info>>,
//     #[account(mut)]
//     pub old_strategy_ta: Option<AccountInfo<'info>>,
//     pub event_authority: AccountInfo<'info>,
//     pub program: AccountInfo<'info>,
// }

// #[derive(Accounts)]
// pub struct BorrowPrincipal<'info> {
//     #[account(mut)]
//     pub payer: Signer<'info>,
//     pub borrower: Signer<'info>,
//     #[account(mut)]
//     pub loan: AccountInfo<'info>,
//     #[account(mut)]
//     pub strategy: AccountInfo<'info>,
//     pub market_information: AccountInfo<'info>,
//     pub principal_mint: AccountInfo<'info>,
//     #[account(mut)]
//     pub borrower_ta: AccountInfo<'info>,
//     #[account(mut)]
//     pub strategy_ta: AccountInfo<'info>,
//     pub associated_token_program: AccountInfo<'info>,
//     pub token_program: AccountInfo<'info>,
//     pub system_program: AccountInfo<'info>,
//     pub event_authority: AccountInfo<'info>,
//     pub program: AccountInfo<'info>,
// }

// #[derive(Accounts)]
// pub struct RepayPrincipal<'info> {
//     #[account(mut)]
//     pub payer: Signer<'info>,
//     pub borrower: Signer<'info>,
//     #[account(mut)]
//     pub loan: AccountInfo<'info>,
//     #[account(mut)]
//     pub strategy: AccountInfo<'info>,
//     pub market_information: AccountInfo<'info>,
//     pub principal_mint: AccountInfo<'info>,
//     #[account(mut)]
//     pub borrower_ta: AccountInfo<'info>,
//     #[account(mut)]
//     pub strategy_ta: AccountInfo<'info>,
//     pub token_program: AccountInfo<'info>,
//     pub system_program: AccountInfo<'info>,
//     pub event_authority: AccountInfo<'info>,
//     pub program: AccountInfo<'info>,
// }

// #[derive(Accounts)]
// pub struct UpdateLoan<'info> {
//     #[account(mut)]
//     pub payer: Signer<'info>,
//     pub borrower: Signer<'info>,
//     #[account(mut)]
//     pub loan: AccountInfo<'info>,
//     #[account(mut)]
//     pub strategy: AccountInfo<'info>,
//     pub market_information: AccountInfo<'info>,
//     pub system_program: AccountInfo<'info>,
//     pub event_authority: AccountInfo<'info>,
//     pub program: AccountInfo<'info>,
// }

// pub fn create_loan<'a>(
//     ctx: CpiContext<'_, '_, '_, 'a, CreateLoan<'a>>,
//     params: CreateLoanParams,
// ) -> Result<()> {
//     let ix = crate::instructions::loopscale::instruction::create_loan(
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

// pub fn open_loop<'a>(
//     ctx: CpiContext<'_, '_, '_, 'a, OpenLoop<'a>>,
//     params: OpenLoopParams,
// ) -> Result<()> {
//     let ix = crate::instructions::loopscale::instruction::open_loop(
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

// pub fn close_loop<'a>(
//     ctx: CpiContext<'_, '_, '_, 'a, CloseLoop<'a>>,
//     params: CloseLoopParams,
// ) -> Result<()> {
//     let ix = crate::instructions::loopscale::instruction::close_loop(
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

// pub fn liquidate_ledger<'a>(
//     ctx: CpiContext<'_, '_, '_, 'a, LiquidateLedger<'a>>,
//     params: LiquidateLedgerParams,
// ) -> Result<()> {
//     let ix = crate::instructions::loopscale::instruction::liquidate_ledger(
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

// pub fn refinance_ledger<'a>(
//     ctx: CpiContext<'_, '_, '_, 'a, RefinanceLedger<'a>>,
//     params: RefinanceLedgerParams,
// ) -> Result<()> {
//     let ix = crate::instructions::loopscale::instruction::refinance_ledger(
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

// pub fn sell_ledger<'a>(
//     ctx: CpiContext<'_, '_, '_, 'a, SellLedger<'a>>,
//     params: SellLedgerParams,
// ) -> Result<()> {
//     let ix = crate::instructions::loopscale::instruction::sell_ledger(
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

// pub fn borrow_principal<'a>(
//     ctx: CpiContext<'_, '_, '_, 'a, BorrowPrincipal<'a>>,
//     params: BorrowPrincipalParams,
// ) -> Result<()> {
//     let ix = crate::instructions::loopscale::instruction::borrow_principal(
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

// pub fn repay_principal<'a>(
//     ctx: CpiContext<'_, '_, '_, 'a, RepayPrincipal<'a>>,
//     params: RepayPrincipalParams,
// ) -> Result<()> {
//     let ix = crate::instructions::loopscale::instruction::repay_principal(
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

// pub fn update_loan<'a>(
//     ctx: CpiContext<'_, '_, '_, 'a, UpdateLoan<'a>>,
//     params: UpdateLoanParams,
// ) -> Result<()> {
//     let ix = crate::instructions::loopscale::instruction::update_loan(
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
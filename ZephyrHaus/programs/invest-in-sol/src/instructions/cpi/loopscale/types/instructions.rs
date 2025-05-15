// use anchor_lang::prelude::*;
// use super::pod::*;

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct CollateralTerms {
//     pub asset_identifier: Pubkey,
//     pub terms: [u64; 5],
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct UpdateMarketInformationParams {
//     pub asset_identifier: Pubkey,
//     pub quote_mint: Option<Pubkey>,
//     pub oracle_account: Option<Pubkey>,
//     pub oracle_type: Option<u8>,
//     pub max_uncertainty: Option<u32>,
//     pub max_age: Option<u16>,
//     pub decimals: Option<u8>,
//     pub ltv: Option<u32>,
//     pub liquidation_threshold: Option<u32>,
//     pub remove: Option<bool>,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct AddCollateralTimeLockArgs {
//     pub collateral_terms: CollateralTerms,
//     pub update_market_information_params: UpdateMarketInformationParams,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct ExpectedLoanValues {
//     pub expected_apy: u64,
//     pub expected_ltv: [u32; 5],
//     pub expected_liquidation_threshold: [u32; 5],
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct BorrowPrincipalParams {
//     pub amount: u64,
//     pub weight_matrix: [[u32; 5]; 5],
//     pub asset_index_guidance: Vec<u64>,
//     pub duration: u8,
//     pub expected_loan_values: ExpectedLoanValues,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct ClaimVaultFeeParams {
//     pub amount: u64,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct SwapCpiData {
//     pub num_swap_remaining_accounts: u8,
//     #[serde(with = "serde_bytes")]
//     pub cpi_data: Vec<u8>,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct CloseLoopParams {
//     pub ledger_index: u8,
//     pub collateral_index: u8,
//     pub swap_cpi_data: Vec<SwapCpiData>,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct CreateLoanParams {
//     pub principal_amount: u64,
//     pub collateral_amount: u64,
//     pub collateral_identifier: Pubkey,
//     pub collateral_type: u8,
//     pub loan_type: u8,
//     pub expected_apy: u64,
//     pub expected_ltv: u32,
//     pub expected_liquidation_threshold: u32,
//     pub duration_index: u8,
//     pub asset_index_guidance: Vec<u64>,
//     pub nonce: u64,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct CreateMarketInformationParams {
//     pub principal_mint: Pubkey,
//     pub authority: Pubkey,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct ExternalYieldSourceArgs {
//     pub new_external_yield_source: u8,
//     pub create_external_yield_account: bool,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct CreateStrategyParams {
//     pub lender: Pubkey,
//     pub origination_cap: u64,
//     pub liquidity_buffer: u64,
//     pub interest_fee: u64,
//     pub origination_fee: u64,
//     pub principal_fee: u64,
//     pub originations_enabled: bool,
//     pub external_yield_source_args: Option<ExternalYieldSourceArgs>,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct CreateVaultParams {
//     pub token_name: String,
//     pub token_symbol: String,
//     pub token_uri: String,
//     pub manager: Pubkey,
//     pub create_strategy_params: CreateStrategyParams,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct DepositCollateralParams {
//     pub amount: u64,
//     pub asset_type: u8,
//     pub asset_identifier: Pubkey,
//     pub asset_index_guidance: Vec<u64>,
//     pub weight_matrix: [[u32; 5]; 5],
//     pub expected_loan_values: ExpectedLoanValues,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct ExactInParams {
//     pub amount_in: u64,
//     pub min_amount_out: u64,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct ExactOutParams {
//     pub amount_out: u64,
//     pub max_amount_in: u64,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub enum LpParams {
//     ExactIn(ExactInParams),
//     ExactOut(ExactOutParams),
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct ManageOrcaLiquidityParams {
//     pub liquidity_amount: u128,
//     pub amount_a: u64,
//     pub amount_b: u64,
//     pub asset_index_guidance: Vec<u64>,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct MultiCollateralTermsUpdateParams {
//     pub apy: u64,
//     pub indices: Vec<CollateralTermsIndices>,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct CollateralTermsIndices {
//     pub collateral_index: u64,
//     pub duration_index: u8,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct OpenLoopParams {
//     pub principal_amount: u64,
//     pub collateral_amount: u64,
//     pub expected_apy: u64,
//     pub expected_ltv: u32,
//     pub expected_liquidation_threshold: u32,
//     pub deposit_mint: Pubkey,
//     pub deposit_amount: u64,
//     pub duration_index: u8,
//     pub asset_index_guidance: Vec<u64>,
//     pub nonce: u64,
//     pub external_yield_end_index: u8,
//     pub swap_cpi_data: Vec<SwapCpiData>,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct RefinanceLedgerParams {
//     pub ledger_index: u8,
//     pub duration_index: u8,
//     pub asset_index_guidance: Vec<u64>,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct RepayPrincipalParams {
//     pub amount: u64,
//     pub ledger_index: u8,
//     pub repay_all: bool,
//     pub weight_matrix: [[u32; 5]; 5],
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct SellLedgerParams {
//     pub ledger_index: u8,
//     pub expected_sale_price: u64,
//     pub buyer_duration_index: u8,
//     pub asset_index_guidance: Vec<u64>,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub enum TimelockUpdateParams {
//     UpdateMarketInformation(Pubkey),
//     AddCollateral(AddCollateralTimeLockArgs),
//     UpdateLtv(UpdateMarketInformationParams),
//     RemoveCollateral(CollateralTerms),
//     UpdateApy(CollateralTerms),
//     UpdateStrategy(UpdateStrategyParams),
//     UpdateVault(u64),
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct TransferOrcaPositionParams {
//     pub liquidity_amount: u128,
//     pub token_max_a: u64,
//     pub token_max_b: u64,
//     pub tick_lower_index: i32,
//     pub tick_upper_index: i32,
//     pub asset_index_guidance: Vec<u64>,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct UpdateStrategyParams {
//     pub originations_enabled: Option<bool>,
//     pub liquidity_buffer: Option<u64>,
//     pub interest_fee: Option<u64>,
//     pub origination_fee: Option<u64>,
//     pub principal_fee: Option<u64>,
//     pub origination_cap: Option<u64>,
//     pub market_information: Option<Pubkey>,
//     pub external_yield_source_args: Option<ExternalYieldSourceArgs>,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct UpdateVaultParams {
//     pub deposits_enabled: bool,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct VaultStakeParams {
//     pub amount: u64,
//     pub stake_all: Option<bool>,
//     pub duration: u32,
//     pub duration_type: u8,
// }

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
// pub struct WithdrawCollateralParams {
//     pub amount: u64,
//     pub collateral_index: u8,
//     pub weight_matrix: [[u32; 5]; 5],
//     pub asset_index_guidance: Vec<u64>,
//     pub expected_loan_values: ExpectedLoanValues,
// } 
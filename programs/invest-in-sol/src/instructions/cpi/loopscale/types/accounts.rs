use anchor_lang::prelude::*;
use anchor_lang::{AnchorDeserialize, AnchorSerialize};
use bytemuck::{Pod, Zeroable};

use super::pod::*;

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod, Debug, PartialEq)]
pub struct Duration {
    pub duration: PodU32,
    pub duration_type: u8,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod, Debug, PartialEq)]
pub struct AssetData {
    pub asset_identifier: Pubkey,
    pub quote_mint: Pubkey,
    pub oracle_account: Pubkey,
    pub oracle_type: u8,
    pub max_uncertainty: PodU32CBPS,
    pub max_age: PodU16,
    pub decimals: u8,
    pub ltv: PodU32CBPS,
    pub liquidation_threshold: PodU32CBPS,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod, Debug, PartialEq)]
pub struct CollateralData {
    pub asset_mint: Pubkey,
    pub amount: PodU64,
    pub asset_type: u8,
    pub asset_identifier: Pubkey,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod, Debug, PartialEq)]
pub struct Ledger {
    pub status: u8,
    pub strategy: Pubkey,
    pub principal_mint: Pubkey,
    pub market_information: Pubkey,
    pub principal_due: PodU64,
    pub principal_repaid: PodU64,
    pub interest_due: PodU64,
    pub interest_repaid: PodU64,
    pub duration: Duration,
    pub interest_per_second: PodDecimal,
    pub start_time: PodU64,
    pub end_time: PodU64,
    pub apy: PodU64CBPS,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod, Debug, PartialEq)]
pub struct Loan {
    pub version: u8,
    pub bump: u8,
    pub loan_type: u8,
    pub borrower: Pubkey,
    pub nonce: u64,
    pub start_time: PodU64,
    pub ledgers: [Ledger; 5],
    pub collateral: [CollateralData; 5],
    pub weight_matrix: [[PodU32CBPS; 5]; 5],
    pub ltv_matrix: [[PodU32CBPS; 5]; 5],
    pub lqt_matrix: [[PodU32CBPS; 5]; 5],
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod, Debug, PartialEq)]
pub struct Strategy {
    pub version: u8,
    pub nonce: Pubkey,
    pub bump: u8,
    pub principal_mint: Pubkey,
    pub lender: Pubkey,
    pub originations_enabled: PodBool,
    pub external_yield_source: u8,
    pub interest_per_second: PodDecimal,
    pub last_accrued_timestamp: PodU64,
    pub liquidity_buffer: PodU64CBPS,
    pub token_balance: PodU64,
    pub interest_fee: PodU64CBPS,
    pub principal_fee: PodU64CBPS,
    pub origination_fee: PodU64CBPS,
    pub origination_cap: PodU64,
    pub external_yield_amount: PodU64,
    pub current_deployed_amount: PodU64,
    pub outstanding_interest_amount: PodU64,
    pub fee_claimable: PodU64,
    pub cumulative_principal_originated: PodU128,
    pub cumulative_interest_accrued: PodU128,
    pub cumulative_loan_count: PodU64,
    pub active_loan_count: PodU64,
    pub market_information: Pubkey,
    pub collateral_map: [[PodU64; 5]; 200],
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod, Debug, PartialEq)]
pub struct MarketInformation {
    pub authority: Pubkey,
    pub delegate: Pubkey,
    pub principal_mint: Pubkey,
    pub asset_data: [AssetData; 200],
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod, Debug, PartialEq)]
pub struct Vault {
    pub manager: Pubkey,
    pub nonce: Pubkey,
    pub bump: u8,
    pub lp_supply: PodU64,
    pub lp_mint: Pubkey,
    pub principal_mint: Pubkey,
    pub cumulative_principal_deposited: PodU64,
    pub deposits_enabled: PodBool,
    pub max_early_unstake_fee: PodU64CBPS,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Zeroable, Pod, Debug, PartialEq)]
pub struct VaultStake {
    pub vault: Pubkey,
    pub nonce: Pubkey,
    pub bump: u8,
    pub user: Pubkey,
    pub amount: PodU64,
    pub duration: Duration,
    pub start_time: PodU64,
    pub end_time: PodU64,
    pub unstake_time: PodU64,
    pub unstake_fee_applied: PodU64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct PositionRewardInfo {
    pub growth_inside_checkpoint: u128,
    pub amount_owed: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct Position {
    pub whirlpool: Pubkey,
    pub position_mint: Pubkey,
    pub liquidity: u128,
    pub tick_lower_index: i32,
    pub tick_upper_index: i32,
    pub fee_growth_checkpoint_a: u128,
    pub fee_owed_a: u64,
    pub fee_growth_checkpoint_b: u128,
    pub fee_owed_b: u64,
    pub reward_infos: [PositionRewardInfo; 3],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct Timelock {
    pub vault: Pubkey,
    pub init_timestamp: i64,
    pub execution_delay: i64,
    pub params: super::instructions::TimelockUpdateParams,
} 
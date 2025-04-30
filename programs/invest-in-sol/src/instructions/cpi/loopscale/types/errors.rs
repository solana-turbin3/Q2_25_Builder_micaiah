// use anchor_lang::prelude::*;

// #[error_code]
// pub enum LoopscaleError {
//     #[msg("The collateral mint specified does not match identifier according to type")]
//     InvalidCollateralMintOrIdentifier,

//     #[msg("Loan doesnt have enough collateral for maintenance")]
//     MaintanenceCollateralNotMet,

//     #[msg("Arithmetic overflow")]
//     ArithmeticOverflow,

//     #[msg("Invalid timestamp")]
//     InvalidTimestamp,

//     #[msg("Max Collateral reached")]
//     MaxCollateralReached,

//     #[msg("Partial withdraws not allowed for orca positions")]
//     PartialWithdrawsNotAllowedForOrcaPositions,

//     #[msg("Invalid ledger status for refinance")]
//     InvalidLedgerStatusForRefinance,

//     #[msg("Invalid ledger status for ledger sale")]
//     InvalidLedgerStatusForLedgerSale,

//     #[msg("Invalid market information")]
//     InvalidMarketInformation,

//     #[msg("Loan size exceeds max origination size")]
//     LoanSizeExceedsMaxOriginationSize,

//     #[msg("Invalid manager")]
//     InvalidManager,

//     #[msg("No open ledgers")]
//     NoOpenLedgers,

//     #[msg("Invalid duration index")]
//     InvalidDurationIndex,

//     #[msg("Invalid asset identifier")]
//     InvalidAssetIdentifier,

//     #[msg("APY is disabled")]
//     APYDisabled,

//     #[msg("Collateral not present")]
//     CollateralNotPresent,

//     #[msg("Invalid principal mint")]
//     InvalidPrincipalMint,

//     #[msg("Invalid ledger strategy")]
//     InvalidLedgerStrategy,

//     #[msg("Invalid ledger index")]
//     InvalidLedgerIndex,

//     #[msg("No supported collateral found")]
//     NoSupportedCollateralFound,

//     #[msg("Cannot sell to same strategy")]
//     CannotSellToSameStrategy,

//     #[msg("Invalid Oracle account")]
//     InvalidOracleAccount,

//     #[msg("Invalid Legacy Pyth account")]
//     InvalidLegacyPythAccount,

//     #[msg("Invalid price exponent")]
//     InvalidPriceExpo,

//     #[msg("Stale Pyth price")]
//     StalePythPrice,

//     #[msg("Price uncertainilty is more than max uncertainity")]
//     PriceUncertainityExceeded,

//     #[msg("Price cannot be negative")]
//     NegativePrice,

//     #[msg("Price overflow")]
//     PriceOverflow,

//     #[msg("Missing Oracle Information account in remaining accounts")]
//     MissingMarketInformationAccount,

//     #[msg("Missing Oracle account in remaining accounts")]
//     MissingOracleAccount,

//     #[msg("Invalid seeds provided")]
//     InvalidSeeds,

//     #[msg("Invalid loan vault")]
//     InvalidLoanVault,

//     #[msg("Loan not in default")]
//     LoanNotInDefault,

//     #[msg("Order status must be filled")]
//     OrderStatusMismatch,

//     #[msg("LST Oracle invalid")]
//     LSTOracleInvalid,

//     #[msg("Could not get price per LST")]
//     LSTOraclePriceNotFound,

//     #[msg("Stale LST price")]
//     StaleLSTPrice,

//     #[msg("value could not be converted to Decimal")]
//     InvalidDecimal,

//     #[msg("Invalid quote mint for conversion oracle")]
//     InvalidConversionOracleQuote,

//     #[msg("Missing conversion rate")]
//     MissingConversionRate,

//     #[msg("Not enough remaining accounts passed in. Each lockbox asset requires at least 2 remaining accounts")]
//     NotEnoughRemainingAccounts,

//     #[msg("Invalid quote mint for vault oracle. Must be the same as vault base token")]
//     InvalidQuoteMintForMeteoraVault,

//     #[msg("Invalid base mint for vault oracle. Must be the same as vault LP token")]
//     InvalidBaseMintForMeteoraVault,

//     #[msg("Invalid decimals for vault oracle. Must be the same as vault LP token")]
//     InvalidDecimalsForMeteoraVault,

//     #[msg("Could not calculate total amount for meteroa vault")]
//     MeteoraVaultTotalAmountErr,

//     #[msg("Not enough extra accounts")]
//     InvalidExtraAccounts,

//     #[msg("Invalid switchboard account owner")]
//     InvalidSwitchboardAccountOwner,

//     #[msg("Invalid switchboard account")]
//     InvalidSwitchboardAccount,

//     #[msg("Invalid orca account owner")]
//     InvalidOrcaAccountOwner,

//     #[msg("Invalid orca position")]
//     InvalidOrcaPosition,

//     #[msg("Invalid orca whirlpool")]
//     InvalidOrcaWhirlpool,

//     #[msg("Invalid orca tick array")]
//     InvalidOrcaTickArray,

//     #[msg("Position does not match whirlpool")]
//     PositionDoesNotMatchWhirlpool,

//     #[msg("Position does not match mint")]
//     PositionDoesNotMatchMint,

//     #[msg("Tick array does not match whirlpool")]
//     TickArrayDoesNotMatchWhirlpool,

//     #[msg("Mint does not match whirlpool")]
//     MintDoesNotMatchWhirlpool,

//     #[msg("Invalid Pyth account")]
//     InvalidPythAccount,

//     #[msg("Invalid LTV data")]
//     InvalidLtvData,

//     #[msg("Ltv data not found")]
//     LtvDataNotFound,

//     #[msg("Invalid mint type for oracle")]
//     InvalidMintType,

//     #[msg("Invalid meteora pool")]
//     InvalidMeteoraPool,

//     #[msg("Invalid LP account")]
//     InvalidLPAccount,

//     #[msg("Unsupported curve type")]
//     UnsupportedCurveType,

//     #[msg("Swap simulation failed")]
//     SwapSimulationFailed,

//     #[msg("Invalid base mint for FLP")]
//     InvalidBaseMintForFLP,

//     #[msg("FLP pool not supported")]
//     FLPPoolNotSupported,

//     #[msg("Invalid asset index")]
//     InvalidAssetIndex,

//     #[msg("Invalid asset index guidance")]
//     InvalidAssetIndexGuidance,

//     #[msg("Quote price not found in cache")]
//     PriceNotFound,

//     #[msg("Duplicate collateral mints in market information")]
//     DuplicateCollateralMintsInMarketInformation,

//     #[msg("Market information is full")]
//     MarketInformationFull,

//     #[msg("Asset not found in market information")]
//     AssetNotFoundInMarketInformation,

//     #[msg("Market information already exists")]
//     MarketInformationAlreadyExists,

//     #[msg("Invalid vault strategy")]
//     InvalidVaultStrategy,

//     #[msg("Cannot liquidate a healthy ledger")]
//     LedgerHealthy,

//     #[msg("Invalid liquidation")]
//     InvalidLiquidation,

//     #[msg("Liquidity buffer has been exceeded")]
//     InsufficientLiquidity,

//     #[msg("Interest not accrued")]
//     InterestNotAccrued,

//     #[msg("Invalid interest per second. Must be 0")]
//     InvalidInterestPerSecondForClose,

//     #[msg("Invalid external yield amount. Must be 0")]
//     InvalidExternalYieldAmountForClose,

//     #[msg("Invalid current deployed amount. Must be 0")]
//     InvalidCurrentDeployedAmountForClose,

//     #[msg("Invalid token balance. Must be 0")]
//     InvalidTokenBalanceForClose,

//     #[msg("Invalid fee claimable. Must be 0")]
//     InvalidFeeClaimableForClose,

//     #[msg("Invalid lender")]
//     InvalidLender,

//     #[msg("Sale slippage exceeded")]
//     SaleSlippageExceeded,

//     #[msg("Expected LTV mismatch")]
//     ExpectedLtvMismatch,

//     #[msg("Expected LQT mismatch")]
//     ExpectedLqtMismatch,

//     #[msg("Expected APY mismatch")]
//     ExpectedApyMismatch,

//     #[msg("Lp slippage tolerance exceeded")]
//     LpSlippageToleranceExceeded,

//     #[msg("Invalid start time. Loan start time must be within 5 minutes of current time")]
//     InvalidStartTime,

//     #[msg("Invalid weight matrix")]
//     InvalidWeightMatrix,

//     #[msg("Loan is past end time")]
//     LoanPastEndTime,

//     #[msg("Invalid collateral withdrawal weight matrix assignment")]
//     InvalidCollateralWithdrawalWeightMatrixAssignment,

//     #[msg("Too much collateral withdrawn")]
//     TooMuchCollateralWithdrawn,

//     #[msg("Invalid principal withdrawal weight matrix assignment")]
//     InvalidPrincipalWithdrawalWeightMatrixAssignment,

//     #[msg("Ledger in refinance grace period cannot be withdrawn")]
//     LedgerInRefinanceGracePeriodCannotBeWithdrawn,

//     #[msg("Only borrower can refinance before end")]
//     OnlyBorrowerCanRefinanceBeforeEnd,

//     #[msg("Invalid duration for ledger sale")]
//     InvalidDurationForLedgerSale,

//     #[msg("Staked sol is currently unsupported")]
//     StakedSolCurrentlyUnsupported,

//     #[msg("Loan has not been fully repaid")]
//     LoanNotFullyRepaid,

//     #[msg("Liquidation threshold must be >= ltv + buffer")]
//     InvalidLiquidationThreshold,

//     #[msg("Max amount in exceeded")]
//     MaxAmountInExceeded,

//     #[msg("Min amount out not met")]
//     MinAmountOutNotMet,

//     #[msg("Missing account")]
//     MissingAccount,

//     #[msg("LQT weighted collateral value is greater than total debt")]
//     LQTWeightedCollateralValueGreaterThanTotalDebt,

//     #[msg("Strategy originations are disabled")]
//     StrategyOriginationsDisabled,

//     #[msg("Timelock delay not met")]
//     TimelockDelayNotMet,

//     #[msg("Vault deposits are disabled")]
//     VaultDepositsDisabled,

//     #[msg("Invalid LP params")]
//     InvalidLpParams,

//     #[msg("Invalid Met Vault account")]
//     InvalidVaultAccount,

//     #[msg("Invalid CPI program")]
//     InvalidCpiProgram,
// } 
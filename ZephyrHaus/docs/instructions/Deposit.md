# Deposit

The `deposit` instruction allows a user to deposit SOL into the protocol's treasury. In return, the user receives `CN` (Convertible Note) tokens, and the protocol treasury receives `PT` (Protocol Token) tokens. The amount of tokens minted is determined by the deposited SOL amount relative to the protocol's current Net Asset Value (NAV), ensuring fair valuation based on the treasury's holdings.

**Note:** This instruction *only* handles the SOL deposit and the minting of CN/PT tokens. The creation of the associated Option NFT is handled by the separate `initialize_option` instruction.

**Accounts & Data Inputs Required:**

1.  **`depositor` (Signer):** The user's wallet signing the transaction.
2.  **`depositor_sol_account` (SystemAccount, writable):** The user's account from which SOL will be transferred. Must be marked writable for the transfer.
3.  **`depositor_cn_ata` (TokenAccount, writable):** The user's Associated Token Account for receiving `CN` tokens (will be created if it doesn't exist).
4.  **`config` (Account<Config>):** The protocol's main configuration PDA (contains mint addresses and authority).
5.  **`treasury` (Account<Treasury>, writable):** The protocol's PDA where deposited SOL is held and whose state is updated.
6.  **`cn_mint` (Mint, writable):** The mint address for the protocol's `CN` token (checked against `config`, needs to be writable for minting).
7.  **`pt_mint` (Mint, writable):** The mint address for the protocol's `PT` token (checked against `config`, needs to be writable for minting).
8.  **`protocol_pt_ata` (TokenAccount, writable):** The protocol's ATA (owned by `config`) for receiving `PT` tokens (will be created if it doesn't exist).
9.  **System Programs:** `token_program` (Token2022), `associated_token_program`, `system_program`, `rent`.
10. **`amount` (u64):** The amount of SOL (in lamports) the user wants to deposit, passed as instruction data.

**Execution Flow (`handler` function):**

1.  **Pre-Checks:**
    *   Verifies that the protocol (`config.locked`) and deposits specifically (`config.deposit_locked`) are not locked/paused.
    *   Ensures the deposit `amount` is greater than zero.
2.  **SOL Transfer:**
    *   Transfers the specified `amount` of SOL from the `depositor_sol_account` directly to the `treasury` account using a System Program CPI.
3.  **Calculate Net Asset Value (NAV):**
    *   Calls the `calculate_nav` function on the `treasury` account state. (Note: Current implementation is a placeholder returning 1).
    *   Calculates `tokens_to_mint = deposit_amount / nav`. (Note: Placeholder calculation, effectively `tokens_to_mint = amount` currently).
4.  **CN Token Minting:**
    *   Mints the calculated `tokens_to_mint` amount of `CN` tokens (using the `cn_mint`).
    *   The `config` PDA signs as the mint authority.
    *   The minted `CN` tokens are sent to the `depositor_cn_ata`.
5.  **PT Token Minting:**
    *   Mints the calculated `tokens_to_mint` amount of `PT` tokens (using the `pt_mint`).
    *   The `config` PDA signs as the mint authority.
    *   The minted `PT` tokens are sent to the `protocol_pt_ata`.
6.  **Update Treasury State:**
    *   Increments the `total_deposited_sol` field in the `treasury` account by the originally deposited SOL `amount`.

**Outputs & State Changes:**

*   User receives `tokens_to_mint` (calculated based on `amount` and NAV) of `CN` tokens in their `depositor_cn_ata`.
*   `treasury` PDA SOL balance increases by the deposited SOL `amount`.
*   `treasury.total_deposited_sol` increases by the deposited SOL `amount`.
*   `protocol_pt_ata` balance increases by `tokens_to_mint` `PT` tokens.

**Mermaid Diagram Script:**
```mermaid
sequenceDiagram
    participant User
    participant DepositInstruction
    participant TreasuryPDA
    participant ConfigPDA
    participant CNMint
    participant PTMint
    participant UserCN_ATA
    participant ProtocolPT_ATA
    participant SystemProgram

    User->>DepositInstruction: Invoke Deposit(amount)
    DepositInstruction->>SystemProgram: CPI: Transfer SOL (amount) from User to TreasuryPDA
    DepositInstruction->>TreasuryPDA: Calculate NAV
    TreasuryPDA-->>DepositInstruction: Return NAV
    DepositInstruction->>DepositInstruction: Calculate tokens_to_mint = amount / NAV
    DepositInstruction->>ConfigPDA: Sign CPIs (for CN, PT)
    ConfigPDA->>CNMint: Mint CN Tokens (tokens_to_mint)
    CNMint-->>UserCN_ATA: Receive CN Tokens
    ConfigPDA->>PTMint: Mint PT Tokens (tokens_to_mint)
    PTMint-->>ProtocolPT_ATA: Receive PT Tokens
    DepositInstruction->>TreasuryPDA: Update total_deposited_sol (with original amount)
    DepositInstruction-->>User: Transaction Success

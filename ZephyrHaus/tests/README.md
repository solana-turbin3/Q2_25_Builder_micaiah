# Enhanced Test Suite for Invest-in-Sol

This directory contains an enhanced test suite for the Invest-in-Sol protocol, focusing on testing custom errors and edge cases to ensure robust behavior before launch.

## Overview

The test suite is designed to thoroughly test the protocol's instructions, with a focus on:

1. **Error Handling**: Testing all custom errors defined in the protocol
2. **Edge Cases**: Testing boundary conditions and unusual scenarios
3. **State Verification**: Ensuring account states are correctly updated after operations

## Test Files

- **enhanced-utils.ts**: Utility functions for the enhanced test suite
- **deposit_errors.ts**: Tests for the `deposit` instruction error cases
- **convert_errors.ts**: Tests for the `convert` instruction error cases
- **close_option_account_tests.ts**: Tests for the `close_option_account` instruction
- **initialize_option_tests.ts**: Tests for the `initialize_option` instruction

## Running the Tests

To run the enhanced test suite:

```bash
# Run all tests
anchor test

# Run a specific test file
anchor test -- -g "deposit error"  # Runs tests matching "deposit error" in their description
```

## Test Coverage

The enhanced test suite covers the following error scenarios:

### Deposit Instruction
- Zero amount deposits
- Invalid option durations
- Unclaimed deposit pending
- Deposit receipt state verification

### Convert Instruction
- Zero amount conversions
- Insufficient option amount
- Partial conversions
- Full conversions
- Option expiration

### Close Option Account Instruction
- Option not fully converted
- Receiver authority mismatch
- Successful closure

### Initialize Option Instruction
- Deposit receipt state changes
- Deposit receipt reusability
- Deposit receipt already issued (skipped - requires program modification)
- Deposit receipt expired (skipped - requires program modification)

## Future Improvements

Some tests are currently skipped or commented out because they require modifications to the program to properly test:

1. **Test-only Instructions**: Adding test-only instructions to the program would allow for more thorough testing of error conditions that are difficult to trigger naturally.

2. **Clock Manipulation**: For testing time-dependent logic like expiration, a mechanism to manipulate the Solana clock in tests would be beneficial.

3. **Complete Integration Tests**: Some tests are currently placeholders that demonstrate the test structure but don't fully execute the operations due to the complexity of setting up all required accounts.

## Notes for Developers

When adding new features or modifying existing ones, please ensure that:

1. All custom errors are tested
2. Edge cases are considered and tested
3. State transitions are verified
4. Tests are added for any new functionality

This will help maintain the robustness of the protocol and prevent regressions.
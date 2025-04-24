## User Actions Overview

The user interacts with the protocol through a series of actions. The possible actions include:

- Deposit into the protocol
- Convert CNs and NFT Option into Protocol Tokens
- Redeem CNs for SOL

```mermaid
flowchart TD
  User[User] -->|Deposit n SOL| Deposit[Deposit into Protocol]
  Deposit -->|Mint M CNs to User| User
  Deposit -->|Mint Option NFT to User| User

  User -->|Send CNs + Option| Convert[Convert to Protocol Tokens]
  Convert -->|Receive PTs| User

  User -->|Redeem CNs| Redeem[Redeem for SOL]
  Redeem -->|Based on NAV| User[Treasury Transfers SOL]

```

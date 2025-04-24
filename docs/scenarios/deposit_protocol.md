## User Deposit Into the Protocol

In this scenario, the user wants to deposit `n` SOL into the protocol. The protocol should:

- calculate the NAV (Net Asset Value)
- calculate the number (`m`) of tokens to mint: `m = n / NAV`
- mint `m` CN tokens to the user
- mint `m` PT tokens to the vault
- mint a Token2022 NFT to the user with metadata:
  - amount allowed: `m`
  - issue slot: current slot
  - last updated slot: current slot

```mermaid
sequenceDiagram
  participant User
  participant ProtocolProgram
  participant SystemProgram
  participant CNMint
  participant PTMint
  participant Vault
  participant Treasury
  participant NFTMint
  participant MetadataProgram

  User->>ProtocolProgram: Deposit n SOL

  ProtocolProgram->>ProtocolProgram: Calculate NAV = TV / PTs
  ProtocolProgram->>ProtocolProgram: Calculate m = n / NAV

  ProtocolProgram->>SystemProgram: Transfer n SOL to Treasury
  SystemProgram->>Treasury: Transfer n SOL to Treasury

  ProtocolProgram->>CNMint: Mint m CN to user
  CNMint->>User: Mint m CN to user
  ProtocolProgram->>PTMint: Mint m PT to Vault
  PTMint->>Vault: Mint m PT to Vault

  ProtocolProgram->>NFTMint: Mint NFT to user
  NFTMint->>User: Mint NFT to user
  ProtocolProgram->>MetadataProgram: Set metadata(amount_allowed, issued_slot, last_updated_slot)
```

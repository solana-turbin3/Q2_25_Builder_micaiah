# Initialize protocol

Initialize:

The initialize function is used to initialize the protocol. This function will:

- create a CN mint
- create a CN token account for the treasury
- create a Metadata account for the CN mint
- create a PT mint
- create a PT token account for the treasury
- create a PT token account for the vault
- create a Metadata account for the PT mint
- create a vault PDA
- create a treasury PDA
- create a mint account for the NFT collection
- create a Metadata account for the NFT collection
- create a Master Edition account for the NFT collection

```mermaid
sequenceDiagram
  participant Admin
  participant ProtocolProgram
  participant TokenProgram
  participant MetadataProgram
  participant SystemProgram

  Admin->>ProtocolProgram: Call initialize()

  %% Create CN mint & metadata
  ProtocolProgram->>TokenProgram: Create CN Mint
  ProtocolProgram->>TokenProgram: Create CN token account for Treasury
  ProtocolProgram->>MetadataProgram: Create Metadata for CN Mint

  %% Create PT mint & metadata
  ProtocolProgram->>TokenProgram: Create PT Mint
  ProtocolProgram->>TokenProgram: Create PT token account for Treasury
  ProtocolProgram->>TokenProgram: Create PT token account for Vault
  ProtocolProgram->>MetadataProgram: Create Metadata for PT Mint

  %% Create protocol state accounts
  ProtocolProgram->>SystemProgram: Create Vault PDA
  ProtocolProgram->>SystemProgram: Create Treasury PDA

  %% NFT Collection setup
  ProtocolProgram->>TokenProgram: Create NFT Collection Mint
  ProtocolProgram->>MetadataProgram: Create Metadata for NFT Collection
  ProtocolProgram->>MetadataProgram: Create Master Edition for NFT Collection

```

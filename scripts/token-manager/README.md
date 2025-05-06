# Zephyr Haus Token Manager CLI

this CLI tool helps manage the standard set of Zephyr Haus Solana tokens (zHAUS, zBOND, zOPTION).

## Prerequisites

- Node.js and yarn installed
- Solana CLI tools installed and configured
- a configured Solana keypair. the script will look for the keypair in the following order:
  1. the path specified by the `WALLET_PATH` environment variable.
  2. the default Solana CLI path, which depends on the network (set by `SOLANA_NETWORK` env var, defaults to 'devnet'):
     - mainnet-beta: `~/.config/solana/id.json`
     - other networks (e.g., devnet): `~/.config/solana/<network>.id.json` (e.g., `~/.config/solana/devnet.id.json`)
- environment variables set up (e.g., `SOLANA_NETWORK`, `WALLET_PATH`). a `.env` file in this directory can be used

## Installation

navigate to the `scripts/token-manager` directory and install dependencies:

```bash
cd scripts/token-manager
yarn install
```

## Build

compile the TypeScript code:

```bash
yarn build
```

this will create a `dist` directory with the compiled JavaScript code.

## Usage

you can run the commands using `node dist/index.js <command>` or the yarn/npm script aliases defined in `package.json`.

**Note:** commands requiring mint addresses expect them to be space-separated.

### 1. Create Tokens

creates the standard set of tokens (zHAUS, zBOND, zOPTION). this typically involves deploying new mints.

```bash
node dist/index.js create-tokens
# or 
yarn create-tokens
```

### 2. Create NFT Collection (Parent NFT)

creates the parent nft for program minted NFTs

```bash
node dist/index.js create-collection < program_id >
# or 
yarn create-collection < program_id >
```

### 3. Revoke Freeze Authority

revokes the freeze authority for one or more specified token mints. this is often done after creation to decentralize control.

```bash
node dist/index.js revoke-freeze <mint1> <mint2> ...
# or
yarn revoke-freeze <mint1> <mint2> ...
```

### 4. Transfer Mint/Update Authority

transfers the mint authority (and potentially update authority, depending on implementation in `src/transferAuthorities.ts`) for specified mints to a new public key. does only standard authorities.

```bash
node dist/index.js transfer-authorities <newAuthority> <mint1> <mint2> ...
# or
yarn transfer <newAuthority> <mint1> <mint2> ...
```

### 5. Confirm Deployment

fetches and displays details for the specified mint addresses to confirm their state after deployment or updates. it expects exactly three mint addresses (likely zHAUS, zBOND, zOPTION in order).

```bash
node dist/index.js confirm-deployment <mint1> <mint2> <mint3>
# or
yarn confirm <mint1> <mint2> <mint3>
```

## Development

- source code is in `index.ts` and the `src/` directory.
- uses `yargs` for command-line argument parsing.
- uses `@solana/web3.js` and `@solana/spl-token` for interacting with the Solana blockchain

#!/usr/bin/env node
import yargs, { Argv, ArgumentsCamelCase } from 'yargs'; // Revert to import syntax
import { hideBin } from 'yargs/helpers';
import { createTokens } from './src/createTokens';
import { createCollection } from './src/createCollection';
import { revokeFreezeAuthority } from './src/revokeFreeze';
import { transferAuthorities } from './src/transferAuthorities';
import { confirmDeployment } from './src/confirmDeployment';

console.log('--- Zephyr Haus Token Manager ---');

yargs(hideBin(process.argv))
  .command(
    'create-tokens',
    'Create the standard set of Zephyr Haus tokens (zHAUS, zBOND)',
    (yargs: Argv) => { },
    async (argv: ArgumentsCamelCase<{}>) => {
      console.log('Executing create tokens command...');
      try {
        await createTokens();
        console.log('\ncreate tokens command finished successfully.');
      } catch (error) {
        console.error('\nError during create-tokens command:', error);
        process.exit(1);
      }
    }
  )
  .command(
    'create-collection',
    'Create the Option collection for ZephyrHaus (zOption)',
    (yargs: Argv) => { },
    async (argv: ArgumentsCamelCase<{}>) => {
      console.log('Executing create collection command...');
      try {
        await createTokens();
        console.log('\nCreate collection command finished successfully.');
      } catch (error) {
        console.error('\nError during create-collection command:', error);
        process.exit(1);
      }
    }
  )
  // Add types for revoke-freeze command
  .command(
    'revoke-freeze <mints...>',
    'Revoke freeze authority for the specified token mint addresses',
    (yargs: Argv) => {
      return yargs.positional('mints', {
        describe: 'List of mint addresses (space-separated)',
        type: 'string',
        demandOption: true,
      }) as Argv<{ mints: string[] | string }>; // Add back type assertion
    },
    async (argv: ArgumentsCamelCase<{ mints: string[] | string }>) => {
      // Ensure mints is treated as an array even if only one is provided
      const mintAddresses = Array.isArray(argv.mints) ? argv.mints : [argv.mints];
      console.log(`Executing revoke-freeze command for mints: ${mintAddresses.join(', ')}`);
      try {
        await revokeFreezeAuthority(mintAddresses as string[]);
        console.log('\nRevoke-freeze command finished.');
      } catch (error) {
        console.error('\nError during revoke-freeze command:', error);
        process.exit(1);
      }
    }
  )
  .command(
    'transfer-authorities <newAuthority> <mints...>',
    'Transfer mint authority for specified mints to a new public key',
    (yargs: Argv) => {
      return yargs
        .positional('newAuthority', {
          describe: 'The public key of the new mint authority',
          type: 'string',
          demandOption: true,
        })
        .positional('mints', {
          describe: 'List of mint addresses (space-separated)',
          type: 'string',
          demandOption: true,
        }) as Argv<{ newAuthority: string; mints: string[] | string }>; // Add back type assertion
    },
    async (argv: ArgumentsCamelCase<{ newAuthority: string; mints: string[] | string }>) => {
      const mintAddresses = Array.isArray(argv.mints) ? argv.mints : [argv.mints];
      console.log(`Executing transfer-authorities command...`);
      console.log(`   New Authority: ${argv.newAuthority}`);
      console.log(`   Mints: ${mintAddresses.join(', ')}`);
      try {
        await transferAuthorities(argv.newAuthority as string, mintAddresses as string[]);
        console.log('\nTransfer-authorities command finished.');
      } catch (error) {
        console.error('\nError during transfer-authorities command:', error);
        process.exit(1);
      }
    }
  )
  .command(
    'confirm-deployment <mints...>',
    'Fetch and display details for the specified mint addresses (expected: zHAUS, zBOND, zOPTION)',
    (yargs: Argv) => {
      return yargs.positional('mints', {
        describe: 'List of the 3 mint addresses (space-separated)',
        type: 'string',
        demandOption: true,
        // Add validation for exactly 3 mints if yargs supports it easily,
        // otherwise handled in the function.
      }) as Argv<{ mints: string[] | string }>; // Add back type assertion
    },
    async (argv: ArgumentsCamelCase<{ mints: string[] | string }>) => {
      const mintAddresses = Array.isArray(argv.mints) ? argv.mints : [argv.mints];
      if (mintAddresses.length !== 3) {
        console.error("Error: Please provide exactly 3 mint addresses.");
        process.exit(1);
      }
      console.log(`Executing confirm-deployment command for mints: ${mintAddresses.join(', ')}`);
      try {
        await confirmDeployment(mintAddresses as string[]);
        console.log('\nConfirm-deployment command finished.');
      } catch (error) {
        console.error('\nError during confirm-deployment command:', error);
        process.exit(1);
      }
    }
  )
  .demandCommand(1, 'Please specify a command.')
  .strict()
  .help()
  .alias('h', 'help')
  .parse();
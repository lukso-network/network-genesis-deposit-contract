# Lukso Genesis Deposit Contract

## Table of contents

<!-- TOC -->
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

<!-- - [Introduction](#introduction)
- [Constants](#constants)
- [Configuration](#configuration)
- [Staking deposit contract](#staking-deposit-contract)
  - [`deposit` function](#deposit-function)
    - [Deposit amount](#deposit-amount)
    - [Withdrawal credentials](#withdrawal-credentials)
    - [`DepositEvent` log](#depositevent-log)
- [Solidity code](#solidity-code) -->

<!-- END doctoc generated TOC please keep comment here to allow auto update -->
<!-- /TOC -->

<!-- ## Introduction

This document represents the specification for LUKSO genesis deposit contract. -->

## Constants

The following values are (non-configurable) constants used throughout the specification.

| Name                              | Value                                                                |
| --------------------------------- | -------------------------------------------------------------------- |
| `DEPOSIT_CONTRACT_TREE_DEPTH`     | `2**5` (= 32)                                                        |
| `MAX_DEPOSIT_COUNT`               | `2**DEPOSIT_CONTRACT_TREE_DEPTH - 1`                                 |
| `amount_to_little_endian_64`      | `hex"0040597307000000"`                                              |
| `registryAddress`                 | `0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24`                         |
| `TOKENS_RECIPIENT_INTERFACE_HASH` | `0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b` |

## Configuration

_Note_: The default mainnet configuration values are included here for spec-design purposes.

<!-- The different configurations for mainnet, testnets, and YAML-based testing can be found in the [`configs/constant_presets`](../../configs) directory. -->

These configurations are updated for releases and may be out of sync during `dev` changes.

| Name                       | Value |
| -------------------------- | ----- |
| `DEPOSIT_CHAIN_ID`         | `1`   |
| `DEPOSIT_NETWORK_ID`       | `1`   |
| `DEPOSIT_CONTRACT_ADDRESS` | `TBD` |

## Staking LUKSO genesis deposit contract

### `tokensReceived` function

The LUKSO genesis deposit contract has an external `tokensReceived` function.
It takes as arguments `address operator,address from, uint256 amount, bytes calldata userData, bytes calldata operatorData.`
`address operator`, `address from`, `address to`, `bytes calldata operatorData`are unused function parameters.`uint256 amount` is the parameter that defines the amount of tokens sent by the caller (LYXe token contract) and`bytes calldata userData` is the parameters that is used to send all the bytes related to the deposit.

#### Amount

The amount of LYXe sent to the deposit contract is the deposit amount, which must be of size 32 LYXe.

#### UserData

Deposit data sent by the LYXe token contract that will be sliced and pass to the internal `_deposit` function.

`userData.length` MUST be equal to `208`: - `pubkey` of 48 bytes - `withdrawal_credentials` of 32 bytes - `signature` of 96 bytes - `deposit_data_root` of 32 bytes

_Note_: there are a few checks that are made in order to have a successfull transaction:

- contract should not have the `frozen` status
- `tokensReceived` function MUST be called by the LYXe token contract
- `amount` value MUST be equal to `32 ethers`
- `userData.length` MUST be equal to `208`:
  - `pubkey` of 48 bytes
  - `withdrawal_credentials` of 32 bytes
  - `signature` of 96 bytes
  - `deposit_data_root` of 32 bytes

### `freezeContract` function

The `freezeContract` function is an external function that is only callable by the `owner` of the smart contract.
Calling it will change the `contractFrozen` to true.
It will prevent any call to the `tokensReceived` function and will not allow any other deposit.

### `_deposit` function

The deposit contract has a internal `_deposit` function to make deposits. It takes as arguments `bytes calldata pubkey, bytes calldata withdrawal_credentials, bytes calldata signature, bytes32 deposit_data_root`. The first three arguments populate a [`DepositData`](./beacon-chain.md#depositdata) object, and `deposit_data_root` is the expected `DepositData` root as a protection against malformatted calldata.

#### Deposit amount

The amount of LYXe sent to the deposit contract is the deposit amount, which must be of size 32 LYXe.

#### Withdrawal credentials

One of the `DepositData` fields is `withdrawal_credentials` which constrains validator withdrawals.
The first byte of this 32-byte field is a withdrawal prefix which defines the semantics of the remaining 31 bytes.
The withdrawal prefixes currently supported are `BLS_WITHDRAWAL_PREFIX` and `ETH1_ADDRESS_WITHDRAWAL_PREFIX`.
Read more in the [validator guide](./validator.md#withdrawal-credentials).

_Note_: The deposit contract does not validate the `withdrawal_credentials` field.
Support for new withdrawal prefixes can be added without modifying the deposit contract.

#### `DepositEvent` log

Every deposit emits a `DepositEvent` log for consumption by the beacon chain. The LUKSO genesis deposit contract does little validation, pushing most of the validator onboarding logic to the beacon chain. In particular, the proof of possession (a BLS12-381 signature) is not verified by the deposit contract.

## Solidity code

The deposit contract source code, written in Solidity, is available [here](../../solidity_deposit_contract/deposit_contract.sol).

_Note_: To save on gas, the deposit contract uses a progressive Merkle root calculation algorithm that requires only O(log(n)) storage. See [here](https://github.com/ethereum/research/blob/master/beacon_chain_impl/progressive_merkle_tree.py) for a Python implementation, and [here](https://github.com/runtimeverification/verified-smart-contracts/blob/master/deposit/formal-incremental-merkle-tree-algorithm.pdf) for a formal correctness proof.

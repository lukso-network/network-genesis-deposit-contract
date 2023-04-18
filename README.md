# LUKSO Genesis Deposit Contract

## Deployed Address: [Coming later](https://etherscan.io/address/)

---

This document represents the specification for the LUKSO Genesis Deposit Contract. Inspired by the [ETH2 Deposit Contract](https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/deposit-contract.md).

## Constants

The following values are (non-configurable) constants used throughout the specification.

| Name                              | Value                                                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `OWNER`                           | `0x6109dcd72b8a2485A5b3Ac4E76965159e9893aB7`                                                                                 |
| `LYX_TOKEN_CONTRACT_ADDRESS`      | [`0xA8b919680258d369114910511cc87595aec0be6D`](https://etherscan.io/token/0xA8b919680258d369114910511cc87595aec0be6D)        |
| `REGISTRY_ADDRESS`                | [`0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24`](https://etherscan.io/address/0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24#code) |
| `TOKENS_RECIPIENT_INTERFACE_HASH` | `0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b`                                                         |
| `AMOUNT_TO_LITTLE_ENDIAN_64`      | `hex"0040597307000000"` (little endian hex value of: 32 LYXe / 1 gwei)                                                       |
| `DEPOSIT_START_TIMESTAMP`         | `1682007600` (2023-04-20 04:20pm UTC)                                                                                        |
| `FREEZE_DELAY`                    | `46_523` blocks (around 1 week)                                                                                              |

## Configuration

> _Note_: The default mainnet configuration values are included here for spec-design purposes.

These configurations are updated for releases and may be out of sync during `dev` changes.

| Name                       | Value |
| -------------------------- | ----- |
| `DEPOSIT_CHAIN_ID`         | `1`   |
| `DEPOSIT_NETWORK_ID`       | `1`   |
| `DEPOSIT_CONTRACT_ADDRESS` | `TBD` |

## LUKSO genesis deposit contract

Starting from the timestamp `1682007600`, which corresponds to April 20th, at 4:20 PM UTC, the genesis deposit contract will accept LYXe Tokens (`0xA8b919680258d369114910511cc87595aec0be6D`).

Depositing LYXe tokens will allow you to become a validator on LUKSO's Mainnet blockchain. The contract will be notified by the ERC777 LYXe smart contract using the [`tokensReceived(...)`](#tokensreceived-function) function (see details below).

People wishing to deposit needs to:

- call the [`send(..)`](https://docs.openzeppelin.com/contracts/3.x/api/token/erc777#IERC777-send-address-uint256-bytes-) function or have an operator call the [`operatorSend(..)`](https://docs.openzeppelin.com/contracts/3.x/api/token/erc777#IERC777-operatorSend-address-address-uint256-bytes-bytes-) function.
- pass **[depositData](#depositdata)** as `data` parameter to these functions.

> Depositing using the `transfer(..)` or `transferFrom(..)` functions will not work and will result in the transaction reverting.

Once enough validators have deposited, contract will be frozen and the chain will start.

### `tokensReceived(...)` function

```solidity
function tokensReceived(
    address, /* operator */
    address, /* from */
    address, /* to */
    uint256 amount,
    bytes calldata depositData,
    bytes calldata /* operatorData */
) external;
```

The `tokensReceived(...)` function will be called by the LYXe token smart contract, which implements the ERC777 interface.

| Function Parameter                                                                          | Description                                                               |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `address operator` <br> `address from` <br> `address to` <br> `bytes calldata operatorData` | :heavy_multiplication_x: unused parameters                                |
| [`uint256 amount`](#amount)                                                                 | the amount of LYXe sent by the sender (**32 LYXe**)                       |
| [`bytes calldata depositData`](#depositdata)                                                | this parameter is used to send all the bytes data related to the deposit. |

#### Amount

The amount of LYXe sent to the deposit contract **MUST be 32 LYXe**.

#### DepositData

The LYXe token contract is sending `depositData` which will be sliced. This `depositData` is made up of five pieces of information:

| `depositData` field                 | Description                                                                                                                                                                                                                                                                  |
| :---------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (48 bytes) `pubkey`                 | Represents a `Bytes48` BLS12-381 public key                                                                                                                                                                                                                                  |
| (32 bytes) `withdrawal_credentials` | Constrains validator withdrawals. <br> The first byte of this 32-byte field is a withdrawal prefix which defines the semantics of the remaining 31 bytes. <br> The withdrawal prefixes currently supported are `BLS_WITHDRAWAL_PREFIX` and `ETH1_ADDRESS_WITHDRAWAL_PREFIX`. |
| (96 bytes) `signature`              | Represents a `Bytes96` a BLS12-381 signature.                                                                                                                                                                                                                                |
| (32 bytes) `deposit_data_root`      | The computed SHA256 deposit data root.                                                                                                                                                                                                                                       |
| (1 byte) `initialSupplyVote`        | A value between `0` and `100` to describe the initial supply of LYX (in million) the validator voted for.                                                                                                                                                                    |

The **following checks are performed to ensure a successful deposit**:

- the contract should not be _"frozen"_. [See below for more details](#freezeContract-function)
- `tokensReceived` function MUST be called by the LYXe token contract
- `amount` value MUST be equal to `32 ether`
- `depositData.length` MUST be equal to `209`:
  - &nbsp; `pubkey` of 48 bytes
  - \+ `withdrawal_credentials` of 32 bytes
  - \+ `signature` of 96 bytes
  - \+ `deposit_data_root` of 32 bytes
  - \+ `initialSupplyVote` of 1 byte

> _Note_: The deposit contract does not validate the `withdrawal_credentials` field.
> Support for new withdrawal prefixes can be added without modifying the deposit contract.

## Events

### `DepositEvent` log

```
event DepositEvent(
    bytes pubkey,
    bytes withdrawal_credentials,
    uint256 amount,
    bytes signature,
    uint256 index
);
```

Every deposit emits a `DepositEvent` log for consumption by LUKSO's mainnet chain. The LUKSO genesis deposit contract does little validation, pushing most of the validator onboarding logic to LUKSO's mainnet chain. In particular, the proof of possession (a BLS12-381 signature) is not verified by the deposit contract.

## Functions

### `freezeContract()`

```solidity
function freezeContract() external;
```

The `freezeContract` function is an external function that is only callable by the [`OWNER`](#constants) of the smart contract.

Calling it will freeze the contract 46,523 blocks (around 1 week as defined by the [`FREEZE_DELAY`](#constants)) after is has been called.

:warning: **This action cannot be reversed!** It will prevent any further calls to the `tokensReceived(...)` function coming from the LYXe token contract and block any future deposits once the `FREEZE_DELAY` has passed.

### `getDepositData()`

```solidity
function getDepositData() external view returns (bytes[] memory returnedArray);
```

The `getDepositData()` function returns the list of deposits currently stored in the deposit contract.

It takes no parameters and returns an array of `bytes[]` values, where each `bytes` entry in the array represents the data for a single deposit.

### `getDepositDataByIndex(uint256)`

```solidity
function getDepositDataByIndex(uint256 index) external view returns (bytes memory);
```

The `getDepositDataByIndex(uint256)` function returns the deposit data at the specified index, which is then used to create a new validator in LUKSO's mainnet chain.

### `getsVotesPerSupply()`

```solidity
function getsVotesPerSupply() external view returns (uint256[101] memory votesPerSupply, uint256 totalVotes);
```

The `getsVotesPerSupply()` function retrieves essential information about LYX initial supply votes.

It gathers the number of votes per supply and the total number of deposits, which will be used to determine LUKSO's blockchain initial supply voted for by the Genesis Validators.

### `isPubkeyRegistered(bytes)`

```solidity
function isPubkeyRegistered(bytes calldata pubkey) external view returns (bool);
```

The function `isPubkeyRegistered(bytes)` accepts a public key as `bytes` input and checks if the given public key is registered.

It calculates the SHA256 hash of the provided public key and looks up the result in the `_registeredPubKeyHash` mapping, which stores whether the hash of a public key is registered or not.

The function returns a boolean value of:

- `true` if the public key is registered,
- `false` otherwise.

### `depositCount()`

This `depositCount()` function returns the current number of deposits made to the LUKSO Genesis Deposit contract.

It retrieves the value from the `deposit_count` state variable, which is incremented each time a new deposit is successfully processed. This function can be useful for querying the total number of deposits made to the contract.

### `supportsInterface` function

```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool);
```

The `supportsInterface(bytes4)` is required by the ERC165 standard. It checks if a given interface ID is the interface ID for ERC165.

## Fetch all the deposit data

The [`fetchDeposits.ts`](./scripts/fetchDeposits.ts) script is used to fetch all the deposit data from the `LUKSOGenesisDepositContract`. To use this script, follow these steps:

1. Update the `hardhat.config.ts` file with your `INFURA API KEY` in the networks section as follows:

```js
networks: {
  ethereum: {
    url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
  },
}
```

2. In your terminal, navigate to the root directory of the project.

Run the following command to execute the `fetchDeposits` script:

```bash
npx hardhat run scripts/fetchDeposits --network ethereum
```

3. Wait for the script to complete, and then look for the `depositData.json` file in the project directory. This file will contain all the deposit data from the LUKSOGenesisDeposit contract.

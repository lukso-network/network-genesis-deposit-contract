# LUKSO Genesis Deposit Contract

> ## Deployed Address: [0x42000421dd80D1e90E56E87e6eE18D7770b9F8cC](https://etherscan.io/address/0x42000421dd80D1e90E56E87e6eE18D7770b9F8cC)

This document represents the specification for the LUKSO Genesis Deposit Contract. Inspired by the [ETH2 Deposit Contract](https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/deposit-contract.md).

**Table of Contents**

- [Constants](#constants)
- [Configurations](#configurations)
- [How to deposit LYXe on the LUKSO Genesis Deposit Contract?](#how-to-deposit-lyxe-on-the-lukso-genesis-deposit-contract)
  - [Details on the `tokensReceived(...)` function](#details-on-the-tokensreceived-function)
    - [LYXe Amount](#lyxe-amount)
    - [Deposit Data](#deposit-data)
- [Events](#events)
  - [`DepositEvent` log](#depositevent-log)
  - [`FreezeInitiated` log](#freezeinitiated-log)
- [Public state variables](#public-state-variables)
  - [`freezeBlockNumber`](#freezeblocknumber)
  - [`supplyVoteCounter`](#supplyvotecounter)
- [Functions](#functions)
  - [`freezeContract()`](#freezecontract)
  - [`getDepositData()`](#getdepositdata)
  - [`getDepositDataByIndex(uint256)`](#getdepositdatabyindexuint256)
  - [`getsVotesPerSupply()`](#getsvotespersupply)
  - [`isPubkeyRegistered(bytes)`](#ispubkeyregisteredbytes)
  - [`depositCount()`](#depositcount)
  - [`supportsInterface`](#supportsinterface)
- [Fetching all the deposit data](#fetching-all-the-deposit-data)
- [Make deposits in the LUKSOGenesisDepositContract](#make-Deposits-in-the-LUKSOGenesisDepositContract)
- [Audits](#audits)

---

&nbsp;

## Constants

The following values are (non-configurable) constants used throughout the specification.

| Name                                                                                               | Value                                                                                                                        |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [`FREEZER`](./contracts/LUKSOGenesisValidatorsDepositContract.sol#L39-L42)                         | `0x6109dcd72b8a2485A5b3Ac4E76965159e9893aB7`                                                                                 |
| [`LYX_TOKEN_CONTRACT_ADDRESS`](./contracts/LUKSOGenesisValidatorsDepositContract.sol#L44-L45)      | [`0xA8b919680258d369114910511cc87595aec0be6D`](https://etherscan.io/token/0xA8b919680258d369114910511cc87595aec0be6D)        |
| [`ERC1820_REGISTRY_ADDRESS`](./contracts/LUKSOGenesisValidatorsDepositContract.sol#L47-L48)        | [`0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24`](https://etherscan.io/address/0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24#code) |
| [`TOKENS_RECIPIENT_INTERFACE_HASH`](./contracts/LUKSOGenesisValidatorsDepositContract.sol#L50-L52) | `0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b`                                                         |
| [`AMOUNT_TO_LITTLE_ENDIAN_64`](./contracts/LUKSOGenesisValidatorsDepositContract.sol#L54-L55)      | `hex"0040597307000000"` (little endian hex value of: 32 LYXe / 1 gwei)                                                       |
| [`DEPOSIT_START_TIMESTAMP`](./contracts/LUKSOGenesisValidatorsDepositContract.sol#L57-L58)         | `1682007600` (2023-04-20 04:20pm UTC)                                                                                        |
| [`FREEZE_DELAY`](./contracts/LUKSOGenesisValidatorsDepositContract.sol#L63-L64)                    | `46_523` blocks (around 1 week)                                                                                              |

&nbsp;

## Configurations

> _Note_: The default mainnet configuration values are included here for spec-design purposes.

These configurations are updated for releases and may be out of sync during `dev` changes.

| Name                       | Value                                        |
| -------------------------- | -------------------------------------------- |
| `DEPOSIT_CHAIN_ID`         | `1`                                          |
| `DEPOSIT_NETWORK_ID`       | `1`                                          |
| `DEPOSIT_CONTRACT_ADDRESS` | `0x42000421dd80D1e90E56E87e6eE18D7770b9F8cC` |

&nbsp;

## How to deposit LYXe on the LUKSO Genesis Deposit Contract?

Starting from the timestamp `1682007600`, which corresponds to April 20th, at 4:20 PM UTC, the genesis deposit contract will accept LYXe Tokens (`0xA8b919680258d369114910511cc87595aec0be6D`).

Depositing LYXe tokens will allow you to become a validator on LUKSO's Mainnet blockchain. The contract will be notified by the ERC777 LYXe smart contract using the [`tokensReceived(...)`](#tokensreceived-function) function (see details below).

People wishing to deposit needs to:

- call the [`send(..)`](https://docs.openzeppelin.com/contracts/3.x/api/token/erc777#IERC777-send-address-uint256-bytes-) function or have an operator call the [`operatorSend(..)`](https://docs.openzeppelin.com/contracts/3.x/api/token/erc777#IERC777-operatorSend-address-address-uint256-bytes-bytes-) function.
- pass **[depositData](#depositdata)** as `data` parameter to these functions.

> Depositing using the `transfer(..)` or `transferFrom(..)` functions will not work and will result in the transaction reverting.

Once enough validators have deposited, contract will be frozen and the chain will start.

### Details on the `tokensReceived(...)` function

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

#### LYXe Amount

The amount of LYXe sent to the deposit contract **MUST be 32 LYXe**.

#### Deposit Data

The LYXe token contract is sending `depositData` which will be sliced. This `depositData` is made up of five pieces of information:

| `depositData` field                 | Description                                                                                                                                                                                                                                                                  |
| :---------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (48 bytes) `pubkey`                 | Represents a `Bytes48` BLS12-381 public key                                                                                                                                                                                                                                  |
| (32 bytes) `withdrawal_credentials` | Constrains validator withdrawals. <br> The first byte of this 32-byte field is a withdrawal prefix which defines the semantics of the remaining 31 bytes. <br> The withdrawal prefixes currently supported are `BLS_WITHDRAWAL_PREFIX` and `ETH1_ADDRESS_WITHDRAWAL_PREFIX`. |
| (96 bytes) `signature`              | Represents a `Bytes96` a BLS12-381 signature.                                                                                                                                                                                                                                |
| (32 bytes) `deposit_data_root`      | The computed SHA256 deposit data root.                                                                                                                                                                                                                                       |
| (1 byte) `initialSupplyVote`        | A value between `0` and `100` to describe the initial supply of LYX (in million) the validator voted for.                                                                                                                                                                    |

> _Note_: The deposit contract does not validate the `withdrawal_credentials` field.
> Support for new withdrawal prefixes can be added without modifying the deposit contract.

&nbsp;

## Events

### `DepositEvent` log

```solidity
event DepositEvent(
    bytes pubkey,
    bytes withdrawal_credentials,
    uint256 amount,
    bytes signature,
    uint256 index
);
```

Every deposit emits a `DepositEvent` log for consumption by LUKSO's mainnet chain. The LUKSO genesis deposit contract does little validation, pushing most of the validator onboarding logic to LUKSO's mainnet chain. In particular, the proof of possession (a BLS12-381 signature) is not verified by the deposit contract.

### `FreezeInitiated` log

```solidity
event FreezeInitiated(
    uint256 initiatedAt,
    uint256 freezeAt
);
```

Once the contract has been frozen by the [`FREEZER`](#constants) via [`freezeContract()`](#freezecontract) function, a `FreezeInitiated` event will be emitted to signal that the freezing of the LUKSO Genesis Deposit Contract has started.

It contains two informations:

1. `initiatedAt` **when the freezing started**. The block number at which the freezing of the deposit contract started.
2. **when the deposit contract will be frozen**. The block number at which it will no longer be possible to deposit LYXe in the contract.

&nbsp;

## Public state variables

### `freezeBlockNumber`

```solidity
uint256 public freezeBlockNumber;
```

This state variable defines the block number when the LUKSO Genesis Deposit Contract will be frozen and LYXe deposits will no longer be accepted.

The value can be retrieved by calling the function `freezeBlockNumber()` on the contract (this `public` getter function automatically added for this state variable).

### `supplyVoteCounter`

```solidity
mapping(uint256 => uint256) public supplyVoteCounter;
```

This state variable maps the number of votes collected for each proposed initial supply of LYX.

- the first `uint256` index in the mapping corresponds to the initial supply of LYX (in million).
- the second `uint256` in the mapping corresponds to total number of votes for this initial supply of LYX.

For the first index:

- `0` corresponds to non votes.
- any other index can be between `1` and `100` (1 Million and 100 Millions LYX).

The number of votes for a proposed initial supply can be retrieved by calling the function `supplyVoteCounter(uint256)`, passing the initial supply as argument to the function (this `public` getter function automatically added for this state variable).

&nbsp;

## Functions

### `freezeContract()`

```solidity
function freezeContract() external;
```

The `freezeContract` function is an external function that is only callable by the [`OWNER`](#constants) of the smart contract.

Calling it will freeze the contract 46,523 blocks (around 1 week as defined by the [`FREEZE_DELAY`](#constants)) after is has been called.

> :warning: <b>Warning</b> :warning: **This action cannot be reversed!**
> It will prevent any further calls to the [`tokensReceived(...)`](#details-on-the-tokensreceived-function) function coming from the LYXe token contract and block any future deposits once the [`FREEZE_DELAY`](#constants) has passed.

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

```solidity
function depositCount() external view returns (uint256);
```

This `depositCount()` function returns the current number of deposits made to the LUKSO Genesis Deposit contract.

It retrieves the value from the `deposit_count` state variable, which is incremented each time a new deposit is successfully processed. This function can be useful for querying the total number of deposits made to the contract.

### `supportsInterface`

```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool);
```

The `supportsInterface(bytes4)` is required by the ERC165 standard. It checks if a given interface ID is the interface ID for ERC165.

&nbsp;

## Fetching all the deposit data

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

&nbsp;

## Make deposits in the LUKSOGenesisDepositContract

To make deposits in the `LUKSOGenesisDepositContract` smart contract, follow the steps outlined below. This guide assumes you have a basic understanding of Ethereum, smart contracts, and programming in JavaScript.

1. Prepare `depositData`: The `depositData` is a 209-bytes string containing the following fields:

- `pubkey`: The first 48 bytes of the string
- `withdrawal_credentials`: The following 32 bytes
- `signature`: The following 96 bytes
- `deposit_data_root`: The following 32 bytes
- `initial_supply_vote`: The last byte, representing the initial supply of LYX (in millions) that the genesis validator voted for (should be a value between 0 and 100 where 0 means non-vote)

```js
const publicKey = "0x...";
const withdrawalCredentials = "0x...";
const signature = "0x...";
const depositDataRoot = "0x..";
const vote = "0x..";

const depositData = ethers.utils.hexConcat([
  publicKey,
  withdrawalCredentials,
  signature,
  depositDataRoot,
  vote,
]); // `depositData` MUST be a 209 bytes string
```

Ensure that you have constructed the `depositData` correctly based on these specifications.

2. Instantiate the LYXeContract with a provider and its ABI: You will need:

- a JSON-RPC provider (e.g., Infura, Alchemy, or a local Ethereum node)
- the ABI (Application Binary Interface) of the `LYXeContract`

```js
// Replace with your desired provider connected to Ethereum mainnet
const provider = new ethers.providers.JsonRpcProvider(
  "your-JSON-RPC-provider-for-Ethereum-mainnet"
);

const LYXeContractABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "_data",
        type: "bytes",
      },
    ],
    name: "send",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const LYXeContract = new ethers.Contract(
  LYXeTokenAddress,
  LYXeContractABI,
  provider
);
```

3. Define the `LUKSOGenesisDepositContractAddress` and `depositAmount`:

```js
const LUKSOGenesisDepositContractAddress =
  "0x42000421dd80D1e90E56E87e6eE18D7770b9F8cC";

const depositAmount = ethers.utils.parseEther("32"); // 32 LYXe
```

4. Send the deposit transaction using the [`send(...)`](https://docs.openzeppelin.com/contracts/4.x/api/token/erc777#IERC777-send-address-uint256-bytes-) function from `LYXeContract` to send the deposit transaction. This function takes the deposit contract address (`LUKSOGenesisDepositContractAddress`), `depositAmount`, and the `depositData` as arguments.

```js
await connectedLYXeContract.send(
  LUKSOGenesisDepositContractAddress,
  depositAmount,
  depositData
);
```

After executing the above steps, the deposit transaction will be sent to the `LUKSOGenesisDepositContract`

## Audits

The following audits were conducted.

- Watchpug Audit, 2023-02-09, Final Result: [Watchpug_audit_2023_02_09.pdf](./audits/Watchpug_audit_2023_02_09.pdf)
- Trust Audit, 2023-02-09, Final Result: [Trust_audit_2023_02_09.pdf](./audits/Trust_audit_2023_02_09.pdf)

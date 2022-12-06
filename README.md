# LUKSO Genesis Deposit Contract

This document represents the specification for LUKSO genesis deposit contract.

## Constants

The following values are (non-configurable) constants used throughout the specification.

| Name                                 | Value                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `DEPOSIT_CONTRACT_TREE_DEPTH`        | `2**5` (= 32)                                                          |
| `MAX_DEPOSIT_COUNT`                  | `2**DEPOSIT_CONTRACT_TREE_DEPTH - 1`                                   |
| `amount_to_little_endian_64`         | `hex"0040597307000000"` (little endian hex value of: 32 LYXe / 1 gwei) |
| `registryAddress` (ERC1820 Registry) | `0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24`                           |
| `TOKENS_RECIPIENT_INTERFACE_HASH`    | `0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b`   |

## Configuration

> _Note_: The default mainnet configuration values are included here for spec-design purposes.

<!-- The different configurations for mainnet, testnets, and YAML-based testing can be found in the [`configs/constant_presets`](../../configs) directory. -->

These configurations are updated for releases and may be out of sync during `dev` changes.

| Name                       | Value |
| -------------------------- | ----- |
| `DEPOSIT_CHAIN_ID`         | `1`   |
| `DEPOSIT_NETWORK_ID`       | `1`   |
| `DEPOSIT_CONTRACT_ADDRESS` | `TBD` |

## Staking LUKSO genesis deposit contract

### `tokensReceived` function

```js
    function tokensReceived(
        address, /* operator */
        address, /* from */
        address, /* to */
        uint256 amount,
        bytes calldata depositData,
        bytes calldata /* operatorData */
    ) external;
```

The `tokensReceived function is meant to be called by the LYXe token smart contract which implements the ERC777 interface.

- `address operator`, `address from`, `address to`, `bytes calldata operatorData`are unused parameters.
- `uint256 amount` is the parameter that defines the amount of tokens sent by the caller (LYXe token contract)
- `bytes calldata depositData` is the parameter that is used to send all the bytes related to the deposit

#### Amount

The amount of LYXe sent to the deposit contract must be 32 LYXe.

#### DepositData

The LYXe token contract sends deposit data that is sliced and passed to the internal `_deposit` function.

The length of `userData` MUST be `208`:

- `pubkey` of 48 bytes
- `withdrawal_credentials` of 32 bytes
- `signature` of 96 bytes
- `deposit_data_root` of 32 bytes

> _Note_: The following checks are performed to ensure a successful deposit:":

- the contract should not be _"frozen"_. [See below for more details](#freezeContract-function)
- `tokensReceived` function MUST be called by the LYXe token contract
- `amount` value MUST be equal to `32 ether`
- `userData.length` MUST be equal to `208`:
  - `pubkey` of 48 bytes
  - `withdrawal_credentials` of 32 bytes
  - `signature` of 96 bytes
  - `deposit_data_root` of 32 bytes

### `freezeContract` function

```js
function freezeContract() external;
```

The `freezeContract` function is an external function that is only callable by the `owner` of the smart contract.
Calling it will change the `contractFrozen` to true. This cannot be reversed, it will prevent any further calls to the `tokensReceived` function and block any additional deposits.

### `_deposit` function

```js
function _deposit(
        bytes calldata pubkey,
        bytes calldata withdrawal_credentials,
        bytes calldata signature,
        bytes32 deposit_data_root
    ) internal
```

The deposit contract has a internal `_deposit` function to make deposits. It takes as arguments `bytes calldata pubkey, bytes calldata withdrawal_credentials, bytes calldata signature, bytes32 deposit_data_root`. The first three arguments populate a `DepositData` object, and `deposit_data_root` is the expected `DepositData` root as a protection against malformatted calldata.

#### Public key

One of the `DepositData` fields is `pubkey`. It represents a `Bytes48` BLS12-381 public key.

#### Withdrawal credentials

One of the `DepositData` fields is `withdrawal_credentials` which constrains validator withdrawals.
The first byte of this 32-byte field is a withdrawal prefix which defines the semantics of the remaining 31 bytes.
The withdrawal prefixes currently supported are `BLS_WITHDRAWAL_PREFIX` and `ETH1_ADDRESS_WITHDRAWAL_PREFIX`.

#### Signature

One of the `DepositData` fields is `signature`. It represents a `Bytes96` a BLS12-381 signature.

> _Note_: The deposit contract does not validate the `withdrawal_credentials` field.
> Support for new withdrawal prefixes can be added without modifying the deposit contract.

#### `DepositEvent` log

Every deposit emits a `DepositEvent` log for consumption by the beacon chain. The LUKSO genesis deposit contract does little validation, pushing most of the validator onboarding logic to the beacon chain. In particular, the proof of possession (a BLS12-381 signature) is not verified by the deposit contract.

### `get_deposit_count` function

```js
function get_deposit_count() external view returns (bytes memory);
```

The `view` function get the current deposit count and converts it to a little endian representation of 64-bit values.

### `get_deposit_data_by_index` function

```js
function get_deposit_data_by_index(uint256 index) external view returns (bytes memory);
```

The function returns the deposit data at the specified index which is then used to create a new validator in the beacon chain.

### `supportsInterface` function

```js
function supportsInterface(bytes4 interfaceId) external pure returns (bool);
```

This function implements the function supportsInterface() which is needed for the ERC165 standard. It checks if the interface ID passed in matches the interface ID for ERC165 or the interface ID for IDepositContract.

### `deposit_count` public state variable

This state variable called 'deposit_count' is used to store the number of deposits that have been made. Since the variable is public, it comes with a getter that will return the number of deposits .

### `owner` public immutable variable

This immutable variable called `owner` is used to store the address of the smart contract's owner. Since the variable is public, it it comes with a getter that will return the owner.

### `isContractFrozen` public state variable

This state variable called `isContractFrozen` will store a boolean that state whether the contract is frozen. Since the variable is public, it it comes with a getter that will return the frozen's status of the contract.

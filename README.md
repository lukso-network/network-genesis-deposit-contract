# LUKSO Genesis Deposit Contract

This document represents the specification for the LUKSO genesis deposit contract. Modified from [ETH2 Deposit Contract](https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/deposit-contract.md).

## Constants

The following values are (non-configurable) constants used throughout the specification.

| Name                                 | Value                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `amount_to_little_endian_64`         | `hex"0040597307000000"` (little endian hex value of: 32 LYXe / 1 gwei) |
| `registryAddress` (ERC1820 Registry) | `0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24`                           |
| `TOKENS_RECIPIENT_INTERFACE_HASH`    | `0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b`   |

## Configuration

> _Note_: The default mainnet configuration values are included here for spec-design purposes.

These configurations are updated for releases and may be out of sync during `dev` changes.

| Name                       | Value |
| -------------------------- | ----- |
| `DEPOSIT_CHAIN_ID`         | `1`   |
| `DEPOSIT_NETWORK_ID`       | `1`   |
| `DEPOSIT_CONTRACT_ADDRESS` | `TBD` |

## LUKSO genesis deposit contract

The genesis deposit contract will accept LYXe Tokens (`0xA8b919680258d369114910511cc87595aec0be6D`) only. The contract is notified by the ERC777 LYXe smart contract using the `tokensReceived()` function below.

People wishing to deposit needs to call the [`send(..)`](https://docs.openzeppelin.com/contracts/3.x/api/token/erc777#IERC777-send-address-uint256-bytes-) function or have an operator call the [`operatorSend(..)`](https://docs.openzeppelin.com/contracts/3.x/api/token/erc777#IERC777-operatorSend-address-address-uint256-bytes-bytes-) with passing **[depositData](#depositdata)** as `data` parameter.

> Calling via `transfer(..)` or `transferFrom(..)` will result in a revert of the transaction.

This contract will be used to make deposit in order to become validator on LUKSO's Mainnet chain. Once enough validators have deposited, contract will be frozen and the chain will start.

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

The `tokensReceived` function will be called by the LYXe token smart contract, which implements the ERC777 interface.

- `address operator`, `address from`, `address to`, `bytes calldata operatorData` are unused parameters.
- `uint256 amount` The amount of LYXe sent by the sender (32 LYXe)
- `bytes calldata depositData` is the parameter that is used to send all the bytes related to the deposit

#### Amount

The amount of LYXe sent to the deposit contract must be 32 LYXe.

#### DepositData

The LYXe token contract is sending `depositData` which will be sliced and passed to the internal `_deposit` function. This `depositData` is made up of four pieces of information:

- `pubkey` of 48 bytes
- `withdrawal_credentials` of 32 bytes
- `signature` of 96 bytes
- `deposit_data_root` of 32 bytes
- `supply` of 1 byte

> _Note_: The following checks are performed to ensure a successful deposit:

- the contract should not be _"frozen"_. [See below for more details](#freezeContract-function)
- `tokensReceived` function MUST be called by the LYXe token contract
- `amount` value MUST be equal to `32 ether`
- `depositData.length` MUST be equal to `209`:
  - `pubkey` of 48 bytes
  - `withdrawal_credentials` of 32 bytes
  - `signature` of 96 bytes
  - `deposit_data_root` of 32 bytes
  - `supply` of 1 byte (value between 0 and 100 where 0 means non-vote)

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

Every deposit emits a `DepositEvent` log for consumption by LUKSO's mainnet chain. The LUKSO genesis deposit contract does little validation, pushing most of the validator onboarding logic to LUKSO's mainnet chain. In particular, the proof of possession (a BLS12-381 signature) is not verified by the deposit contract.

### `freezeContract` function

```js
function freezeContract() external;
```

The `freezeContract` function is an external function that is only callable by the `owner` of the smart contract.
Calling it will freeze the contract 100 blocks after is has been called. This cannot be reversed, it will prevent any further calls to the `tokensReceived` function and block any additional deposits.

### `getDepositData` function

```js
function getDepositData() external view override returns (bytes[] memory returnedArray);
```

The `getDepositData` function returns the list of deposits currently stored in the contract. It takes no parameters and returns an array of bytes values, where each value represents the data for a single deposit.

### `getDepositDataByIndex` function

```js
function getDepositDataByIndex(uint256 index) external view returns (bytes memory);
```

The function returns the deposit data at the specified index which is then used to create a new validator in LUKSO's mainnet chain.

### `getsVotesPerSupply` function

```js
function getsVotesPerSupply() external view returns (uint256[101] memory votesPerSupply, uint256 totalVotes);
```

The getsVotesPerSupply function retrieves essential information about LYX initial supply votes. It gathers the number of votes per supply and the total number of deposits, which will be used to determine LUKSO's blockchain initial supply voted for by the Genesis Validators.

### `isPubkeyRegistered` public view function

This public view function called isPubkeyRegistered accepts a public key as input and checks whether the given public key is registered or not. It calculates the hash of the provided public key and looks up the result in the isHashOfPubkeyRegistered mapping, which stores whether the hash of a public key is registered. The function returns a boolean value, where true indicates that the public key is registered, and false otherwise.

### depositCount public view function

This public view function called depositCount returns the current number of deposits made to the contract. It retrieves the value from the deposit_count state variable, which is incremented each time a new deposit is successfully processed. This function can be useful for querying the total number of deposits made to the contract.

### `supportsInterface` function

```js
function supportsInterface(bytes4 interfaceId) external pure returns (bool);
```

The `supportsInterface` is required by the ERC165 standard. It checks if a given interface ID is the interface ID for ERC165.

### `owner` public immutable variable

This immutable variable called `owner` is used to store the address of the smart contract's owner. Since the variable is public, it it comes with a getter that will return the owner of the smart contract.

### `isContractFrozen` public state variable

This state variable called `isContractFrozen` will store a boolean that state whether the contract is frozen. Since the variable is public, it it comes with a getter that will return the frozen's status of the contract.

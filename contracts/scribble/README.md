# Installation

**1 - Install Scribble**

Follow the [installation instructions for Scribble](https://docs.scribble.codes/tool/installation)

```
npm install -g eth-scribble
```

**2 - Install MythX + Set `MYTHX_API_KEY`**

[https://mythx-cli.readthedocs.io/en/latest/installation.html#stable-release](https://mythx-cli.readthedocs.io/en/latest/installation.html#stable-release)

```
pip install mythx-cli
```

[https://docs.mythx.io/#using-your-account](https://docs.mythx.io/#using-your-account)

# run Mythx with Scribble annotations

```
mythx analyze --mode deep --scribble contracts/scribble/LUKSODepositContract_Scribble.sol
```

# generate instrumented contract

## in Solidity

```
scribble contracts/scribble/LUKSODepositContract_Scribble.sol --output-mode flat --output contracts/scribble/LUKSODepositContract.instrumented.sol
```

## in JSON

```
scribble contracts/scribble/LUKSODepositContract_Scribble.sol --output-mode json --output contracts/scribble/LUKSODepositContract.instrumented.json
```

## Properties tested

### `deposit_count`

```solidity
/// #if_updated {:msg "the deposit count always increment"} old(deposit_count) < deposit_count && deposit_count == old(deposit_count) + 1;
uint256 internal deposit_count;
```

### `tokensReceived(...)`

```solidity
/// #if_succeeds {:msg "Deposit increases the deposit count" } deposit_count == old(deposit_count) + 1;
/// #if_succeeds {:msg "Was called by the LYX token contract" } msg.sender == LYX_TOKEN_CONTRACT_ADDRESS;
/// #if_succeeds {:msg "The `to` address must be the DepositContract (= this contract)" } to == address(this);
/// #if_succeeds {:msg "The `amount` is 32 LYXe" } amount == 32 ether;
/// #if_succeeds {:msg "The deposit data has the correct length" } depositData.length == 209;
/// #if_succeeds {:msg "The data deposited has the correct length" } deposit_data[deposit_count].length == 209;
/// #if_succeeds {:msg "The depositor had at least 32 LYXe in its balance" } old(IERC777(LYX_TOKEN_CONTRACT_ADDRESS).balanceOf(from) >= 32 ether);
/// #if_succeeds {:msg "The DepositContract will have +32 LYXe added to its LYXe balance" } IERC777(LYX_TOKEN_CONTRACT_ADDRESS).balanceOf(address(this)) == old(IERC777(LYX_TOKEN_CONTRACT_ADDRESS).balanceOf(address(this))) + 32 ether;
/// #if_succeeds {:msg "The depositor will have -32 LYXe substracted from its LYXe balance" } IERC777(LYX_TOKEN_CONTRACT_ADDRESS).balanceOf(msg.sender) == old(IERC777(LYX_TOKEN_CONTRACT_ADDRESS).balanceOf(msg.sender)) - 32 ether;
/// #if_succeeds {:msg "The sum of depositor and DepositContract balance remains the same"} IERC777(LYX_TOKEN_CONTRACT_ADDRESS).balanceOf(address(this)) + IERC777(LYX_TOKEN_CONTRACT_ADDRESS).balanceOf(from) == old(IERC777(LYX_TOKEN_CONTRACT_ADDRESS).balanceOf(address(this))) + old(IERC777(LYX_TOKEN_CONTRACT_ADDRESS).balanceOf(from));
function tokensReceived(
    address, /* operator */
    address from,
    address to,
    uint256 amount,
    bytes calldata depositData,
    bytes calldata /* operatorData */
) external;
```

### `freezeContract()`

```solidity
/// #if_succeeds {:msg "Contract is frozen" } isContractFrozen == true;
function freezeContract() external
```

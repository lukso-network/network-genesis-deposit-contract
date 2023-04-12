# run Mythx with Scribble annotations

```
mythx analyze --mode deep --scribble contracts/scribble/LUKSODepositContract_flat.sol
```

# generate instrumented contract

## in Solidity

```
scribble contracts/scribble/LUKSODepositContract_flat.sol --output-mode flat --output contracts/scribble/LUKSODepositContract.instrumented.sol
```

## in JSON

```
scribble contracts/scribble/LUKSODepositContract_flat.sol --output-mode json --output contracts/scribble/LUKSODepositContract.instrumented.json
```

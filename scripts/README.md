# Run the Script to generate deposit contract address

1. You will need to use the [`eth-create2-calculator`](https://www.npmjs.com/package/eth-create2-calculator) which is part of the dev dependencies of the repo.

Install all the dependencies from the `package-lock.json` using the following command:

```sh
npm ci
```

2. Build the contract bytecode

```sh
// clean the current artifacts
npm run clean

// compile the Solidity contracts
npx hardhat compile --force
```

3. run the script to find the deposit contract address

```sh
npx hardhat run scripts/findDepositAddress.ts
```

The script will find salts and contract addresses according to the regex pattern and write them to a file called `salt.txt`

> :warning: if you stop the script, **make sure you have saved your previously generated salts into an other file!**
> Re-running the script will override all the content of the `salt.txt` file. All your previously generated salts will be lost.

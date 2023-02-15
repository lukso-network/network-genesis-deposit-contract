import { ethers } from "hardhat";

async function main() {
  const DepositContract = await ethers.getContractFactory(
    "LUKSOGenesisValidatorsDepositContract"
  );

  const ownerAddress = await DepositContract.signer.getAddress();

  console.log("owner address: ", ownerAddress);

  console.log(
    "balance of owner on chain: ",
    await DepositContract.signer.getBalance()
  );

  const depositContract = await DepositContract.deploy(ownerAddress, {
    gasPrice: 25000000,
  });
  await depositContract.deployed();

  console.log(
    "LUKSOGenesisValidatorsDepositContract deployed to:",
    depositContract.address
  );

  // 0xa5594Cd0f68eDf204A49B62eaA19Acb6376FE8Ad
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

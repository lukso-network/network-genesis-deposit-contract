import { ethers } from "hardhat";

async function main() {
  const DepositContract = await ethers.getContractFactory("DepositMock");

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

  // 0x6f5f4eD871D186B97ceAAeB6Ba250AD21f62B443
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

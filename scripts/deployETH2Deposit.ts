import { ethers } from "hardhat";

async function main() {
  const DepositContract = await ethers.getContractFactory("ETH2DepositContract");


  const depositContract = await DepositContract.deploy();
  await depositContract.deployed();

  console.log(
    "ETH2DepositContract deployed to:",
    depositContract.address
  );

  //
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

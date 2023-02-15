import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const depositAddress = "0x6f5f4eD871D186B97ceAAeB6Ba250AD21f62B443";

  const depositContract = await ethers.getContractAt(
    "DepositMock",
    depositAddress
  );

  await depositContract.freezeContract();

  console.log("Deposit contract frozen");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const depositAddress = "0x75D1f4695Eb87d60eD4EAE2c0CF05e7428Fa4b5F";

  const depositContract = await ethers.getContractAt(
    "DepositMock",
    depositAddress
  );

  const depositDatas = await depositContract.getDepositData();

  // Write the deposit data to a file
  fs.writeFileSync("depositData.json", JSON.stringify(depositDatas));

  console.log("Deposit data written to depositData.json");
  const numberOfDeposits = await depositContract.depositCount();
  console.log('number of deposit: ', numberOfDeposits.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { ethers } from "hardhat";
import { generateDepositData } from "../tests/helpers";
import { DEPOSIT_AMOUNT } from "../tests/constants";

async function main() {
  const depositAddress = "0x6f5f4eD871D186B97ceAAeB6Ba250AD21f62B443";

  const depositContract = await ethers.getContractAt(
    "DepositMock",
    depositAddress
  );

  const depositDatas = await depositContract.getDepositData();

  console.log(depositDatas);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

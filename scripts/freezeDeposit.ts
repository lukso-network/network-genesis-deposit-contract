import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const depositAddress = "0x62119e501fc410130F7a0dA51052f835993ce0fA";

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

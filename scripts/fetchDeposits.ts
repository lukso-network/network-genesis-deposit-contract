import { ethers } from "hardhat";
import fs from "fs";

type DepositData = {
  deposit_data_root: string;
  pubkey: string;
  signature: string;
  amount: number;
  version: number;
  withdrawal_credentials: string;
};

function parseData(data: string[]): DepositData[] {
  const result: DepositData[] = [];

  for (let item of data) {
    item = item.slice(2); // remove 0x
    const pubkey = item.slice(0, 96);
    const withdrawal_credentials = item.slice(96, 160);
    const signature = item.slice(160, 352);
    const deposit_data_root = item.slice(352, 416);

    result.push({
      deposit_data_root,
      pubkey,
      signature,
      amount: 32000000000,
      version: 1,
      withdrawal_credentials,
    });
  }

  return result;
}

async function main() {
  // Todo: replace with LUKSOGenesisDeposit contract's address on Ethereum
  const depositAddress = "0x62119e501fc410130F7a0dA51052f835993ce0fA";

  const depositContract = await ethers.getContractAt(
    "DepositMock",
    depositAddress
  );

  const depositDatas = await depositContract.getDepositData();

  const jsonData = parseData(depositDatas);

  fs.writeFile("depositData.json", JSON.stringify(jsonData, null, 2), (err) => {
    if (err) {
      console.error("Error writing file:", err);
    } else {
      console.log("File written successfully");
    }
  });

  console.log("Deposit data written to depositData.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

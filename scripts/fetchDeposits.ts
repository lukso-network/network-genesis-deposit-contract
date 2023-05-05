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
  const genesisDepositContractAddress =
    "0x42000421dd80D1e90E56E87e6eE18D7770b9F8cC";

  const depositContract = await ethers.getContractAt(
    "LUKSOGenesisValidatorsDepositContract",
    genesisDepositContractAddress
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

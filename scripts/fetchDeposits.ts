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
  const depositAddress = "0x9C2Ae5bC047Ca794d9388aB7A2Bf37778f9aBA73";

  const depositContract = await ethers.getContractAt(
    "DepositMock",
    depositAddress
  );

  const depositDatas = await depositContract.getDepositData();
  //consoel.log last value of depositDatas is the number of deposits
  console.log(depositDatas[depositDatas.length - 1].toString());
  const jsonData = parseData(depositDatas);
  // last array of depositData
  const lastDepositData = jsonData[jsonData.length - 1];
  console.log(lastDepositData);
  fs.writeFile('depositData.json', JSON.stringify(jsonData, null, 2), (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log('File written successfully');
    }
  });

  console.log("Deposit data written to depositData.json");
  const numberOfDeposits = await depositContract.depositCount();
  console.log('number of deposit: ', numberOfDeposits.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

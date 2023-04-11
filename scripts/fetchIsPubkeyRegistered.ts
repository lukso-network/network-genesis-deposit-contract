import { ethers } from "hardhat";

async function main() {
  const depositAddress = "0x62119e501fc410130F7a0dA51052f835993ce0fA";
  const pubKey =
    "0xb099e16ff38706cb388d57fd317f5dadb9277071ae8737ec31d88df8fd8a7f284ebc8dd1f7c2728cbb09a7afecf9761d";

  const depositContract = await ethers.getContractAt(
    "DepositMock",
    depositAddress
  );

  console.log(
    "Is pubKey registered: ",
    await depositContract.isPubkeyRegistered(pubKey)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

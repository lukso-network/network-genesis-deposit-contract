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

  // 0x75D1f4695Eb87d60eD4EAE2c0CF05e7428Fa4b5F
  // devnet3030 0x9C2Ae5bC047Ca794d9388aB7A2Bf37778f9aBA73
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

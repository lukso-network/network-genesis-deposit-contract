import { ethers } from "hardhat";

async function main() {
  const ERC1820RegistryContract = await ethers.getContractFactory(
    "ERC1820Registry"
  );

  const registryContract = await ERC1820RegistryContract.deploy();
  await registryContract.deployed();

  console.log("registryContract deployed to:", registryContract.address);

  // 0xFb1c796d4848Fa100E42507a7954358edFF852cf
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { ethers } from "hardhat";

async function main() {
  const ERC1820RegistryContract = await ethers.getContractFactory(
    "ERC1820Registry"
  );

  const registryContract = await ERC1820RegistryContract.deploy();
  await registryContract.deployed();

  console.log("registryContract deployed to:", registryContract.address);

  // devnet2022 0x03BB0cBbc9dd38b5e7dD32e42c89fB00B61fCCB1
  // devnet3030 0x2C99d98F179Feaa3fd7DD4D29d0E3A5aB617E217
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { ethers } from "hardhat";

async function main() {
  const ERC1820RegistryContract = await ethers.getContractFactory(
    "ERC1820Registry"
  );

  const registryContract = await ERC1820RegistryContract.deploy();
  await registryContract.deployed();

  console.log("registryContract deployed to:", registryContract.address);

  // 0xa5594Cd0f68eDf204A49B62eaA19Acb6376FE8Ad
  // devnet3030 0x03BB0cBbc9dd38b5e7dD32e42c89fB00B61fCCB1
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

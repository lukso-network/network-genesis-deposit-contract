import { ethers } from "hardhat";

async function main() {
  const ERC1820RegistryContract = await ethers.getContractFactory(
    "ERC1820Registry"
  );

  const registryContract = await ERC1820RegistryContract.deploy();
  await registryContract.deployed();

  console.log("registryContract deployed to:", registryContract.address);

  // devnet2022 0x03BB0cBbc9dd38b5e7dD32e42c89fB00B61fCCB1
  // devnet3030 0x7B5C5158E5AAe4244873Dd75a81E9bbBc4d0fc38
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

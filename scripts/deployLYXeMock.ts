import { ethers } from "hardhat";
import { constants } from "ethers";

async function main() {
  const LYXeContract = await ethers.getContractFactory("ReversibleICOToken");

  // get deployer address
  const deployerAddress = await LYXeContract.signer.getAddress();

  const lyxeContract = await LYXeContract.deploy("LYXe", "LYXe", []);
  await lyxeContract.deployed();

  console.log("lyxeContract deployed to:", lyxeContract.address);

  // zero address
  const zeroAddress = constants.AddressZero;

  // init contract
  await lyxeContract.init(
    zeroAddress,
    deployerAddress,
    deployerAddress,
    deployerAddress,
    ethers.utils.parseEther("1000000000000000000000000")
  );

  // 0x2e45693F85307A5e7AfB3aA91d53Bbf3324dF9FB
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

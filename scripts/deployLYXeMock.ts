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

  // 0x7A2AC110202ebFdBB5dB15Ea994ba6bFbFcFc215
  // devnet3030 0x790c4379C82582F569899b3Ca71E78f19AeF82a5
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

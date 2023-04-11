import { ethers } from "hardhat";
import { constants } from "ethers";

async function main() {
  const lyxeAddress = "0x4455916E64552A0D20047b4F440ADACABAC190CD";
  const lyxeContract = await ethers.getContractAt(
    "ReversibleICOToken",
    lyxeAddress
  );

  const deployerAddress = await lyxeContract.signer.getAddress();

  await lyxeContract.init(
    constants.AddressZero,
    deployerAddress,
    deployerAddress,
    deployerAddress,
    ethers.utils.parseEther("1000000000000000000000000")
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

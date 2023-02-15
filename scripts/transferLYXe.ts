import { ethers } from "hardhat";

async function main() {
  const lyxeContractAddress = "0x2e45693F85307A5e7AfB3aA91d53Bbf3324dF9FB";
  const lyxeReceiver = "0x4B88Ee55991a2Fd2744ecfbb300d95E033aA53A9";

  const LYXeContract = await ethers.getContractFactory("ReversibleICOToken");

  const lyxeContract = LYXeContract.attach(lyxeContractAddress);

  // mint 1000 LYXe to the receiver
  const tx = await lyxeContract.send(lyxeReceiver, 10000, "0x");
  await tx.wait();

  const balance = await lyxeContract.balanceOf(lyxeReceiver);
  console.log("balance of receiver: ", balance.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

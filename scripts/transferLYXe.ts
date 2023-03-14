import { ethers } from "hardhat";

async function main() {
  const lyxeContractAddress = "0x790c4379C82582F569899b3Ca71E78f19AeF82a5";
  const lyxeReceiver = "0x2ae4B27f7Af291890Edb293D44E195A34B395c9A";

  const LYXeContract = await ethers.getContractFactory("ReversibleICOToken");

  const lyxeContract = LYXeContract.attach(lyxeContractAddress);

  const balanceBefore = await lyxeContract.balanceOf(lyxeReceiver);
  console.log('balance before: ', balanceBefore)

  // mint 1000 LYXe to the receiver
  const tx = await lyxeContract.send(lyxeReceiver, ethers.utils.parseEther('9600'), "0x");
  await tx.wait();

  const balance = await lyxeContract.balanceOf(lyxeReceiver);
  console.log("balance of receiver: ", balance.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

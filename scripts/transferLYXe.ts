import { ethers } from "hardhat";

async function main() {
  const lyxeContractAddress = "0x7A2AC110202ebFdBB5dB15Ea994ba6bFbFcFc215";
  const lyxeReceiver = "0x0eCC079C20DaA9fDE0e26b6d745c0b38479ff200";

  const LYXeContract = await ethers.getContractFactory("ReversibleICOToken");

  const lyxeContract = LYXeContract.attach(lyxeContractAddress);

  const balanceBefore = await lyxeContract.balanceOf(lyxeReceiver);
  console.log('balance before: ', balanceBefore)

  // mint 1000 LYXe to the receiver
  const tx = await lyxeContract.send(lyxeReceiver, ethers.utils.parseEther('1000'), "0x");
  await tx.wait();

  const balance = await lyxeContract.balanceOf(lyxeReceiver);
  console.log("balance of receiver: ", balance.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

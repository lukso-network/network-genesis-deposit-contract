import { ethers } from "hardhat";
import { generateDepositData } from "../tests/helpers";
import { DEPOSIT_AMOUNT } from "../tests/constants";

async function main() {
  const lyxeContractAddress = "0x2e45693F85307A5e7AfB3aA91d53Bbf3324dF9FB";
  const depositAddress = "0x6f5f4eD871D186B97ceAAeB6Ba250AD21f62B443";

  const makeDeposit = async (
    lyxeContractAddress: string,
    depositAddress: string
  ) => {
    const lyxeContract = await ethers.getContractAt(
      "ReversibleICOToken",
      lyxeContractAddress
    );

    const { depositDataHex } = generateDepositData();

    const votePossibilities = [35, 42, 100];

    // pick a random vote
    const vote =
      votePossibilities[Math.floor(Math.random() * votePossibilities.length)];

    const voteHex = vote.toString(16).padStart(2, "0");

    console.log(voteHex);

    // append vote to deposit data
    const depositDataWithVote = depositDataHex + voteHex;

    console.log(depositDataWithVote);

    const tx = await lyxeContract.send(
      depositAddress,
      DEPOSIT_AMOUNT,
      depositDataWithVote
    );
    await tx.wait();
  };

  // make 100 deposits
  for (let i = 0; i < 100; i++) {
    await makeDeposit(lyxeContractAddress, depositAddress);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

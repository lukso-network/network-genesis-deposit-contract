import { ethers } from "hardhat";
import { generateDepositData } from "../tests/helpers";
import { DEPOSIT_AMOUNT } from "../tests/constants";

async function main() {
  const lyxeContractAddress = "0x4455916E64552A0D20047b4F440ADACABAC190CD";
  const depositAddress = "0x62119e501fc410130F7a0dA51052f835993ce0fA";

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

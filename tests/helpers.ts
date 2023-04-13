import { ethers } from "ethers";
import depositDataJSON from "./deposit_data-test.json";

export const toLittleEndian64 = (bytes8Number: string) => {
  if (bytes8Number.length < 18)
    bytes8Number = ethers.utils.hexlify(ethers.utils.zeroPad(bytes8Number, 8));
  else bytes8Number = bytes8Number.substring(0, 18);

  let newBytes8Number: string = "0x";

  for (let i = 0; i < 16; i += 2) {
    newBytes8Number =
      newBytes8Number + bytes8Number[18 - i - 2] + bytes8Number[18 - i - 1];
  }

  return newBytes8Number;
};

export const getDepositDataByIndex = (index: number) => {
  if (index < 0 || index >= depositDataJSON.length) {
    throw new Error("Invalid index");
  }

  const {
    pubkey,
    withdrawal_credentials,
    amount,
    signature,
    deposit_message_root,
    deposit_data_root,
    fork_version,
    network_name,
    deposit_cli_version,
  } = depositDataJSON[index];

  const prefixedPubkey = `0x${pubkey}`;
  const prefixedWithdrawalCredentials = `0x${withdrawal_credentials}`;
  const prefixedSignature = `0x${signature}`;
  const prefixedDepositDataRoot = `0x${deposit_data_root}`;

const depositData = ethers.utils.hexConcat([
    prefixedPubkey,
    prefixedWithdrawalCredentials,
    prefixedSignature,
    prefixedDepositDataRoot,
])

  const depositDataHex = ethers.utils.hexlify(depositData);

  const supplyVoteByte = generateHexBetweenOneAndOneHundred();

  const depositDataWithSupplyVote = ethers.utils.hexConcat([
    depositData,
    `0x${supplyVoteByte}`
])

  const depositDataWithSupplyVoteHex = ethers.utils.hexlify(
    depositDataWithSupplyVote
  );

  return {
    pubkey,
    withdrawal_credentials,
    amount,
    signature,
    deposit_message_root,
    deposit_data_root,
    fork_version,
    network_name,
    deposit_cli_version,
    depositDataHex,
    depositDataWithSupplyVoteHex,
  };
};

export function getInterfaceID(contractInterface: ethers.utils.Interface) {
  let interfaceID: ethers.BigNumber = ethers.constants.Zero;
  const functions: string[] = Object.keys(contractInterface.functions);
  for (let i = 0; i < functions.length; i++) {
    interfaceID = interfaceID.xor(contractInterface.getSighash(functions[i]));
  }

  return interfaceID.toHexString();
}

export function generateHexBetweenOneAndOneHundred(): string {
  const value = Math.floor(Math.random() * 100) + 1;
  return value.toString(16).padStart(2, "0");
}

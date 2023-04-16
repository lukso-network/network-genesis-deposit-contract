import { ethers } from "ethers";
import depositDataJSON from "./deposit_data-mainnet.json";

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
  ]);

  const depositDataHex = ethers.utils.hexlify(depositData);

  const supplyVoteByte = generateHexBetweenOneAndOneHundred();

  const depositDataWithSupplyVote = ethers.utils.hexConcat([
    depositData,
    `0x${supplyVoteByte}`,
  ]);

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

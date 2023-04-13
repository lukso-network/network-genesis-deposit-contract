import { ethers } from "ethers";

const generateDepositDataRoot = (
  pubkey: string,
  withdrawal_credentials: string,
  signature: string
) => {
  const pubkey_root = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes", "bytes16"],
      [pubkey, "0x" + "0".repeat(32)]
    )
  );
  const signature_root = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes32", "bytes32"],
      [
        ethers.utils.keccak256(
          ethers.utils.solidityPack(["bytes"], [signature.substring(0, 130)])
        ),
        ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ["bytes", "bytes32"],
            ["0x" + signature.substring(130, 194), "0x" + "0".repeat(64)]
          )
        ),
      ]
    )
  );
  const node = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes32", "bytes32"],
      [
        ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ["bytes32", "bytes"],
            [pubkey_root, withdrawal_credentials]
          )
        ),
        ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ["uint256", "bytes24", "bytes32"],
            [ethers.utils.parseEther("32"), "0x" + "0".repeat(48), signature_root]
          )
        ),
      ]
    )
  );
  return node;
};


export const generateDepositData = () => {
  const pubkey = ethers.utils.hexlify(ethers.utils.randomBytes(48));
  const withdrawal_credentials = ethers.utils.hexlify(
    ethers.utils.randomBytes(32)
  );
  const signature = ethers.utils.hexlify(ethers.utils.randomBytes(96));
  const deposit_data_root = generateDepositDataRoot(
    pubkey,
    withdrawal_credentials,
    signature
  );
  // append pubkey + withdrawal_credentials + signature + depositDataRoot to depositData
  const depositData = ethers.utils.concat([
    pubkey,
    withdrawal_credentials,
    signature,
    deposit_data_root,
  ]);

  // hexlify depositData
  const depositDataHex = ethers.utils.hexlify(depositData);
  return {
    pubkey,
    withdrawal_credentials,
    signature,
    deposit_data_root,
    depositDataHex,
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

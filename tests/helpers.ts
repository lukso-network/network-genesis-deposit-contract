import { ethers } from "ethers";

export const generateDepositDataRoot = (
  pubkey: string,
  withdrawal_credentials: string,
  signature: string
) => {
  const pubkey_root = ethers.utils.sha256(
    ethers.utils.solidityPack(
      ["bytes", "bytes16"],
      [pubkey, "0x" + "0".repeat(32)]
    )
  );
  const signature_root = ethers.utils.sha256(
    ethers.utils.solidityPack(
      ["bytes32", "bytes32"],
      [
        ethers.utils.sha256(
          ethers.utils.solidityPack(["bytes"], [signature.substring(0, 130)])
        ),
        ethers.utils.sha256(
          ethers.utils.solidityPack(
            ["bytes", "bytes32"],
            ["0x" + signature.substring(130, 194), "0x" + "0".repeat(64)]
          )
        ),
      ]
    )
  );
  const node = ethers.utils.sha256(
    ethers.utils.solidityPack(
      ["bytes32", "bytes32"],
      [
        ethers.utils.sha256(
          ethers.utils.solidityPack(
            ["bytes32", "bytes"],
            [pubkey_root, withdrawal_credentials]
          )
        ),
        ethers.utils.sha256(
          ethers.utils.solidityPack(
            ["bytes", "bytes24", "bytes32"],
            ["0x0040597307000000", "0x" + "0".repeat(48), signature_root]
          )
        ),
      ]
    )
  );
  return node;
};

export const toLittleEndian64 = (bytes8Number: string) => {
  let newBytes8Number: string = "0x";

  for (let i = 0; i < 16; i += 2) {
    newBytes8Number =
      newBytes8Number + bytes8Number[18 - i - 2] + bytes8Number[18 - i - 1];
  }

  return newBytes8Number;
};

export const generateMerkleTreeBranch = (orderedDataAdded: string[]) => {
  // The main Branch of the Merkle Tree
  const branch: string[] = [];

  // The depth of the Merkle Tree
  const DEPOSIT_CONTRACT_TREE_DEPTH = 32;

  // initialize the branch of the merkle tree
  for (let height = 0; height < DEPOSIT_CONTRACT_TREE_DEPTH; height++) {
    branch[height] = "0x" + "0".repeat(64);
  }

  // add each data to merkle tree in order
  for (let i = 0; i < orderedDataAdded.length; i++) {
    let size = i + 1;
    let node = "0x" + orderedDataAdded[i].substring(418 - 64);
    for (let height = 0; height < DEPOSIT_CONTRACT_TREE_DEPTH; height++) {
      if ((size & 1) == 1) {
        branch[height] = node;
        break;
      }
      node = ethers.utils.sha256(
        ethers.utils.solidityPack(
          ["bytes32", "bytes32"],
          [branch[height], node]
        )
      );
      size /= 2;
    }
  }
  return branch;
};

export const getMerkleTreeRoot = (orderedDataArray: string[]) => {
  // The depth of the Merkle Tree
  const DEPOSIT_CONTRACT_TREE_DEPTH = 32;

  // The main Branch of the Merkle Tree
  const branch: string[] = generateMerkleTreeBranch(orderedDataArray);
  const zero_hashes: string[] = [];

  // initialize the branch of the merkle tree
  for (let height = 0; height < DEPOSIT_CONTRACT_TREE_DEPTH; height++) {
    zero_hashes[height] = "0x" + "0".repeat(64);
  }
  for (let height = 0; height < DEPOSIT_CONTRACT_TREE_DEPTH - 1; height++) {
    zero_hashes[height + 1] = ethers.utils.sha256(
      ethers.utils.solidityPack(
        ["bytes32", "bytes32"],
        [zero_hashes[height], zero_hashes[height]]
      )
    );
  }

  let node = "0x" + "0".repeat(64);
  let size = orderedDataArray.length;

  for (let height = 0; height < DEPOSIT_CONTRACT_TREE_DEPTH; height++) {
    if ((size & 1) == 1) {
      node = ethers.utils.sha256(
        ethers.utils.solidityPack(
          ["bytes32", "bytes32"],
          [branch[height], node]
        )
      );
    } else {
      node = ethers.utils.sha256(
        ethers.utils.solidityPack(
          ["bytes32", "bytes32"],
          [node, zero_hashes[height]]
        )
      );
    }
    size /= 2;
  }

  return ethers.utils.sha256(
    ethers.utils.solidityPack(
      ["bytes32", "bytes", "bytes24"],
      [
        node,
        toLittleEndian64(
          ethers.utils.hexZeroPad(
            ethers.utils.hexlify(orderedDataArray.length),
            8
          )
        ),
        "0x" + "0".repeat(48),
      ]
    )
  );
};

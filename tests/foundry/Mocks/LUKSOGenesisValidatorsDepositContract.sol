// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;


contract LUKSOGenesisValidatorsDepositContractMock {
    function convertBytesToBytes32(bytes memory inBytes)
        public
        pure
        returns (bytes32 outBytes32)
    {
        bytes memory memoryInBytes = inBytes;
        assembly {
            outBytes32 := mload(add(memoryInBytes, 32))
        }
    }

    function toLittleEndian64(uint64 value) public pure returns (bytes memory ret) {
        ret = new bytes(8);
        bytes8 bytesValue = bytes8(value);
        // Byteswapping during copying to bytes.
        ret[0] = bytesValue[7];
        ret[1] = bytesValue[6];
        ret[2] = bytesValue[5];
        ret[3] = bytesValue[4];
        ret[4] = bytesValue[3];
        ret[5] = bytesValue[2];
        ret[6] = bytesValue[1];
        ret[7] = bytesValue[0];
    }

}

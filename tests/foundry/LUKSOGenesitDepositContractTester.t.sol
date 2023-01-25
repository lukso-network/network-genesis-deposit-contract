// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import "forge-std/Test.sol";
import './Mocks/LUKSOGenesisValidatorsDepositContract.sol';


contract LUKSOGenesitDepositContractTester is Test {
    LUKSOGenesisValidatorsDepositContractMock contractMock;

    function setUp() public {
        contractMock = new LUKSOGenesisValidatorsDepositContractMock();
    }

    function testConvertBytesToBytes32(uint256 randomNumber) public {
        bytes memory randomBytes = _getRandom208Bytes(randomNumber);
        bytes32 outBytes32 = contractMock.convertBytesToBytes32(randomBytes);
        assertEq(outBytes32, bytes32(randomBytes));

    }

    function testToLittleEndianValue(uint64 value) public {
        bytes memory littleEndianBytes = contractMock.toLittleEndian64(value);
        assertEq(littleEndianBytes.length, 8);

        for (uint i = 0; i < 8; i++) {
            require(uint64(uint8(littleEndianBytes[i])) == (value >> (i*8)) & 0xff);
        }
    }

    function _getRandom208Bytes(uint256 randomNumber) internal  returns (bytes memory) {
        bytes memory randomBytes = new bytes(208);
        for (uint i = 0; i < 208; i++) {
            randomBytes[i] = bytes1(uint8(uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, i, randomNumber)))));
        }
        return randomBytes;
    }
}

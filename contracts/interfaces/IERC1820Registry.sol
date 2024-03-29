// SPDX-License-Identifier: CC0-1.0
pragma solidity 0.8.15;

interface IERC1820Registry {
    function setInterfaceImplementer(
        address _addr,
        bytes32 _interfaceHash,
        address _implementer
    ) external;
}

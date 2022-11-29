// SPDX-License-Identifier: CC0-1.0

pragma solidity ^0.8.0;

import {ERC777} from "@openzeppelin/contracts/token/ERC777/ERC777.sol";

contract TestToken is ERC777 {
    constructor(
        string memory name_,
        string memory symbol_,
        address[] memory defaultOperators_
    ) ERC777(name_, symbol_, defaultOperators_) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount, "", "");
    }
}
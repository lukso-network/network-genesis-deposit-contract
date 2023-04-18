import { ethers } from "hardhat";

export const LYXeHolders = [
  "0xde8531C4FDf2cE3014527bAF57F8f788E240746e",
  "0x09363887A4096b142f3F6b58A7eeD2F1A0FF7343",
  "0x3022eb3691fdf020f6eaf85ef28569f7b6a518ea",
  "0xd08D3fc1fd5F82E86f71733a5B6f4731938e76F3",
  "0x5a94809ed5e3d4f5c632141100b76ce04f94380f",
  "0xf35a6bd6e0459a4b53a27862c51a2a7292b383d1",
];

export const LYXE_ADDRESS = "0xA8b919680258d369114910511cc87595aec0be6D";

// used to deploy deposit contract
export const ETH_HOLDER_WITHOUT_LYXE =
  "0x189b9cbd4aff470af2c0102f365fc1823d857965";

// has some ETH but no LYXe
// will be used to deposit LYXe on behalf of a LYXe holder
export const OPERATOR = "0x90465fe1EA4d37161CB07BD3Cb0Fd6D7179D776B";

export const DEPOSIT_CONTRACT_OWNER =
  "0x6109dcd72b8a2485A5b3Ac4E76965159e9893aB7";

export const DEPOSIT_START_TIMESTAMP = 1682007600;

export const DEPOSIT_AMOUNT = ethers.utils.parseEther("32").toString();

export const TOKENS_RECIPIENT_INTERFACE_HASH =
  "0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b";

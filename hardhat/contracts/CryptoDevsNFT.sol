// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract CryptoDevsNFT is ERC721Enumerable {
    // When this contract is created, _a is passed as a param and variable a is updated
    constructor() ERC721("CryptoDevs", "CD") {}
  
    //   Have a public mint function anyone can call to mint an NFT
    function mint() public {
        _safeMint(msg.sender, totalSupply());
    }
}
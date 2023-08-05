// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract FakeNFTMarketplace {
    /// @dev Set the purchase price of each NFT
    uint256 constant NFT_PRICE = 0.1 ether;
    
    /// @dev Maintain a mapping of Fake TokenID to Owner addresses
    mapping(uint256 => address) public tokens;

    /// @dev purchase() accepts ETH and marks the owner of the given tokenId as the caller address
    /// @param _tokenId - the fake NFT token id to purchase
    function purchase(uint256 _tokenId) external payable {
        require(msg.value == NFT_PRICE, "This NFT costs 0.1 ether");
        tokens[_tokenId] = msg.sender;
    }

    /// @dev Returns the price of one NFT
    function getPrice() external pure returns (uint256) {
        return NFT_PRICE;
    }

    /// @dev Check whether the given token id has already been sold
    /// @param _tokenId - the token id to check for
    function available(uint256 _tokenId) external view returns (bool) {
        // address(0) is the default address in solidity
        if (tokens[_tokenId] == address(0)) {
            return true;
        }
        return false;
    }

}
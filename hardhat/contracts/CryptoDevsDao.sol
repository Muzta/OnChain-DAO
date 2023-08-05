// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IFakeNFTMarketplace {
    /// @dev returns the price of an NFT from the FakeNFTMarketplace
    /// @return returns the price in Wei for an NFT
    function getPrice() external pure returns (uint256);

    /// @dev returns whether or not the given _nftTokenId as already been purchased
    /// @return returns a boolean value - true if available, false if not
    function available(uint256 _nftTokenId) external view returns (bool);

    /// @dev purchases an NFT from the FakeNFTMarketplace
    /// @param _nftTokenId  the fake NFT tokenID to purchase
    function purchase(uint256 _nftTokenId) external payable;
}

// Minimal interface for CryptoDevs that only take two functions that we are interested in
interface ICryptoDevsNFT {
    /// @dev returns the number of NFTs owned by the given address
    /// @param owner - address to fetch number of NFTs for
    /// @return returns the number of NFTs owned
    function balanceOf(address owner) external view returns (uint256);

    /// @dev returns a tokenID at given index for owner
    /// @param owner - address to fetch the NFT TokenID for
    /// @param index - index of NFT in owned tokens array to fetch
    /// @return returns the TokenID of the NFT 
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
}

contract CryptoDevsDao is Ownable {
    // Struct named Proposal to store all the info
    struct Proposal {
        // The token id of the NFT to purchase from FakeNFTMarketplace if the proposal passes
        uint256 nftTokenId;
        // The UNIX timestamp until which this proposal is active. Proposal can be executed after deadline has 
        // been exceeded.
        uint256 deadline;
        // Num of yay votes for this proposal
        uint256 yayVotes;
        // Num of nay votes for this proposal
        uint256 nayVotes;
        // Wheter or not this proposal has been executed yet. Cannot be executed before the deadline has been  exceeded
        bool executed;
        // Mapping of CryptoDevsNFT tokenIds to boolean indicating whether that NFT has been used to cast a vote or not
        mapping(uint256 => bool) voters;
    }
    
    enum Vote { YAY, NAY }

    mapping(uint256 => Proposal) public proposals;
    uint256 public numProposals;

    // Variablees to store the contracts of the interfaces
    IFakeNFTMarketplace nftMarketplace;
    ICryptoDevsNFT cryptoDevsNFT;

    // Create a payable constructor which initializes the contract instances for FakeNFTMarketplace and CryptoDevsNFT
    // The payable allows this constructor to accept an ETH deposit when it is being deployed
    constructor(address _nftMarketplace, address _cryptoDevsNFT) payable {
        nftMarketplace = IFakeNFTMarketplace(_nftMarketplace);
        cryptoDevsNFT = ICryptoDevsNFT(_cryptoDevsNFT);
    }

    // Only allows a function to be called by someone who owns at least 1 cryptoDevsNFT
    modifier nftHolderOnly() {
        require(cryptoDevsNFT.balanceOf(msg.sender) > 0, "Not a DAO member");
        _;
    }

    // Only allows a function to be called if the given proposal's deadline has not been exceeded yet
    modifier activeProposalOnly(uint256 proposalIndex) {
        require(proposals[proposalIndex].deadline > block.timestamp, "Deadline exceeded");
        _;
    }

    // Only allows a function to be called if the given proposals deadline HAS been exceeded
    // and if the proposal has not yet been executed
    modifier inactiveProposalOnly(uint256 proposalIndex) {
        require(proposals[proposalIndex].deadline < block.timestamp, "Deadline not exceeded");
        require(proposals[proposalIndex].executed == false, "Proposal already executed");
        _;
    }

    /// @dev allows a CryptoDevsNFT holder to create a new proposal in the DAO
    /// @param _nftTokenId - the tokenID of the NFT to be purchased from FakeNFTMarketplace if this proposal passes
    /// @return returns the proposal index for the newly created proposal
    function createProposal(uint256 _nftTokenId) external nftHolderOnly returns (uint256) {
        require(nftMarketplace.available(_nftTokenId), "NFT not for sale");
        Proposal storage proposal = proposals[numProposals];
        proposal.nftTokenId = _nftTokenId;
        // Set the proposal's voting deadline to be (current time + 5 minutes)
        proposal.deadline = block.timestamp + 5 minutes;
        numProposals++;

        return numProposals - 1;
    }

    /// @dev allows a CryptoDevsNFT holder to cast their vote on an active proposal
    /// @param proposalIndex - the index of the proposal to vote on in the proposals array
    /// @param vote - the type of vote they want to cast
    function voteOnProposal(uint256 proposalIndex, Vote vote) external nftHolderOnly activeProposalOnly(proposalIndex) {
        Proposal storage proposal = proposals[proposalIndex];

        uint256 voterNFTBalance = cryptoDevsNFT.balanceOf(msg.sender);
        uint256 numVotes = 0;

        // Calculate how many NFTs are owned by the voter that haven't already been used for voting on this proposal
        for (uint256 i = 0; i < voterNFTBalance; i++) {
            uint256 tokenId = cryptoDevsNFT.tokenOfOwnerByIndex(msg.sender, i);
            if (proposal.voters[tokenId] == false) {
                numVotes++;
                proposal.voters[tokenId] = true;
            }
        }

        require(numVotes > 0, "Already voted");

        if (vote == Vote.YAY) {
            proposal.yayVotes += numVotes;
        } else {
            proposal.nayVotes += numVotes;
        }
    }

    /// @dev allows any CryptoDevsNFT holder to execute a proposal after it's deadline has been exceeded
    /// @param proposalIndex - the index of the proposal to execute in the proposals array
    function executeProposal(uint256 proposalIndex) external nftHolderOnly inactiveProposalOnly(proposalIndex) {
        Proposal storage proposal = proposals[proposalIndex];
        
        // If YAY > NAY votes in the proposal, purchase the NFT from the FakeNFTMarketplace
        if (proposal.yayVotes > proposal.nayVotes) {
            uint256 nftPrice = nftMarketplace.getPrice();
            require(address(this).balance >= nftPrice, "Not enough funds");
            nftMarketplace.purchase{value: nftPrice}(proposal.nftTokenId);
        }

        proposal.executed = true;
    }

    /// @dev allows the contract owner (deployer) to withdraw all the ETH from the contract
    function withdrawEther() external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "Nothing to withdraw, contract balance empty");
        (bool sent, ) = payable(owner()).call{value: amount}("");
        require(sent, "Failed to withdraw Ether");
    }

    // These functions allow the contract to accept ETH deposits directly from a wallet without calling a function
    receive() external payable {}
    fallback() external payable {}
}
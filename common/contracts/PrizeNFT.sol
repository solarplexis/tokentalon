// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title PrizeNFT
 * @dev ERC-721 NFT representing prizes won in TokenTalon claw machine game
 * Each NFT contains metadata with prize information and replay data
 */
contract PrizeNFT is ERC721URIStorage, AccessControl {
    /// @dev Role identifier for minters (ClawMachine contract)
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev Token ID counter
    uint256 private _tokenIdCounter;

    /// @dev Mapping from token ID to prize ID
    mapping(uint256 => uint256) public tokenToPrizeId;

    /// @dev Mapping from token ID to replay data hash (IPFS CID)
    mapping(uint256 => string) public tokenToReplayData;

    /// @dev Mapping from token ID to difficulty rating (1-10)
    mapping(uint256 => uint8) public tokenToDifficulty;

    /// @dev Mapping from token ID to timestamp when won
    mapping(uint256 => uint256) public tokenToTimestamp;

    /// @dev Mapping from token ID to tokens spent to win
    mapping(uint256 => uint256) public tokenToTokensSpent;

    /// @dev Event emitted when a prize is minted
    event PrizeMinted(
        uint256 indexed tokenId,
        address indexed winner,
        uint256 indexed prizeId,
        string metadataURI,
        uint8 difficulty
    );

    /// @dev Event emitted when royalty info is updated
    event RoyaltyUpdated(address indexed receiver, uint96 feeNumerator);

    /**
     * @dev Constructor
     */
    constructor() ERC721("TokenTalon Prize", "PRIZE") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @dev Mint a new prize NFT (only callable by addresses with MINTER_ROLE)
     * @param winner Address to receive the NFT
     * @param prizeId ID of the prize type
     * @param metadataURI IPFS URI containing NFT metadata
     * @param replayDataHash IPFS CID for replay data
     * @param difficulty Difficulty rating (1-10)
     * @param tokensSpent Number of tokens spent to win
     */
    function mintPrize(
        address winner,
        uint256 prizeId,
        string memory metadataURI,
        string memory replayDataHash,
        uint8 difficulty,
        uint256 tokensSpent
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(winner != address(0), "Winner cannot be zero address");
        require(bytes(metadataURI).length > 0, "Metadata URI required");
        require(difficulty >= 1 && difficulty <= 10, "Difficulty must be 1-10");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(winner, tokenId);
        _setTokenURI(tokenId, metadataURI);

        // Store prize metadata
        tokenToPrizeId[tokenId] = prizeId;
        tokenToReplayData[tokenId] = replayDataHash;
        tokenToDifficulty[tokenId] = difficulty;
        tokenToTimestamp[tokenId] = block.timestamp;
        tokenToTokensSpent[tokenId] = tokensSpent;

        emit PrizeMinted(tokenId, winner, prizeId, metadataURI, difficulty);

        return tokenId;
    }

    /**
     * @dev Get complete prize information for a token
     * @param tokenId Token ID to query
     * @return prizeId Prize type ID
     * @return metadataURI IPFS metadata URI
     * @return replayDataHash IPFS CID for replay
     * @return difficulty Difficulty rating
     * @return timestamp When the prize was won
     * @return tokensSpent Tokens spent to win
     */
    function getPrizeInfo(uint256 tokenId) external view returns (
        uint256 prizeId,
        string memory metadataURI,
        string memory replayDataHash,
        uint8 difficulty,
        uint256 timestamp,
        uint256 tokensSpent
    ) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        return (
            tokenToPrizeId[tokenId],
            tokenURI(tokenId),
            tokenToReplayData[tokenId],
            tokenToDifficulty[tokenId],
            tokenToTimestamp[tokenId],
            tokenToTokensSpent[tokenId]
        );
    }

    /**
     * @dev Get all token IDs owned by an address
     * @param owner Address to query
     * @return Array of token IDs
     */
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < _tokenIdCounter; i++) {
            if (_ownerOf(i) == owner) {
                tokenIds[currentIndex] = i;
                currentIndex++;
            }
        }

        return tokenIds;
    }

    /**
     * @dev Get the total number of prizes minted
     * @return Total supply
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Grant minter role to an address (only admin)
     * @param minter Address to grant role to
     */
    function grantMinterRole(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, minter);
    }

    /**
     * @dev Revoke minter role from an address (only admin)
     * @param minter Address to revoke role from
     */
    function revokeMinterRole(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, minter);
    }

    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

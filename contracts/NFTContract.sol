// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";

contract NFTContract is ERC721, ERC721Royalty, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    
    string private _contractMetaURI;

    uint96 private _royaltyValue;
    address private _royaltyRecipient;

    constructor(string memory tokenName, string memory cSymbol, string memory contractMetaURI) ERC721(tokenName, cSymbol) {
        _contractMetaURI = contractMetaURI;
    }
    
    function contractURI() external view returns (string memory){
        return _contractMetaURI;
    }

    function mint(address to, string calldata uri, uint96 royaltyValue, address royaltyRecipient) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        super._mint(to, tokenId);
        super._setTokenURI(tokenId, uri);
        
        if(royaltyValue > 0){
            super._setTokenRoyalty(tokenId, royaltyRecipient, royaltyValue);
        }
        
        return tokenId;
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage, ERC721Royalty) {
        super._burn(tokenId);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Royalty) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

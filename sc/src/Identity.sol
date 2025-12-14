// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Identity
 * @dev Identity contract that stores claims about an investor
 * Claims are issued by trusted issuers and contain verification data
 */
contract Identity is Ownable {
    // Mapping of claim topic => issuer => claim data
    mapping(uint256 => mapping(address => Claim)) private claims;

    struct Claim {
        uint256 topic;
        uint256 scheme;
        address issuer;
        bytes signature;
        bytes data;
        string uri;
    }

    event ClaimAdded(
        uint256 indexed topic,
        uint256 scheme,
        address indexed issuer,
        bytes signature,
        bytes data,
        string uri
    );

    event ClaimRemoved(uint256 indexed topic, address indexed issuer);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev Add a claim to the identity
     * @param _topic Claim topic (e.g., 1 for KYC)
     * @param _scheme Signature scheme (1 = ECDSA)
     * @param _issuer Address of the claim issuer
     * @param _signature Signature of the claim
     * @param _data Claim data
     * @param _uri URI for additional claim information
     */
    function addClaim(
        uint256 _topic,
        uint256 _scheme,
        address _issuer,
        bytes memory _signature,
        bytes memory _data,
        string memory _uri
    ) external onlyOwner returns (bytes32) {
        claims[_topic][_issuer] = Claim({
            topic: _topic,
            scheme: _scheme,
            issuer: _issuer,
            signature: _signature,
            data: _data,
            uri: _uri
        });

        emit ClaimAdded(_topic, _scheme, _issuer, _signature, _data, _uri);

        bytes32 claimId;
        assembly {
            // Store issuer at memory position 0x00
            mstore(0x00, _issuer)
            // Store topic at memory position 0x20
            mstore(0x20, _topic)
            // Hash 64 bytes (2 * 32 bytes)
            claimId := keccak256(0x00, 0x40)
        }
        return claimId;
    }

    /**
     * @dev Remove a claim from the identity
     * @param _topic Claim topic
     * @param _issuer Issuer address
     */
    function removeClaim(uint256 _topic, address _issuer) external onlyOwner returns (bool) {
        delete claims[_topic][_issuer];
        emit ClaimRemoved(_topic, _issuer);
        return true;
    }

    /**
     * @dev Get a claim
     * @param _topic Claim topic
     * @param _issuer Issuer address
     */
    function getClaim(uint256 _topic, address _issuer)
        external
        view
        returns (
            uint256 topic,
            uint256 scheme,
            address issuer,
            bytes memory signature,
            bytes memory data,
            string memory uri
        )
    {
        Claim memory claim = claims[_topic][_issuer];
        return (claim.topic, claim.scheme, claim.issuer, claim.signature, claim.data, claim.uri);
    }

    /**
     * @dev Check if a claim exists
     * @param _topic Claim topic
     * @param _issuer Issuer address
     */
    function claimExists(uint256 _topic, address _issuer) external view returns (bool) {
        return claims[_topic][_issuer].issuer != address(0);
    }
}


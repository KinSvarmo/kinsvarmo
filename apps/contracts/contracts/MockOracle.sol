// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract MockOracle {
    function verifyProof(bytes calldata proof) external pure returns (bool) {
        return proof.length > 0;
    }
}

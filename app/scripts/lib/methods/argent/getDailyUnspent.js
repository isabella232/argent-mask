module.exports = {
    "constant": true,
    "inputs": [
        {
            "name": "_wallet",
            "type": "address"
        },
        {
            "name": "_dapp",
            "type": "address"
        }
    ],
    "name": "getDailyUnspent",
    "outputs": [
        {
            "name": "_unspent",
            "type": "uint256"
        }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
}
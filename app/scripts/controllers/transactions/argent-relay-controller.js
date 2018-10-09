const leftPad = require('left-pad')
const web3Abi = require('web3-eth-abi')
const ethUtil = require('ethereumjs-util')
const argutils = require('../../lib/argent-utils')
const web3 = new (require('web3'))()
const { getBlockNumberAsync } = require('bluebird').promisifyAll(web3.eth)

class ArgentRelayController {

    constructor(opts) {
        this.provider = opts.provider
        this.signMessage = opts.signMessage
        this.getWalletAddress = opts.getWalletAddress

        web3.setProvider(this.provider)
    }

    async transform(txParams) {
        const walletAddress = await this.getWalletAddress()

        txParams.data = txParams.data || '0x'
        if (ethUtil.stripHexPrefix(txParams.data).length % 2 == 1) {
            txParams.data = '0x0' + ethUtil.stripHexPrefix(txParams.data)
        }

        let methodAbi, decodedMethodParams
        // if the user is calling an Argent Wallet's method,
        // do not wrap this call in a call to callETHContract()
        if (txParams.to === walletAddress) { // call to Argent wallet contract
            const methodId = txParams.data.slice(0, 10)

            methodAbi = await argutils.methodAbiFromArgentWallet(methodId)
            if (!methodAbi) {
                // The data passed is either empty or not a valid WalletLibrary call.
                // We ignore it and execute a transfer from the wallet to itself
                methodAbi = await argutils.methodAbiFromArgentWallet('transferETH')
                decodedMethodParams = [txParams.to, txParams.value]
            } else {
                const encodedMethodParams = txParams.data.substr(10)
                decodedMethodParams = Object.entries(web3Abi.decodeParameters(methodAbi.inputs, encodedMethodParams))
                    .filter(pair => parseInt(pair[0]) >= 0)
                    .map(pair => pair[1])
            }
        } else { // call to third-party contract or ETH transfer
            if (txParams.data === '0x') {
                methodAbi = await argutils.methodAbiFromArgentWallet('transferETH')
                decodedMethodParams = [txParams.to, txParams.value]
            } else {
                methodAbi = await argutils.methodAbiFromArgentWallet('callETHContract')
                decodedMethodParams = [txParams.to, txParams.value, txParams.data]
            }
        }
        const relayedData = web3Abi.encodeFunctionCall(methodAbi, decodedMethodParams)

        const nonceForRelay = await this.getNonceForRelay()

        const relayParams = {
            from: walletAddress,
            to: walletAddress,
            value: "0x0",
            data: relayedData,
            nonce: nonceForRelay,
            gasPrice: "0x0",
        }

        return relayParams
    }

    async getNonceForRelay() {
        let block = await getBlockNumberAsync()
        let timestamp = (new Date()).getTime()
        return '0x' + leftPad(block.toString('16'), '32', '0') + leftPad(timestamp.toString('16'), '32', '0')
    }

    async signatureForRelayedTx(relayParams) {
        console.log('relayParams for signature = ', relayParams)
        let input = '0x19' + '00' + relayParams.from.slice(2) + relayParams.to.slice(2) + leftPad(relayParams.value, '64', '0') + relayParams.data.slice(2) + relayParams.nonce.slice(2) + leftPad(relayParams.gasPrice, '64', '0');
        let messageData = await web3.sha3(input, { encoding: 'hex' });
        return this.signMessage({ from: relayParams.from, data: messageData })
    }

    async relayTransaction(relayParams) {
        const relayerProvider = new web3.providers.HttpProvider('https://relay.argent.im:443')
        // const relayerProvider = new web3.providers.HttpProvider('https://rinkeby-relay.argent.im:443')
        const payload = {
            id: 0,
            jsonrpc: '2.0',
            method: 'eth_relayTransaction',
            params: [relayParams]
        }

        return new Promise((resolve, reject) => {
            try {
                relayerProvider.sendAsync(payload, function (error, result) {
                    console.log("relayer replied with: ", result, error)
                    if (result && result.result) {
                        resolve(result.result)
                    } else {
                        reject(error || result.error.message)
                    }
                })
            } catch (e) {
                reject(e)
            }
        })
    }
}

module.exports = ArgentRelayController

const leftPad = require('left-pad')
const web3Abi = require('web3-eth-abi')
const ethUtil = require('ethereumjs-util')
const web3 = new (require('web3'))()
const { getBlockNumberAsync } = require('bluebird').promisifyAll(web3.eth)
const transferTokenAbi = require('../../lib/methods/argent/transferToken')
const erc20TransferAbi = require('../../lib/methods/erc20Transfer')
const ETH_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const DAPP_MANAGER_MODULE_ADDRESS = '0x99ed02549F75D9324C98919d70eff6058bEd774c'
const erc20TransferSignature = '0xa9059cbb' // == web3.utils.sha3("transfer(address,uint256)").slice(0, 10)

class ArgentRelayController {

    constructor(opts) {
        this.provider = opts.provider
        this.signMessage = opts.signMessage
        this.getWalletAddress = opts.getWalletAddress
        this.getBrowserWalletAddress = opts.getBrowserWalletAddress

        web3.setProvider(this.provider)
    }

    async transform(txParams) {

        // make sure the data hex is formatted correctly
        txParams.data = txParams.data || '0x'
        if (ethUtil.stripHexPrefix(txParams.data).length % 2 == 1) {
            txParams.data = '0x0' + ethUtil.stripHexPrefix(txParams.data)
        }

        const walletAddress = await this.getWalletAddress()

        let token, to, value, data
        if (txParams.data.startsWith(erc20TransferSignature)) {
            // ERC20 Transfer
            token = txParams.to
            const encodedMethodParams = txParams.data.substr(10)
            [to, value] = Object.entries(web3Abi.decodeParameters(erc20TransferAbi.inputs, encodedMethodParams))
                .filter(pair => parseInt(pair[0]) >= 0)
                .map(pair => pair[1])
            data = '0x'
        } else {
            // ETH Transfer
            token = ETH_TOKEN
            to = txParams.to
            value = txParams.value
            data = txParams.data
        }

        const tokenTransferMethodParams = [
            walletAddress,
            await this.getBrowserWalletAddress(),
            token,
            to,
            value,
            data
        ]
        const relayedData = web3Abi.encodeFunctionCall(transferTokenAbi, tokenTransferMethodParams)

        const relayParams = {
            from: walletAddress,
            to: DAPP_MANAGER_MODULE_ADDRESS,
            data: relayedData,
            nonce: await this.getNonceForRelay(),
            gasPrice: '0x0',
        }

        return relayParams
    }

    async getNonceForRelay() {
        let block = await getBlockNumberAsync()
        let timestamp = (new Date()).getTime()
        return '0x' + leftPad(block.toString('16'), '32', '0') + leftPad(timestamp.toString('16'), '32', '0')
    }

    async signRelayedTx(relayParams) {
        console.log('relayParams to sign:', relayParams)
        let input = '0x19' + '00' + relayParams.from.slice(2) + relayParams.to.slice(2) + leftPad(relayParams.value, '64', '0') + relayParams.data.slice(2) + relayParams.nonce.slice(2) + leftPad(relayParams.gasPrice, '64', '0');
        let messageData = await web3.sha3(input, { encoding: 'hex' });
        relayParams.signatures = this.signMessage({ from: relayParams.from, data: messageData })
    }

    async relayTransaction(relayParams) {
        const relayerProvider = new web3.providers.HttpProvider('https://localhost:8080')
        // const relayerProvider = new web3.providers.HttpProvider('https://relay.argent.im:443')
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
                    console.log("Relayer replied with:", result, error)
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

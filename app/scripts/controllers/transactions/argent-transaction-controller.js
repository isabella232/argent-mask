const TransactionController = require('../transactions')
const ArgentPendingTransactionTracker = require('./argent-pending-tx-tracker')
const leftPad = require('left-pad')
const web3Abi = require('web3-eth-abi')
const ethUtil = require('ethereumjs-util')
const Prom = require('bluebird')
const callETHContractJson = require('../../lib/contracts/argent/argentWallet').find(f => f.name === "callETHContract")
const Web3 = require('web3')
const web3 = new Web3()

if (typeof web3.eth.getAccountsPromise === 'undefined') {
  Prom.promisifyAll(web3.eth, { suffix: 'Promise' })
}

class ArgentTransactionController extends TransactionController {

  constructor (opts) {
    super(opts)
    this.signMessage = opts.signMessage
    this.getWalletAddress = opts.getWalletAddress

    this.pendingTxTracker = new ArgentPendingTransactionTracker({
      provider: this.provider,
      nonceTracker: this.nonceTracker,
      relayTransaction: (relayParams) => this.relayTransaction(relayParams),
      getPendingTransactions: this.txStateManager.getPendingTransactions.bind(this.txStateManager),
      getCompletedTransactions: this.txStateManager.getConfirmedTransactions.bind(this.txStateManager),
    })

    web3.setProvider(this.provider)
  }


  /**
  sets the tx status to approved
  auto fills the nonce
  signs the transaction
  publishes the transaction
  if any of these steps fails the tx status will be set to failed
    @param txId {number} - the tx's Id
  */
 async approveTransaction (txId) {
    // let nonceLock
    try {
      // approve
      this.txStateManager.setTxStatusApproved(txId)
      // get next nonce
      const txMeta = this.txStateManager.getTx(txId)
      // const fromAddress = txMeta.txParams.from
      const walletAddress = await this.getWalletAddress()
      // wait for a nonce
      // nonceLock = await this.nonceTracker.getNonceLock(fromAddress)
      // nonceLock = await this.nonceTracker.getNonceLock(walletAddress)
      // add nonce to txParams
      // if txMeta has lastGasPrice then it is a retry at same nonce with higher
      // gas price transaction and therefore the nonce should not be calculated
      // const nonce = txMeta.lastGasPrice ? txMeta.txParams.nonce : nonceLock.nextNonce
      // txMeta.txParams.nonce = ethUtil.addHexPrefix(nonce.toString(16))
      // add nonce debugging information to txMeta
      // txMeta.nonceDetails = nonceLock.nonceDetails
      this.txStateManager.updateTx(txMeta, 'transactions#approveTransaction')


      // ARGENT CONNECT
      // sign and relay transaction
      const txParams = txMeta.txParams

      txParams.data = txParams.data || "0x"
      if (ethUtil.stripHexPrefix(txParams.data).length % 2 == 1) {
        txParams.data = "0x0" + ethUtil.stripHexPrefix(txParams.data)
      }

      // console.log('ATC: will encode', txParams)
      const callETHContractAbi = await web3Abi.encodeFunctionCall(callETHContractJson, [txParams.to, txParams.value, txParams.data])
      // console.log('ATC: did encode, callETHContractAbi=', callETHContractAbi)
      const nonceForRelay = await this.getNonceForRelay()

      txMeta.relayParams = {
        from: walletAddress,
        to: walletAddress,
        value: "0x0", 
        data: callETHContractAbi,
        nonce: nonceForRelay,
        gasPrice: "0x0",
      }

      // sign transaction
      // console.log('ATC: will sign', txId)
      await this.signTransaction(txId)
      // console.log('ATC: did sign')
      // console.log('nonceForRelay', nonceForRelay, 'signature', txMeta.relayParams.signatures)
      // console.log('ATC: will publish')
      await this.publishToRelayer(txId)
      // console.log('ATC: did publish')

      // must set transaction to submitted/failed before releasing lock
      // nonceLock.releaseLock()
    } catch (err) {
      // this is try-catch wrapped so that we can guarantee that the nonceLock is released
      try {
        this.txStateManager.setTxStatusFailed(txId, err)
      } catch (err) {
        log.error(err)
        console.log('error in ATC:', err)
      }
      // must set transaction to submitted/failed before releasing lock
      // if (nonceLock) nonceLock.releaseLock()
      // continue with error chain
      throw err
    }
  }

  async getNonceForRelay() { 
    let block = await web3.eth.getBlockNumberPromise()
    let timestamp = (new Date()).getTime()
    return '0x' + leftPad(block.toString('16'), '32', '0') + leftPad(timestamp.toString('16'), '32', '0')
  }
  
  /**
    signs the relayed transaction and set the status to signed
    @param txId {number} - the tx's Id
    @returns - rawTx {string}
  */
  async signTransaction (txId) {
    const txMeta = this.txStateManager.getTx(txId)

    const signature = await this.signatureForRelayedTx(txMeta.relayParams)
    txMeta.relayParams.signatures = signature

    // set state to signed
    this.txStateManager.setTxStatusSigned(txMeta.id)
  }

  async signatureForRelayedTx(relayParams) {
    console.log('relayParams for signature = ', relayParams)
    let input = '0x19' + '00' + relayParams.from.slice(2) + relayParams.to.slice(2) + leftPad(relayParams.value, '64', '0') + relayParams.data.slice(2) + relayParams.nonce.slice(2) + leftPad(relayParams.gasPrice, '64', '0');
    let messageData = await web3.sha3(input, { encoding: 'hex' });
    return this.signMessage({ from: relayParams.from, data: messageData })
  }

  /**
    publishes the raw tx and sets the txMeta to submitted
    @param txId {number} - the tx's Id
    @param rawTx {string} - the hex string of the serialized signed transaction
    @returns {Promise<void>}
  */
  async publishToRelayer (txId) {
    const txMeta = this.txStateManager.getTx(txId)

    this.txStateManager.updateTx(txMeta, 'transactions#publishTransaction')

    const txHash = await this.relayTransaction(txMeta.relayParams)
    console.log('txHash received from relayer is', txHash)
    this.setTxHash(txId, txHash)
    this.txStateManager.setTxStatusSubmitted(txId)
  }

  async relayTransaction(relayParams) {
    const relayerProvider = new web3.providers.HttpProvider('https://relay.argent.im:443')
    const payload = {
      id: 0,
      jsonrpc: '2.0',
      method: 'eth_relayTransaction',
      params: [relayParams]
    }
    
    return new Promise((resolve, reject) => {
      try {
        relayerProvider.sendAsync(payload, function(error, result) {
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

module.exports = ArgentTransactionController

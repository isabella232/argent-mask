const TransactionController = require('../transactions')
const ArgentPendingTransactionTracker = require('./argent-pending-tx-tracker')
const ArgentRelayController = require('./argent-relay-controller')

class ArgentTransactionController extends TransactionController {

  constructor (opts) {
    super(opts)

    this.relayController = new ArgentRelayController({
      provider: this.provider,
      signMessage: opts.signMessage,
      getWalletAddress: opts.getWalletAddress
    })

    this.pendingTxTracker = new ArgentPendingTransactionTracker({
      provider: this.provider,
      nonceTracker: this.nonceTracker,
      relayTransaction: this.relayController.relayTransaction.bind(this.relayController),
      getPendingTransactions: this.txStateManager.getPendingTransactions.bind(this.txStateManager),
      getCompletedTransactions: this.txStateManager.getConfirmedTransactions.bind(this.txStateManager),
    })
  }


  /**
  sets the tx status to approved
  signs the transaction
  publishes the transaction
  if any of these steps fails the tx status will be set to failed
    @param txId {number} - the tx's Id
  */
 async approveTransaction (txId) {
    try {
      // approve
      this.txStateManager.setTxStatusApproved(txId)

      const txMeta = this.txStateManager.getTx(txId)
      
      this.txStateManager.updateTx(txMeta, 'transactions#approveTransaction')

      // compute relay params
      txMeta.relayParams = await this.relayController.transform(txMeta.txParams)
      // sign transaction
      await this.signTransaction(txId)
      // publish transaction
      await this.publishToRelayer(txId)
    } catch (err) {
      try {
        this.txStateManager.setTxStatusFailed(txId, err)
      } catch (err) {
        log.error('Error in ArgentTransactionController:', err)
      }
      throw err
    }
  }
  
  /**
    signs the relayed transaction and set the status to signed
    @param txId {number} - the tx's Id
    @returns - rawTx {string}
  */
  async signTransaction (txId) {
    const txMeta = this.txStateManager.getTx(txId)

    // adding a 'signatures' field to txMeta.relayParams
    await this.relayController.signRelayedTx(txMeta.relayParams)

    // set state to signed
    this.txStateManager.setTxStatusSigned(txMeta.id)
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

    const txHash = await this.relayController.relayTransaction(txMeta.relayParams)
    console.log('txHash received from relayer is', txHash)
    this.setTxHash(txId, txHash)
    this.txStateManager.setTxStatusSubmitted(txId)
  }

}

module.exports = ArgentTransactionController

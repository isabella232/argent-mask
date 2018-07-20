const PendingTransactionTracker = require('./pending-tx-tracker')

class ArgentPendingTransactionTracker extends PendingTransactionTracker {
  constructor (config) {
    super(config)
    this.relayTransaction = config.relayTransaction
  }


  /**
    resubmits the individual txMeta used in resubmitPendingTxs
    @param txMeta {Object} - txMeta object
    @param latestBlockNumber {string} - hex string for the latest block number
    @emits tx:retry
    @returns txHash {string}
  */
  async _resubmitTx (txMeta, latestBlockNumber) {
    if (!txMeta.firstRetryBlockNumber) {
      this.emit('tx:block-update', txMeta, latestBlockNumber)
    }

    const firstRetryBlockNumber = txMeta.firstRetryBlockNumber || latestBlockNumber
    const txBlockDistance = Number.parseInt(latestBlockNumber, 16) - Number.parseInt(firstRetryBlockNumber, 16)

    const retryCount = txMeta.retryCount || 0

    // Exponential backoff to limit retries at publishing
    if (txBlockDistance <= Math.pow(2, retryCount) - 1) return

    // Only auto-submit already-signed txs:
    if (!('signatures' in txMeta.relayParams)) return

    const relayParams = txMeta.relayParams
    const txHash = await this.relayTransaction(relayParams)

    // Increment successful tries:
    this.emit('tx:retry', txMeta)
    return txHash
  }
  
}

module.exports = ArgentPendingTransactionTracker

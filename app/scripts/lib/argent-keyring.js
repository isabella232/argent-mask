const EventEmitter = require('events').EventEmitter
const Wallet = require('ethereumjs-wallet')
const ethUtil = require('ethereumjs-util')
const type = 'Argent (Browser Key, ENS) Pair'
const sigUtil = require('eth-sig-util')
const Web3 = require('web3')
const web3 = new Web3()

class ArgentKeyring extends EventEmitter {

    /* PUBLIC METHODS */

    constructor(opts) {
        super()

        this.type = type
        
        this.provider = opts.provider
        web3.setProvider(this.provider)

        this.addressFromEns = opts.addressFromEns

        this.argentWalletsAddresses = null
        this.signingWallet = null
        this.opts = opts || {}
    }

    serialize() {
        const self = this
        return this._deserializeIfNeeded().then(function() {
            return {
                ens: self.ens,
                browserPrivateKey: self.signingWallet.getPrivateKeyString()
            }
        })
    }

    deserialize(opts = {}) {
        this.opts = opts
        this.ens = opts.ens.endsWith('.argent.xyz') ? opts.ens : `${opts.ens}.argent.xyz`

        const self = this

       return this.addressFromEns(this.ens).then(function(walletAddress) {
            self.argentWalletsAddresses = [walletAddress]
            self.signingWallet = self._signingWalletFrom(opts.browserPrivateKey || self._generatePrivateKey())
            self.wasDeserialized = true
        })
    }

    addAccounts(n = 1) {
        // const self = this
        // return this._deserializeIfNeeded().then(function() {
        //     return Array(n).fill(self.argentWalletsAddresses[0])
        // })
        console.error('ArgentKeyring.addAccounts(n) is not supported')
    }

    getAccounts() {
        const self = this
        return this._deserializeIfNeeded().then(function() {
            return self.argentWalletsAddresses
        })
    }

    getBrowserWalletAddress() {
        const self = this
        return this._deserializeIfNeeded().then(function() {
            return self.signingWallet.getAddressString()
        })
    }

    signMessage (withAccount, data) {
        const self = this
        return this._deserializeIfNeeded().then(function() {
            const privKey = self.signingWallet.getPrivateKey()
            
            const prefix = new Buffer("\x19Ethereum Signed Message:\n");
            const msg = new Buffer(ethUtil.stripHexPrefix(data), 'hex');
            const len = new Buffer(String(msg.length))
            const prefixedMsgHex = ethUtil.bufferToHex(Buffer.concat([prefix, len, msg]))
            const msgHash = web3.sha3(prefixedMsgHex, { encoding: 'hex'})
            const msgHashBuffer = new Buffer(ethUtil.stripHexPrefix(msgHash), 'hex');

            const msgSig = ethUtil.ecsign(msgHashBuffer, privKey);
            let v = msgSig.v
            if (v < 27)
                v = v + 27
            var rawMsgSig = ethUtil.bufferToHex(sigUtil.concatSig(v, msgSig.r, msgSig.s))
            return rawMsgSig
        })
    }

    // exportAccount should return a hex-encoded private key:
    exportAccount(address) {
        const self = this
        return this._deserializeIfNeeded().then(function() {
            return self.signingWallet.getPrivateKey().toString('hex')
        })
    }

    /* PRIVATE METHODS */

    _generatePrivateKey() {
        return Wallet.generate(false).getPrivateKeyString()
    }

    _signingWalletFrom(privateKey) {
        const stripped = ethUtil.stripHexPrefix(privateKey)
        const buffer = new Buffer(stripped, 'hex')
        const wallet = Wallet.fromPrivateKey(buffer)
        return wallet
    }

    _deserializeIfNeeded() {
        if (!this.wasDeserialized) {
            return this.deserialize(this.opts)
        }
        return Promise.resolve()
    }
}

ArgentKeyring.type = type
module.exports = ArgentKeyring

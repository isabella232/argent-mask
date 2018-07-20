const EventEmitter = require('events').EventEmitter
const Wallet = require('ethereumjs-wallet')
const ethUtil = require('ethereumjs-util')
const type = 'Argent (Browser Key, ENS) Pair'
const sigUtil = require('eth-sig-util')
// const Web3EthContract = require('web3-eth-contract');
const Web3 = require('web3')
const web3 = new Web3()
// const Web3EthContract = web3.eth.Contract
const leftPad = require('left-pad')
const web3Abi = require('web3-eth-abi')
const Prom = require('bluebird')
const ensRegistryAddress = '0x112234455c3a32fd11230c42e7bccd4a84e02010'
const ensRegistryJson = require('./contracts/argent/ens/ensRegistry')
const ensResolverJson = require('./contracts/argent/ens/argentEnsResolver')
const callETHContractJson = require('./contracts/argent/argentWallet').find(f => f.name === "callETHContract")


class ArgentKeyring extends EventEmitter {

    /* PUBLIC METHODS */

    constructor(opts) {
        // console.log(`ArgentKeyring: ENTER constr`)
        super()
        // console.log(`ArgentKeyring: constr AFTER super`)
        this.type = type
        this.provider = opts.provider
        // console.log(`ArgentKeyring: constr BEFORE setProvider ${this.provider}`)
        web3.setProvider(this.provider)

        // console.log(`ArgentKeyring: constr AFTER setProvider`)
        this.argentWalletsAddresses = null
        this.signingWallet = null
        this.opts = opts || {}
        // console.log('ArgentKeyring: BEFORE deserialize opts=', opts)
        // this.deserialize(opts)
        // console.log('ArgentKeyring: end for constructor with sW=', this.signingWallet, ', bk=',this.signingWallet.privateKey,' W=',this.argentWalletsAddresses[0])
    }

    serialize() {
        const self = this
        return this._deserializeIfNeeded().then(function() {
            return {
                ens: self.ens,
                browserKey: self.signingWallet.getPrivateKey().toString('hex')
            }
        })
    }

    deserialize(opts = {}) {
        this.opts = opts
        this.ens = opts.ens.endsWith('.argent.test') ? opts.ens : `${opts.ens}.argent.test`

        const self = this
        return this._argentWalletsAddressesFrom(this.ens).then(function(walletAddresses) {
            self.argentWalletsAddresses = walletAddresses
            self.signingWallet = self._signingWalletFrom(opts.browserKey || self._generatePrivateKey())
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

    // signTransactionForRelay(txParams) {

    // }

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

    async _argentWalletsAddressesFrom(ens) {
        const ensInstance = web3.eth.contract(ensRegistryJson).at(ensRegistryAddress);
        if (typeof ensInstance.resolverPromise === 'undefined') {
            Prom.promisifyAll(ensInstance, { suffix: 'Promise' });
        }

        const ensResolverAddress = await ensInstance.resolverPromise(this._namehash(ens)) // 0xc5463256e1c0c24e1eca9cc1072343f0e5617037
        const ensResolver = web3.eth.contract(ensResolverJson).at(ensResolverAddress)
        if (typeof ensResolver.addrPromise === 'undefined') {
            Prom.promisifyAll(ensResolver, { suffix: 'Promise' });
        }

        const resolvedWalletAddress = await ensResolver.addrPromise(this._namehash(ens))
        console.log("ArgentKeyring: resolvedWalletAddress", resolvedWalletAddress)
        return [resolvedWalletAddress]
    }

    _generatePrivateKey() {
        // TODO: CHANGE ME
        return '0xe08849939aaf83eaae70db516953503cb323af9e3d01244c372c51e688db3f56' // owner private key
    }

    _signingWalletFrom(privateKey) {
        const stripped = ethUtil.stripHexPrefix(privateKey)
        const buffer = new Buffer(stripped, 'hex')
        const wallet = Wallet.fromPrivateKey(buffer)
        return wallet
    }

    _namehash(name) {
        var node = '0x0000000000000000000000000000000000000000000000000000000000000000';
        if (name !== '') {
            var labels = name.split(".");
            for (var i = labels.length - 1; i >= 0; i--) {
                node = web3.sha3(node + web3.sha3(labels[i]).slice(2), { encoding: 'hex' });
            }
        }
        return node.toString();
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

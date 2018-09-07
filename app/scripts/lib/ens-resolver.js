// const ensRegistryAddress = '0x112234455c3a32fd11230c42e7bccd4a84e02010' // ROPSTEN
const ensRegistryAddress = '0xe87988b3a4f651b37025879c0233050eac87cf0b' // ROPSTEN (our own)
// const ensRegistryAddress = '0xe7410170f87102df0055eb195163a03b7f2bff4a' // RINKEBY
const ensRegistryJson = require('./contracts/argent/ens/ensRegistry')
const ensResolverJson = require('./contracts/argent/ens/argentEnsResolver')

const Web3 = require('web3')
const web3 = new Web3()
const Prom = require('bluebird')

class EnsResolver {

    constructor(opts) {
        this.provider = opts.provider
        web3.setProvider(this.provider)
    }

    async addressFromEns(ens) {
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
        return resolvedWalletAddress
    }

    /* PRIVATE METHODS */

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
}

module.exports = EnsResolver;
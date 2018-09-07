const web3Abi = require('web3-eth-abi');

/**
 * Helper methods.
 * @type {Object}
 */
module.exports = {

    methodAbiFromMethodName(abi, methodName) {
        return abi.find(f => f.name === methodName);
    },

    methodAbiFromMethodId(abi, methodId) {
        return abi.find(f => f.name && web3Abi.encodeFunctionSignature(f) === methodId);
    },

    methodAbiFrom(abi, method) {
        if (method.startsWith('0x')) {
            return this.methodAbiFromMethodId(abi, method);
        }
        return this.methodAbiFromMethodName(abi, method);
    },

    async methodAbiFromArgentWallet(method) {
        const abi = require('./contracts/argent/argentWallet');
        return this.methodAbiFrom(abi, method);
    }
}

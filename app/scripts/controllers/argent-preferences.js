
const PreferencesController = require('./preferences')

class ArgentPreferencesController extends PreferencesController {
    
    constructor (opts) {
        super(opts)
        this.getLabelForAddress = opts.getLabelForAddress || (() => Promise.resolve('Argent Wallet'))
    }

    /**
     * Updates identities to only include specified addresses. Removes identities
     * not included in addresses array
     *
     * @param {string[]} addresses An array of hex addresses
     *
     */
    addAddresses (addresses) {
        const identities = this.store.getState().identities

        Promise.all(addresses.map(address => {
            if (identities[address]) return
            return this.getLabelForAddress(address).then(label => { 
                identities[address] = { name: label, address }
            })
        })).then(() => {
            this.store.updateState({ identities })
        })

        // addresses.forEach((address) => {
        //   // skip if already exists
        //   if (identities[address]) return
        //   // add missing identity
        //   identities[address] = { name: this.getLabelForAddress(address), address }
        // })
        // this.store.updateState({ identities })
    }
}

module.exports = ArgentPreferencesController

const ObservableStore = require('obs-store')
const ArgentKeyring = require('../lib/argent-keyring')
// const KeyringController = require('eth-keyring-controller')
const KeyringController = require('./eth-keyring-controller')
const sigUtil = require('eth-sig-util')
const normalizeAddress = sigUtil.normalize

class ArgentKeyringController extends KeyringController {
  constructor (opts) {
    super(opts)

    this.keyringTypes = [...this.keyringTypes, ArgentKeyring]
    this.memStore = new ObservableStore({
      isUnlocked: false,
      keyringTypes: this.keyringTypes.map(krt => krt.type),
      keyrings: [],
    })
    this.provider = opts.provider
    this.addressFromEns = opts.addressFromEns
  }

  // Create New Vault
  // @string password - The password to encrypt the vault with
  // @string ens - The Argent ens pointing to the wallet address to sign for
  //
  // returns Promise( @object state )
  //
  createNewVault (ens, password) {
    console.log(`ArgentKeyringController: creating new vault for ens: ${ens}`)
    return this.persistAllKeyrings(password)
      .then(this.createArgentKeyring.bind(this, ens))
      .then(this.persistAllKeyrings.bind(this, password))
      .then(this.fullUpdate.bind(this))
  }

  // PRIVATE METHODS
  //
  // THESE METHODS ARE ONLY USED INTERNALLY TO THE KEYRING-CONTROLLER
  // AND SO MAY BE CHANGED MORE LIBERALLY THAN THE ABOVE METHODS.

  // Create Argent Keyring
  // @string ens - The Argent ens pointing to the wallet address to sign for
  //
  // returns @Promise
  //
  // Clears the vault,
  // creates a new ArgentKeyring
  createArgentKeyring (ens) {
    // super.createFirstKeyTree()
    this.clearKeyrings()
    return this.addNewKeyring(ArgentKeyring.type, { 
      ens: ens,
      provider: this.provider,
      addressFromEns: this.addressFromEns,
    })
    .then((keyring) => {
      return keyring.getAccounts()
    })
    .then((accounts) => {
      const firstAccount = accounts[0]
      if (!firstAccount) throw new Error('ArgentKeyringController - No account found on keychain.')
      const hexAccount = normalizeAddress(firstAccount)
      console.log(`ArgentKeyringController first account: ${hexAccount}`)
      this.emit('newVault', hexAccount)
      return null
    })
  }


    // Restore Keyring
    // @object serialized
    //
    // returns Promise( @Keyring deserialized )
    //
    // Attempts to initialize a new keyring from the provided
    // serialized payload.
    //
    // On success, returns the resulting @Keyring instance.
    restoreKeyring(serialized) {
      const { data } = serialized

      const keyring = new ArgentKeyring({ 
        provider: this.provider,
        addressFromEns: this.addressFromEns,
      })
      return keyring.deserialize(data)
          .then(() => {
              return keyring.getAccounts()
          })
          .then(() => {
              this.keyrings.push(keyring)
              return this._updateMemStoreKeyrings()
          })
          .then(() => {
              return keyring
          })
  }
}

module.exports = ArgentKeyringController

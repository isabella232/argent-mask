const inherits = require('util').inherits
const PersistentForm = require('../lib/persistent-form')
const h = require('react-hyperscript')
const connect = require('react-redux').connect
const Identicon = require('./components/identicon')
const actions = require('../../ui/app/actions')
const util = require('./util')
const numericBalance = require('./util').numericBalance
const addressSummary = require('./util').addressSummary
const isHex = require('./util').isHex
const EthBalance = require('./components/eth-balance')
const EnsInput = require('./components/ens-input')
const ethUtil = require('ethereumjs-util')
module.exports = connect(mapStateToProps)(SendTransactionScreen)

function mapStateToProps(state) {
  var result = {
    address: state.metamask.selectedAddress,
    accounts: state.metamask.accounts,
    identities: state.metamask.identities,
    warning: state.appState.warning,
    network: state.metamask.network,
    addressBook: state.metamask.addressBook,
    conversionRate: state.metamask.conversionRate,
    currentCurrency: state.metamask.currentCurrency,
  }

  result.error = result.warning && result.warning.split('.')[0]

  result.account = result.accounts[result.address]
  result.identity = result.identities[result.address]
  result.balance = result.account ? numericBalance(result.account.balance) : null
  result.dailyUnspent = result.account ? numericBalance(result.account.dailyUnspent) : null
  result.lockReleaseTime = result.account ? numericBalance(result.account.lockReleaseTime) : null

  return result
}

inherits(SendTransactionScreen, PersistentForm)

function SendTransactionScreen() {
  PersistentForm.call(this)
}

SendTransactionScreen.prototype.render = function () {
  this.persistentFormParentId = 'send-tx-form'

  const props = this.props
  const {
    address,
    account,
    identity,
    network,
    identities,
    addressBook,
    conversionRate,
    currentCurrency,
  } = props

  return (

    h('.send-screen', [
      // header bar (back button, label)
      h('header.panel.screen-header', [
        // back button
        h('i.fa.fa-arrow-left.fa-lg.cursor-pointer.color-orange', {
          onClick: this.back.bind(this),
        }),
        h('h1', 'Send ETH'),
      ]),

      //
      // Sender Profile
      //

      h('.panel.identity-panel', [

        // header - identicon + nav

        // large identicon
        h('.identicon-wrapper.select-none', [
          h(Identicon, {
            diameter: 62,
            address: address,
          }),
        ]),

        // account label
        h('.identity-data', [
          h('h3.ens', identity && identity.name),

          // address and getter actions
          h('.full-address', addressSummary(address)),
        ]),
      ]),

      h('div.panel', [
          // Ether balance
          h(EthBalance, {
            value: account && account.balance,
            conversionRate,
            currentCurrency,
          }),
        ]
      ),


      //
      // Required Fields
      //

      h('hr'),

      // error message
      props.error && h('span.error.flex-center', props.error),

      h('div.panel.recipient-panel', [
        // 'to' field
        h('div.form-group', [
          h(EnsInput, {
            name: 'address',
            placeholder: 'Recipient Address',
            onChange: this.recipientDidChange.bind(this),
            network,
            identities,
            addressBook,
          }),
        ]),

        // 'amount' and send button
        h('div.form-group', [

          h('input.form-control', {
            name: 'amount',
            placeholder: 'Amount',
            type: 'number',
            style: {
              marginRight: '6px',
            },
            dataset: {
              persistentFormId: 'tx-amount',
            },
          }),
        ]),

        h('div.form-group', [
          h('label', {
            htmlFor: 'txData'
          }, 'Transaction data (optional)'),

          h('input.form-control', {
            name: 'txData',
            placeholder: '0x01234',
            style: {
              width: '100%',
              resize: 'none',
            },
            dataset: {
              persistentFormId: 'tx-data',
            },
          }),
        ]),

        h('button.primary', {
          onClick: this.onSubmit.bind(this),
          style: {
            textTransform: 'uppercase',
          },
        }, 'Next'),
      ]),

    ])
  )
}

SendTransactionScreen.prototype.navigateToAccounts = function (event) {
  event.stopPropagation()
  this.props.dispatch(actions.showAccountsPage())
}

SendTransactionScreen.prototype.back = function () {
  var address = this.props.address
  this.props.dispatch(actions.backToAccountDetail(address))
}

SendTransactionScreen.prototype.recipientDidChange = function (recipient, nickname) {
  this.setState({
    recipient: recipient,
    nickname: nickname,
  })
}

SendTransactionScreen.prototype.onSubmit = function () {
  const state = this.state || {}
  const recipient = state.recipient || document.querySelector('input[name="address"]').value.replace(/^[.\s]+|[.\s]+$/g, '')
  const nickname = state.nickname || ' '
  const input = document.querySelector('input[name="amount"]').value
  const parts = input.split('')

  let message

  if (isNaN(input) || input === '') {
    message = 'Invalid ether value.'
    return this.props.dispatch(actions.displayWarning(message))
  }

  if (parts[1]) {
    var decimal = parts[1]
    if (decimal.length > 18) {
      message = 'Ether amount is too precise.'
      return this.props.dispatch(actions.displayWarning(message))
    }
  }

  const value = util.normalizeEthStringToWei(input)
  const txData = document.querySelector('input[name="txData"]').value
  const balance = this.props.balance
  const dailyUnspent = this.props.dailyUnspent
  const isLocked = this.props.lockReleaseTime.gt(new ethUtil.BN(Math.floor(Date.now() / 1000)))

  if (value.gt(balance)) {
    message = 'Insufficient funds.'
    return this.props.dispatch(actions.displayWarning(message))
  }

  if (isLocked) {
    message = 'Wallet locked.'
    return this.props.dispatch(actions.displayWarning(message))
  }

  if (value.gt(dailyUnspent)) {
    message = 'Exceeds daily limit for ArgentConnect.'
    return this.props.dispatch(actions.displayWarning(message))
  }

  if (input < 0) {
    message = 'Can not send negative amounts of ETH.'
    return this.props.dispatch(actions.displayWarning(message))
  }

  if ((util.isInvalidChecksumAddress(recipient))) {
    message = 'Recipient address checksum is invalid.'
    return this.props.dispatch(actions.displayWarning(message))
  }

  if ((!util.isValidAddress(recipient) && !txData) || (!recipient && !txData)) {
    message = 'Recipient address is invalid.'
    return this.props.dispatch(actions.displayWarning(message))
  }

  if (!isHex(ethUtil.stripHexPrefix(txData)) && txData) {
    message = 'Transaction data must be hex string.'
    return this.props.dispatch(actions.displayWarning(message))
  }

  this.props.dispatch(actions.hideWarning())

  this.props.dispatch(actions.addToAddressBook(recipient, nickname))

  var txParams = {
    from: this.props.address,
    value: '0x' + value.toString(16),
  }

  if (recipient) txParams.to = ethUtil.addHexPrefix(recipient)
  if (txData) txParams.data = txData

  this.props.dispatch(actions.signTx(txParams))
}

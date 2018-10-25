const inherits = require('util').inherits
const Component = require('react').Component
const h = require('react-hyperscript')
const connect = require('react-redux').connect
const actions = require('../../ui/app/actions')
const Tooltip = require('./components/tooltip.js')


const ethUtil = require('ethereumjs-util')
const abi = require('human-standard-token-abi')
const Eth = require('ethjs-query')
const EthContract = require('ethjs-contract')

const emptyAddr = '0x0000000000000000000000000000000000000000'

module.exports = connect(mapStateToProps)(AddTokenScreen)

function mapStateToProps(state) {
  return {
    identities: state.metamask.identities,
  }
}

inherits(AddTokenScreen, Component)

function AddTokenScreen() {
  this.state = {
    warning: null,
    address: '',
    symbol: 'TOKEN',
    decimals: 18,
  }
  Component.call(this)
}

AddTokenScreen.prototype.render = function () {
  const state = this.state
  const props = this.props
  const {warning, symbol, decimals} = state

  return (
    h('.flex-column.flex-grow', [

      // header bar (back button, label)
      h('header.screen-header', [
        // back button
        h('i.fa.fa-arrow-left.fa-lg.cursor-pointer.color-orange', {
          onClick: (event) => {
            props.dispatch(actions.goHome())
          },
        }),
        h('h1', 'Add token'),
      ]),

      h('.error', {
        style: {
          display: warning ? 'block' : 'none',
          padding: '0 20px',
          textAlign: 'center',
        },
      }, warning),

      // conf view
      h('.add-token.select-none', [

        h('div.form-group', [
          h('label', {
            htmlFor: 'token-address'
          }, 'Token Contract Address '),

          h(Tooltip, {
            position: 'top',
            title: 'The contract of the actual token contract. Click for more info.',
          }, [
            h('a', {
              style: {fontWeight: 'bold', paddingRight: '10px'},
              href: 'https://support.metamask.io/kb/article/24-what-is-a-token-contract-address',
              target: '_blank',
            }, [
              h('i.fa.fa-question-circle'),
            ]),
          ]),

          h('input#token-address.form-control', {
            name: 'address',
            placeholder: 'Token Contract Address',
            onChange: this.tokenAddressDidChange.bind(this)
          }),
        ]),


        h('div.form-group', [
          h('label', {
            htmlFor: 'token_symbol'
          }, 'Token Symbol'),

          h('input#token_symbol.form-control', {
            placeholder: `Like "ETH"`,
            value: symbol,
            onChange: (event) => {
              var element = event.target
              var symbol = element.value
              this.setState({symbol})
            },
          }),

        ]),


        h('div.form-group', [
          h('label', {
            htmlFor: 'token_decimals'
          }, 'Decimals of Precision'),

          h('input#token_decimals.form-control', {
            value: decimals,
            type: 'number',
            min: 0,
            max: 36,
            onChange: (event) => {
              var element = event.target
              var decimals = element.value.trim()
              this.setState({decimals})
            },
          }),
        ]),


        h('button', {
          onClick: (event) => {
            const valid = this.validateInputs()
            if (!valid) return

            const {address, symbol, decimals} = this.state
            this.props.dispatch(actions.addToken(address.trim(), symbol.trim(), decimals))
              .then(() => {
                this.props.dispatch(actions.goHome())
              })
          },
        }, 'Add'),
      ]),
    ])
  )
}

AddTokenScreen.prototype.componentWillMount = function () {
  if (typeof global.ethereumProvider === 'undefined') return

  this.eth = new Eth(global.ethereumProvider)
  this.contract = new EthContract(this.eth)
  this.TokenContract = this.contract(abi)
}

AddTokenScreen.prototype.tokenAddressDidChange = function (event) {
  const el = event.target
  const address = el.value.trim()
  if (ethUtil.isValidAddress(address) && address !== emptyAddr) {
    this.setState({address})
    this.attemptToAutoFillTokenParams(address)
  }
}

AddTokenScreen.prototype.validateInputs = function () {
  let msg = ''
  const state = this.state
  const identitiesList = Object.keys(this.props.identities)
  const {address, symbol, decimals} = state
  const standardAddress = ethUtil.addHexPrefix(address).toLowerCase()

  const validAddress = ethUtil.isValidAddress(address)
  if (!validAddress) {
    msg += 'Address is invalid.'
  }

  const validDecimals = decimals >= 0 && decimals < 36
  if (!validDecimals) {
    msg += 'Decimals must be at least 0, and not over 36. '
  }

  const symbolLen = symbol.trim().length
  const validSymbol = symbolLen > 0 && symbolLen < 10
  if (!validSymbol) {
    msg += 'Symbol must be between 0 and 10 characters.'
  }

  const ownAddress = identitiesList.includes(standardAddress)
  if (ownAddress) {
    msg = 'Personal address detected. Input the token contract address.'
  }

  const isValid = validAddress && validDecimals && !ownAddress

  if (!isValid) {
    this.setState({
      warning: msg,
    })
  } else {
    this.setState({warning: null})
  }

  return isValid
}

AddTokenScreen.prototype.attemptToAutoFillTokenParams = async function (address) {
  const contract = this.TokenContract.at(address)

  const results = await Promise.all([
    contract.symbol(),
    contract.decimals(),
  ])

  const [symbol, decimals] = results
  if (symbol && decimals) {
    console.log('SETTING SYMBOL AND DECIMALS', {symbol, decimals})
    this.setState({symbol: symbol[0], decimals: decimals[0].toString()})
  }
}

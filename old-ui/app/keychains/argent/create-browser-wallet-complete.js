const inherits = require('util').inherits
const Component = require('react').Component
const connect = require('react-redux').connect
const h = require('react-hyperscript')
const actions = require('../../../../ui/app/actions')
const CopyButton = require('../../components/copyButton')

module.exports = connect(mapStateToProps)(CreateBrowserWalletCompleteScreen)

inherits(CreateBrowserWalletCompleteScreen, Component)
function CreateBrowserWalletCompleteScreen () {
  Component.call(this)
}

function mapStateToProps (state) {
  return {
    browserWalletAddress: state.appState.currentView.browserWalletAddress,
    cachedBrowserWalletAddress: state.metamask.browserWalletAddress,
  }
}

CreateBrowserWalletCompleteScreen.prototype.render = function () {
  var state = this.props
  var browserWalletAddress = state.browserWalletAddress || state.cachedBrowserWalletAddress || ''

  return (

    h('.init-complete-screen', [

      // // subtitle and nav
      // h('.section-title.flex-row.flex-center', [
      //   h('h2.page-subtitle', 'Vault Created'),
      // ]),

      h('h1', [
        'Browser key created',
      ]),

      h('p', 'Scan this QR Code with your Argent App.'),

      // h('textarea.twelve-word-phrase', {
      //   readOnly: true,
      //   value: browserWalletAddress,
      // }),
      h('img', {
        src: `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${browserWalletAddress}`
      }),

      h('.copy-full-address', [
        h('div.full-address', browserWalletAddress),
        h(CopyButton, {
          value: browserWalletAddress,
        }),
      ]),

      h('button', {
        onClick: () => this.confirmSeedWords(),
      }, 'I\'ve scanned it with Argent App'),

    ])
  )
}

CreateBrowserWalletCompleteScreen.prototype.confirmSeedWords = function () {
  return this.props.dispatch(actions.confirmBrowserWalletAddress())
}

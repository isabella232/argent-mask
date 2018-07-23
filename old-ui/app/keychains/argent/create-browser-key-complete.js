const inherits = require('util').inherits
const Component = require('react').Component
const connect = require('react-redux').connect
const h = require('react-hyperscript')
const actions = require('../../../../ui/app/actions')

module.exports = connect(mapStateToProps)(CreateBrowserKeyCompleteScreen)

inherits(CreateBrowserKeyCompleteScreen, Component)
function CreateBrowserKeyCompleteScreen () {
  Component.call(this)
}

function mapStateToProps (state) {
  return {
    browserKey: state.appState.currentView.browserKey,
    cachedBrowserKey: state.metamask.browserKey,
  }
}

CreateBrowserKeyCompleteScreen.prototype.render = function () {
  var state = this.props
  var browserKey = state.browserKey || state.cachedBrowserKey || ''

  return (

    h('.initialize-screen.flex-column.flex-center.flex-grow', [

      // // subtitle and nav
      // h('.section-title.flex-row.flex-center', [
      //   h('h2.page-subtitle', 'Vault Created'),
      // ]),

      h('h3.flex-center.text-transform-uppercase', {
        style: {
          background: '#EBEBEB',
          color: '#AEAEAE',
          marginTop: 36,
          marginBottom: 8,
          width: '100%',
          fontSize: '20px',
          padding: 6,
        },
      }, [
        'Browser Key Created',
      ]),

      h('div', {
        style: {
          fontSize: '1em',
          marginTop: '10px',
          textAlign: 'center',
        },
      }, [
        h('span.error', 'Scan this QR Code with your Argent App.'),
      ]),

      // h('textarea.twelve-word-phrase', {
      //   readOnly: true,
      //   value: browserKey,
      // }),
      h('img', {
        src: `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${browserKey}`
      }),

      h('button.primary', {
        onClick: () => this.confirmSeedWords(),
        style: {
          margin: '24px',
          fontSize: '0.9em',
          marginBottom: '10px',
        },
      }, 'I\'ve scanned it with Argent App'),

    ])
  )
}

CreateBrowserKeyCompleteScreen.prototype.confirmSeedWords = function () {
  return this.props.dispatch(actions.confirmBrowserKey())
}

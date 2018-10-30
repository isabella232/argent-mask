const inherits = require('util').inherits
const EventEmitter = require('events').EventEmitter
const Component = require('react').Component
const connect = require('react-redux').connect
const h = require('react-hyperscript')
// const Mascot = require('../components/mascot')
const actions = require('../../../ui/app/actions')
const Tooltip = require('../components/tooltip')
const getCaretCoordinates = require('textarea-caret')

module.exports = connect(mapStateToProps)(InitializeMenuScreen)

inherits(InitializeMenuScreen, Component)
function InitializeMenuScreen() {
  Component.call(this)
  this.animationEventEmitter = new EventEmitter()
}

function mapStateToProps(state) {
  return {
    // state from plugin
    currentView: state.appState.currentView,
    warning: state.appState.warning,
  }
}

InitializeMenuScreen.prototype.render = function () {
  var state = this.props

  switch (state.currentView.name) {

    default:
      return this.renderMenu(state)

  }
}

// InitializeMenuScreen.prototype.componentDidMount = function(){
//   document.getElementById('password-box').focus()
// }

InitializeMenuScreen.prototype.renderMenu = function (state) {
  return (

    h('.initialize-screen.flex-column.flex-center.flex-grow', [

      // h(Mascot, {
      //   animationEventEmitter: this.animationEventEmitter,
      // }),

      h('.logo-stacked', [
        h('div.ren'),
        h('h1.text-wordmark', 'argent'),
        h('div.powered-by', 'Powered by MetaMask'),
      ]),

      h('div.form-group', [
        h('label', {
          htmlFor: 'ens-box'
        }, 'Enter your Argent ENS'),

        h(Tooltip, {
          title: 'Reserve your free Argent ENS by installing the Argent mobile app.',
        }, [
          h('i.fa.fa-question-circle.pointer'),
        ]),

        h('input.form-control', {
          type: 'text',
          id: 'ens-box',
          placeholder: 'yourname.argent.xyz',
          onInput: this.inputChanged.bind(this),
        }),
      ]),



      h('div.form-group', [
        h('label', {
          htmlFor: 'password-box'
        }, 'Choose a password'),

        h(Tooltip, {
          // title: 'Your DEN is your password-encrypted storage within MetaMask.',
          title: 'Argent Connect generates a new browser key to control your wallet. You can revoke that key at any time.',
        }, [
          h('i.fa.fa-question-circle.pointer'),
        ]),

        h('div.error', state.warning),

        // password
        h('input.form-control', {
          type: 'password',
          id: 'password-box',
          placeholder: 'New Password (min 8 chars)',
          onInput: this.inputChanged.bind(this),
        }),
      ]),


      h('div.form-group', [
        // confirm password
        h('input.form-control', {
          type: 'password',
          id: 'password-box-confirm',
          placeholder: 'Confirm Password',
          onKeyPress: this.createVaultOnEnter.bind(this),
          onInput: this.inputChanged.bind(this),
        }),
      ]),



      h('button.primary', {
        // onClick: this.createNewVaultAndKeychain.bind(this),
        // here is oldie
        onClick: this.createNewVault.bind(this),
      }, 'Create'),

      // h('.flex-row.flex-center.flex-grow', [
      //   h('p.pointer', {
      //     onClick: this.showRestoreVault.bind(this),
      //     style: {
      //       fontSize: '0.8em',
      //       color: 'rgb(247, 134, 28)',
      //       textDecoration: 'underline',
      //     },
      //   }, 'Import Existing DEN'),
      // ]),

    ])
  )
}

InitializeMenuScreen.prototype.createVaultOnEnter = function (event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    // this.createNewVaultAndKeychain()
    this.createNewVault()
  }
}

InitializeMenuScreen.prototype.componentDidMount = function () {
  document.getElementById('password-box').focus()
}

InitializeMenuScreen.prototype.showRestoreVault = function () {
  this.props.dispatch(actions.showRestoreVault())
}

// InitializeMenuScreen.prototype.createNewVaultAndKeychain = function () {
//   var passwordBox = document.getElementById('password-box')
//   var password = passwordBox.value
//   var passwordConfirmBox = document.getElementById('password-box-confirm')
//   var passwordConfirm = passwordConfirmBox.value

//   if (password.length < 8) {
//     this.warning = 'password not long enough'
//     this.props.dispatch(actions.displayWarning(this.warning))
//     return
//   }
//   if (password !== passwordConfirm) {
//     this.warning = 'passwords don\'t match'
//     this.props.dispatch(actions.displayWarning(this.warning))
//     return
//   }

//   this.props.dispatch(actions.createNewVaultAndKeychain(password))
// }

InitializeMenuScreen.prototype.createNewVault = function () {
  var ensBox = document.getElementById('ens-box')
  var ens = ensBox.value
  var passwordBox = document.getElementById('password-box')
  var password = passwordBox.value
  var passwordConfirmBox = document.getElementById('password-box-confirm')
  var passwordConfirm = passwordConfirmBox.value

  // ENS Validation

  if (!ens.match(/^\w+(\.argentx\.eth|)?$/)) {
    this.warning = 'Invalid ENS subdomain'
    this.props.dispatch(actions.displayWarning(this.warning))
    return
  }

  if(!ens.endsWith('.argentx.eth')) {
    ens = `${ens}.argentx.eth`
  }

  // Password Validation
  // TODO: change 0 to 8

  if (password.length < 0) {
    this.warning = 'Password is too short'
    this.props.dispatch(actions.displayWarning(this.warning))
    return
  }
  if (password !== passwordConfirm) {
    this.warning = 'Passwords don\'t match'
    this.props.dispatch(actions.displayWarning(this.warning))
    return
  }


  this.props.dispatch(actions.createNewVault(ens, password))
}

InitializeMenuScreen.prototype.inputChanged = function (event) {
  // tell mascot to look at page action
  var element = event.target
  var boundingRect = element.getBoundingClientRect()
  var coordinates = getCaretCoordinates(element, element.selectionEnd)
  this.animationEventEmitter.emit('point', {
    x: boundingRect.left + coordinates.left - element.scrollLeft,
    y: boundingRect.top + coordinates.top - element.scrollTop,
  })
}

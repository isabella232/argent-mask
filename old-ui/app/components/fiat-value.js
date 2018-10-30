const Component = require('react').Component
const h = require('react-hyperscript')
const inherits = require('util').inherits
const formatBalance = require('../util').formatBalance

module.exports = FiatValue

inherits(FiatValue, Component)
function FiatValue () {
  Component.call(this)
}

FiatValue.prototype.render = function () {
  const props = this.props
  const { conversionRate, currentCurrency } = props
  const renderedCurrency = currentCurrency || ''

  const value = formatBalance(props.value, 6)

  if (value === 'None') return value
  var fiatDisplayNumber, fiatTooltipNumber
  var splitBalance = value.split(' ')

  if (conversionRate !== 0) {
    fiatTooltipNumber = Number(splitBalance[0]) * conversionRate
    fiatDisplayNumber = fiatTooltipNumber.toFixed(2)
  } else {
    fiatDisplayNumber = 'N/A'
    fiatTooltipNumber = 'Unknown'
  }

  return fiatDisplay(fiatDisplayNumber, renderedCurrency.toUpperCase())
}

function fiatDisplay (fiatDisplayNumber, fiatSuffix) {
  if (fiatDisplayNumber !== 'N/A') {
    return h('.fiat', [
      h('span.fiat-value', fiatDisplayNumber),
      h('span.currency-suffix', fiatSuffix),
    ])
  } else {
    return h('div')
  }
}

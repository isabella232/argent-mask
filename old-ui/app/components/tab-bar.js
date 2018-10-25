const Component = require('react').Component
const h = require('react-hyperscript')
const inherits = require('util').inherits

module.exports = TabBar

inherits(TabBar, Component)
function TabBar () {
  Component.call(this)
}

TabBar.prototype.render = function () {
  const props = this.props
  const state = this.state || {}
  const { tabs = [], defaultTab, tabSelected } = props
  const { subview = defaultTab } = state

  return (
    h('ul.nav.nav-tabs', tabs.map((tab) => {
      const { key, content } = tab
      return h(subview === key ? 'li.active' : 'li', {
        onClick: () => {
          this.setState({ subview: key })
          tabSelected(key)
        },
      }, content)
    }))
  )
}


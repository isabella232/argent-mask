const Component = require('react').Component
const PropTypes = require('prop-types')
const h = require('react-hyperscript')
const MenuDroppo = require('./menu-droppo')
const extend = require('xtend')

const noop = () => {}

class Dropdown extends Component {
  render () {
    const { isOpen, onClickOutside, style, children, useCssTransition } = this.props


    return h(
      MenuDroppo,
      {
        useCssTransition,
        isOpen,
        zIndex: 11,
        onClickOutside,
        style,
      },
      [
        ...children,
      ]
    )
  }
}

Dropdown.defaultProps = {
  isOpen: false,
  onClick: noop,
  useCssTransition: false,
}

Dropdown.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  children: PropTypes.node,
  style: PropTypes.object.isRequired,
  onClickOutside: PropTypes.func,
  useCssTransition: PropTypes.bool,
}

class DropdownMenuItem extends Component {
  render () {
    const { onClick, closeMenu, children, style } = this.props

    return h(
      'li.dropdown-menu-item',
      {
        onClick: () => {
          onClick()
          closeMenu()
        },
      },
      children
    )
  }
}

DropdownMenuItem.propTypes = {
  closeMenu: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  children: PropTypes.node,
  style: PropTypes.object,
}

module.exports = {
  Dropdown,
  DropdownMenuItem,
}

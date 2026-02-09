const React = require('react');

const mockComponent = name => {
  const Component = props => React.createElement(name, props, props.children);
  Component.displayName = name;
  return Component;
};

module.exports = {
  __esModule: true,
  default: mockComponent('Svg'),
  Svg: mockComponent('Svg'),
  Circle: mockComponent('Circle'),
  Ellipse: mockComponent('Ellipse'),
  G: mockComponent('G'),
  Text: mockComponent('SvgText'),
  TSpan: mockComponent('TSpan'),
  TextPath: mockComponent('TextPath'),
  Path: mockComponent('Path'),
  Polygon: mockComponent('Polygon'),
  Polyline: mockComponent('Polyline'),
  Line: mockComponent('Line'),
  Rect: mockComponent('Rect'),
  Use: mockComponent('Use'),
  Image: mockComponent('SvgImage'),
  Symbol: mockComponent('SvgSymbol'),
  Defs: mockComponent('Defs'),
  LinearGradient: mockComponent('LinearGradient'),
  RadialGradient: mockComponent('RadialGradient'),
  Stop: mockComponent('Stop'),
  ClipPath: mockComponent('ClipPath'),
  Pattern: mockComponent('Pattern'),
  Mask: mockComponent('Mask'),
};

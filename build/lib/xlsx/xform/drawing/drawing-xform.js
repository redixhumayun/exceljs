"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var colCache = require('../../../utils/col-cache');

var XmlStream = require('../../../utils/xml-stream');

var BaseXform = require('../base-xform');

var TwoCellAnchorXform = require('./two-cell-anchor-xform');

var OneCellAnchorXform = require('./one-cell-anchor-xform');

function getAnchorType(model) {
  var range = typeof model.range === 'string' ? colCache.decode(model.range) : model.range;
  return range.br ? 'xdr:twoCellAnchor' : 'xdr:oneCellAnchor';
}

var DrawingXform =
/*#__PURE__*/
function (_BaseXform) {
  _inherits(DrawingXform, _BaseXform);

  function DrawingXform() {
    var _this;

    _classCallCheck(this, DrawingXform);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(DrawingXform).call(this));
    _this.map = {
      'xdr:twoCellAnchor': new TwoCellAnchorXform(),
      'xdr:oneCellAnchor': new OneCellAnchorXform()
    };
    return _this;
  }

  _createClass(DrawingXform, [{
    key: "prepare",
    value: function prepare(model) {
      var _this2 = this;

      model.anchors.forEach(function (item, index) {
        item.anchorType = getAnchorType(item);
        var anchor = _this2.map[item.anchorType];
        anchor.prepare(item, {
          index: index
        });
      });
    }
  }, {
    key: "render",
    value: function render(xmlStream, model) {
      var _this3 = this;

      xmlStream.openXml(XmlStream.StdDocAttributes);
      xmlStream.openNode(this.tag, DrawingXform.DRAWING_ATTRIBUTES);
      model.anchors.forEach(function (item) {
        var anchor = _this3.map[item.anchorType];
        anchor.render(xmlStream, item);
      });
      xmlStream.closeNode();
    }
  }, {
    key: "parseOpen",
    value: function parseOpen(node) {
      if (this.parser) {
        this.parser.parseOpen(node);
        return true;
      }

      switch (node.name) {
        case this.tag:
          this.reset();
          this.model = {
            anchors: []
          };
          break;

        default:
          this.parser = this.map[node.name];

          if (this.parser) {
            this.parser.parseOpen(node);
          }

          break;
      }

      return true;
    }
  }, {
    key: "parseText",
    value: function parseText(text) {
      if (this.parser) {
        this.parser.parseText(text);
      }
    }
  }, {
    key: "parseClose",
    value: function parseClose(name) {
      if (this.parser) {
        if (!this.parser.parseClose(name)) {
          this.model.anchors.push(this.parser.model);
          this.parser = undefined;
        }

        return true;
      }

      switch (name) {
        case this.tag:
          return false;

        default:
          // could be some unrecognised tags
          return true;
      }
    }
  }, {
    key: "reconcile",
    value: function reconcile(model, options) {
      var _this4 = this;

      if (model && model.anchors) {
        model.anchors.forEach(function (anchor) {
          if (anchor.br) {
            _this4.map['xdr:twoCellAnchor'].reconcile(anchor, options);
          } else {
            _this4.map['xdr:oneCellAnchor'].reconcile(anchor, options);
          }
        });
      }
    }
  }, {
    key: "tag",
    get: function get() {
      return 'xdr:wsDr';
    }
  }]);

  return DrawingXform;
}(BaseXform);

DrawingXform.DRAWING_ATTRIBUTES = {
  'xmlns:xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
  'xmlns:a': 'http://schemas.openxmlformats.org/drawingml/2006/main'
};
module.exports = DrawingXform;
//# sourceMappingURL=drawing-xform.js.map

'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var _ = require('../utils/under-dash');

var colCache = require('./../utils/col-cache');

var Range = require('./range');

var Row = require('./row');

var Column = require('./column');

var Enums = require('./enums');

var Image = require('./image');

var DataValidations = require('./data-validations'); // Worksheet requirements
//  Operate as sheet inside workbook or standalone
//  Load and Save from file and stream
//  Access/Add/Delete individual cells
//  Manage column widths and row heights


var Worksheet =
/*#__PURE__*/
function () {
  function Worksheet(options) {
    _classCallCheck(this, Worksheet);

    options = options || {}; // in a workbook, each sheet will have a number

    this.id = options.id;
    this.orderNo = options.orderNo; // and a name

    this.name = options.name || "Sheet".concat(this.id); // add a state

    this.state = options.state || 'visible'; // rows allows access organised by row. Sparse array of arrays indexed by row-1, col
    // Note: _rows is zero based. Must subtract 1 to go from cell.row to index

    this._rows = []; // column definitions

    this._columns = null; // column keys (addRow convenience): key ==> this._collumns index

    this._keys = {}; // keep record of all merges

    this._merges = {}; // record of all row and column pageBreaks

    this.rowBreaks = [];
    this._workbook = options.workbook; // for tabColor, default row height, outline levels, etc

    this.properties = Object.assign({}, {
      defaultRowHeight: 15,
      dyDescent: 55,
      outlineLevelCol: 0,
      outlineLevelRow: 0
    }, options.properties); // for all things printing

    this.pageSetup = Object.assign({}, {
      margins: {
        left: 0.7,
        right: 0.7,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3
      },
      orientation: 'portrait',
      horizontalDpi: 4294967295,
      verticalDpi: 4294967295,
      fitToPage: !!(options.pageSetup && (options.pageSetup.fitToWidth || options.pageSetup.fitToHeight) && !options.pageSetup.scale),
      pageOrder: 'downThenOver',
      blackAndWhite: false,
      draft: false,
      cellComments: 'None',
      errors: 'displayed',
      scale: 100,
      fitToWidth: 1,
      fitToHeight: 1,
      paperSize: undefined,
      showRowColHeaders: false,
      showGridLines: false,
      firstPageNumber: undefined,
      horizontalCentered: false,
      verticalCentered: false,
      rowBreaks: null,
      colBreaks: null
    }, options.pageSetup);
    this.headerFooter = {
      differentFirst: false,
      differentOddEven: false,
      oddHeader: null,
      oddFooter: null,
      evenHeader: null,
      evenFooter: null,
      firstHeader: null,
      firstFooter: null
    };
    this.dataValidations = new DataValidations(); // for freezepanes, split, zoom, gridlines, etc

    this.views = options.views || [];
    this.autoFilter = options.autoFilter || null; // for images, etc

    this._media = [];
  }

  _createClass(Worksheet, [{
    key: "destroy",
    // when you're done with this worksheet, call this to remove from workbook
    value: function destroy() {
      this._workbook.removeWorksheetEx(this);
    } // Get the bounding range of the cells in this worksheet

  }, {
    key: "getColumnKey",
    value: function getColumnKey(key) {
      return this._keys[key];
    }
  }, {
    key: "setColumnKey",
    value: function setColumnKey(key, value) {
      this._keys[key] = value;
    }
  }, {
    key: "deleteColumnKey",
    value: function deleteColumnKey(key) {
      delete this._keys[key];
    }
  }, {
    key: "eachColumnKey",
    value: function eachColumnKey(f) {
      _.each(this._keys, f);
    } // get a single column by col number. If it doesn't exist, create it and any gaps before it

  }, {
    key: "getColumn",
    value: function getColumn(c) {
      if (typeof c === 'string') {
        // if it matches a key'd column, return that
        var col = this._keys[c];
        if (col) return col; // otherwise, assume letter

        c = colCache.l2n(c);
      }

      if (!this._columns) {
        this._columns = [];
      }

      if (c > this._columns.length) {
        var n = this._columns.length + 1;

        while (n <= c) {
          this._columns.push(new Column(this, n++));
        }
      }

      return this._columns[c - 1];
    }
  }, {
    key: "spliceColumns",
    value: function spliceColumns(start, count) {
      var _this = this;

      // each member of inserts is a column of data.
      var inserts = Array.prototype.slice.call(arguments, 2);
      var rows = this._rows;
      var nRows = rows.length;

      if (inserts.length > 0) {
        var _loop = function _loop(i) {
          var rowArguments = [start, count]; // eslint-disable-next-line no-loop-func

          inserts.forEach(function (insert) {
            rowArguments.push(insert[i] || null);
          });

          var row = _this.getRow(i + 1); // eslint-disable-next-line prefer-spread


          row.splice.apply(row, rowArguments);
        };

        // must iterate over all rows whether they exist yet or not
        for (var i = 0; i < nRows; i++) {
          _loop(i);
        }
      } else {
        // nothing to insert, so just splice all rows
        this._rows.forEach(function (r) {
          if (r) {
            r.splice(start, count);
          }
        });
      } // splice column definitions


      var nExpand = inserts.length - count;
      var nKeep = start + count;
      var nEnd = this._columns.length;

      if (nExpand < 0) {
        for (var i = start + inserts.length; i <= nEnd; i++) {
          this.getColumn(i).defn = this.getColumn(i - nExpand).defn;
        }
      } else if (nExpand > 0) {
        for (var _i = nEnd; _i >= nKeep; _i--) {
          this.getColumn(_i + nExpand).defn = this.getColumn(_i).defn;
        }
      }

      for (var _i2 = start; _i2 < start + inserts.length; _i2++) {
        this.getColumn(_i2).defn = null;
      } // account for defined names


      this.workbook.definedNames.spliceColumns(this.name, start, count, inserts.length);
    }
  }, {
    key: "_commitRow",
    // =========================================================================
    // Rows
    value: function _commitRow() {// nop - allows streaming reader to fill a document
    }
  }, {
    key: "findRow",
    // find a row (if exists) by row number
    value: function findRow(r) {
      return this._rows[r - 1];
    }
  }, {
    key: "getRow",
    // get a row by row number.
    value: function getRow(r) {
      var row = this._rows[r - 1];

      if (!row) {
        row = this._rows[r - 1] = new Row(this, r);
      }

      return row;
    }
  }, {
    key: "addRow",
    value: function addRow(value) {
      var row = this.getRow(this._nextRow);
      row.values = value;
      return row;
    }
  }, {
    key: "addRows",
    value: function addRows(value) {
      var _this2 = this;

      value.forEach(function (row) {
        _this2.addRow(row);
      });
    }
  }, {
    key: "spliceRows",
    value: function spliceRows(start, count) {
      var _this3 = this;

      // same problem as row.splice, except worse.
      var inserts = Array.prototype.slice.call(arguments, 2);
      var nKeep = start + count;
      var nExpand = inserts.length - count;
      var nEnd = this._rows.length;
      var i;
      var rSrc;

      if (nExpand < 0) {
        // remove rows
        for (i = nKeep; i <= nEnd; i++) {
          rSrc = this._rows[i - 1];

          if (rSrc) {
            (function () {
              var rDst = _this3.getRow(i + nExpand);

              rDst.values = rSrc.values;
              rDst.style = rSrc.style; // eslint-disable-next-line no-loop-func

              rSrc.eachCell({
                includeEmpty: true
              }, function (cell, colNumber) {
                rDst.getCell(colNumber).style = cell.style;
              });
              _this3._rows[i - 1] = undefined;
            })();
          } else {
            this._rows[i + nExpand - 1] = undefined;
          }
        }
      } else if (nExpand > 0) {
        // insert new cells
        for (i = nEnd; i >= nKeep; i--) {
          rSrc = this._rows[i - 1];

          if (rSrc) {
            (function () {
              var rDst = _this3.getRow(i + nExpand);

              rDst.values = rSrc.values;
              rDst.style = rSrc.style; // eslint-disable-next-line no-loop-func

              rSrc.eachCell({
                includeEmpty: true
              }, function (cell, colNumber) {
                rDst.getCell(colNumber).style = cell.style;
              });
            })();
          } else {
            this._rows[i + nExpand - 1] = undefined;
          }
        }
      } // now copy over the new values


      for (i = 0; i < inserts.length; i++) {
        var rDst = this.getRow(start + i);
        rDst.style = {};
        rDst.values = inserts[i];
      } // account for defined names


      this.workbook.definedNames.spliceRows(this.name, start, count, inserts.length);
    } // iterate over every row in the worksheet, including maybe empty rows

  }, {
    key: "eachRow",
    value: function eachRow(options, iteratee) {
      if (!iteratee) {
        iteratee = options;
        options = undefined;
      }

      if (options && options.includeEmpty) {
        var n = this._rows.length;

        for (var i = 1; i <= n; i++) {
          iteratee(this.getRow(i), i);
        }
      } else {
        this._rows.forEach(function (row) {
          if (row && row.hasValues) {
            iteratee(row, row.number);
          }
        });
      }
    } // return all rows as sparse array

  }, {
    key: "getSheetValues",
    value: function getSheetValues() {
      var rows = [];

      this._rows.forEach(function (row) {
        if (row) {
          rows[row.number] = row.values;
        }
      });

      return rows;
    } // =========================================================================
    // Cells
    // returns the cell at [r,c] or address given by r. If not found, return undefined

  }, {
    key: "findCell",
    value: function findCell(r, c) {
      var address = colCache.getAddress(r, c);
      var row = this._rows[address.row - 1];
      return row ? row.findCell(address.col) : undefined;
    } // return the cell at [r,c] or address given by r. If not found, create a new one.

  }, {
    key: "getCell",
    value: function getCell(r, c) {
      var address = colCache.getAddress(r, c);
      var row = this.getRow(address.row);
      return row.getCellEx(address);
    } // =========================================================================
    // Merge
    // convert the range defined by ['tl:br'], [tl,br] or [t,l,b,r] into a single 'merged' cell

  }, {
    key: "mergeCells",
    value: function mergeCells() {
      var dimensions = new Range(Array.prototype.slice.call(arguments, 0)); // convert arguments into Array
      // check cells aren't already merged

      _.each(this._merges, function (merge) {
        if (merge.intersects(dimensions)) {
          throw new Error('Cannot merge already merged cells');
        }
      }); // apply merge


      var master = this.getCell(dimensions.top, dimensions.left);

      for (var i = dimensions.top; i <= dimensions.bottom; i++) {
        for (var j = dimensions.left; j <= dimensions.right; j++) {
          // merge all but the master cell
          if (i > dimensions.top || j > dimensions.left) {
            this.getCell(i, j).merge(master);
          }
        }
      } // index merge


      this._merges[master.address] = dimensions;
    }
  }, {
    key: "_unMergeMaster",
    value: function _unMergeMaster(master) {
      // master is always top left of a rectangle
      var merge = this._merges[master.address];

      if (merge) {
        for (var i = merge.top; i <= merge.bottom; i++) {
          for (var j = merge.left; j <= merge.right; j++) {
            this.getCell(i, j).unmerge();
          }
        }

        delete this._merges[master.address];
      }
    }
  }, {
    key: "unMergeCells",
    // scan the range defined by ['tl:br'], [tl,br] or [t,l,b,r] and if any cell is part of a merge,
    // un-merge the group. Note this function can affect multiple merges and merge-blocks are
    // atomic - either they're all merged or all un-merged.
    value: function unMergeCells() {
      var dimensions = new Range(Array.prototype.slice.call(arguments, 0)); // convert arguments into Array
      // find any cells in that range and unmerge them

      for (var i = dimensions.top; i <= dimensions.bottom; i++) {
        for (var j = dimensions.left; j <= dimensions.right; j++) {
          var cell = this.findCell(i, j);

          if (cell) {
            if (cell.type === Enums.ValueType.Merge) {
              // this cell merges to another master
              this._unMergeMaster(cell.master);
            } else if (this._merges[cell.address]) {
              // this cell is a master
              this._unMergeMaster(cell);
            }
          }
        }
      }
    } // ===========================================================================
    // Shared Formula

  }, {
    key: "fillFormula",
    value: function fillFormula(range, formula, results) {
      // Define formula for top-left cell and share to rest
      var decoded = colCache.decode(range);
      var top = decoded.top,
          left = decoded.left,
          bottom = decoded.bottom,
          right = decoded.right;
      var width = right - left + 1;
      var masterAddress = colCache.encodeAddress(top, left); // work out result accessor

      var getResult;

      if (typeof results === 'function') {
        getResult = results;
      } else if (Array.isArray(results)) {
        if (Array.isArray(results[0])) {
          getResult = function getResult(row, col) {
            return results[row - top][col - left];
          };
        } else {
          getResult = function getResult(row, col) {
            return results[(row - top) * width + (col - left)];
          };
        }
      } else {
        getResult = function getResult() {
          return undefined;
        };
      }

      var first = true;

      for (var r = top; r <= bottom; r++) {
        for (var c = left; c <= right; c++) {
          if (first) {
            this.getCell(r, c).value = {
              formula: formula,
              result: getResult(r, c)
            };
            first = false;
          } else {
            this.getCell(r, c).value = {
              sharedFormula: masterAddress,
              result: getResult(r, c)
            };
          }
        }
      }
    } // =========================================================================
    // Images

  }, {
    key: "addImage",
    value: function addImage(imageId, range) {
      var model = {
        type: 'image',
        imageId: imageId,
        range: range
      };

      this._media.push(new Image(this, model));
    }
  }, {
    key: "getImages",
    value: function getImages() {
      return this._media.filter(function (m) {
        return m.type === 'image';
      });
    }
  }, {
    key: "addBackgroundImage",
    value: function addBackgroundImage(imageId) {
      var model = {
        type: 'background',
        imageId: imageId
      };

      this._media.push(new Image(this, model));
    }
  }, {
    key: "getBackgroundImageId",
    value: function getBackgroundImageId() {
      var image = this._media.find(function (m) {
        return m.type === 'background';
      });

      return image && image.imageId;
    } // ===========================================================================
    // Deprecated

  }, {
    key: "_parseRows",
    value: function _parseRows(model) {
      var _this4 = this;

      this._rows = [];
      model.rows.forEach(function (rowModel) {
        var row = new Row(_this4, rowModel.number);
        _this4._rows[row.number - 1] = row;
        row.model = rowModel;
      });
    }
  }, {
    key: "_parseMergeCells",
    value: function _parseMergeCells(model) {
      var _this5 = this;

      _.each(model.mergeCells, function (merge) {
        _this5.mergeCells(merge);
      });
    }
  }, {
    key: "workbook",
    get: function get() {
      return this._workbook;
    }
  }, {
    key: "dimensions",
    get: function get() {
      var dimensions = new Range();

      this._rows.forEach(function (row) {
        if (row) {
          var rowDims = row.dimensions;

          if (rowDims) {
            dimensions.expand(row.number, rowDims.min, row.number, rowDims.max);
          }
        }
      });

      return dimensions;
    } // =========================================================================
    // Columns
    // get the current columns array.

  }, {
    key: "columns",
    get: function get() {
      return this._columns;
    } // set the columns from an array of column definitions.
    // Note: any headers defined will overwrite existing values.
    ,
    set: function set(value) {
      var _this6 = this;

      // calculate max header row count
      this._headerRowCount = value.reduce(function (pv, cv) {
        var headerCount = cv.header && 1 || cv.headers && cv.headers.length || 0;
        return Math.max(pv, headerCount);
      }, 0); // construct Column objects

      var count = 1;
      var columns = this._columns = [];
      value.forEach(function (defn) {
        var column = new Column(_this6, count++, false);
        columns.push(column);
        column.defn = defn;
      });
    }
  }, {
    key: "columnCount",
    get: function get() {
      var maxCount = 0;
      this.eachRow(function (row) {
        maxCount = Math.max(maxCount, row.cellCount);
      });
      return maxCount;
    }
  }, {
    key: "actualColumnCount",
    get: function get() {
      // performance nightmare - for each row, counts all the columns used
      var counts = [];
      var count = 0;
      this.eachRow(function (row) {
        row.eachCell(function (_ref) {
          var col = _ref.col;

          if (!counts[col]) {
            counts[col] = true;
            count++;
          }
        });
      });
      return count;
    }
  }, {
    key: "_lastRowNumber",
    get: function get() {
      // need to cope with results of splice
      var rows = this._rows;
      var n = rows.length;

      while (n > 0 && rows[n - 1] === undefined) {
        n--;
      }

      return n;
    }
  }, {
    key: "_nextRow",
    get: function get() {
      return this._lastRowNumber + 1;
    }
  }, {
    key: "lastRow",
    get: function get() {
      if (this._rows.length) {
        return this._rows[this._rows.length - 1];
      }

      return undefined;
    }
  }, {
    key: "rowCount",
    get: function get() {
      return this._lastRowNumber;
    }
  }, {
    key: "actualRowCount",
    get: function get() {
      // counts actual rows that have actual data
      var count = 0;
      this.eachRow(function () {
        count++;
      });
      return count;
    }
  }, {
    key: "hasMerges",
    get: function get() {
      // return true if this._merges has a merge object
      return _.some(this._merges, Boolean);
    }
  }, {
    key: "tabColor",
    get: function get() {
      // eslint-disable-next-line no-console
      console.trace('worksheet.tabColor property is now deprecated. Please use worksheet.properties.tabColor');
      return this.properties.tabColor;
    },
    set: function set(value) {
      // eslint-disable-next-line no-console
      console.trace('worksheet.tabColor property is now deprecated. Please use worksheet.properties.tabColor');
      this.properties.tabColor = value;
    } // ===========================================================================
    // Model

  }, {
    key: "model",
    get: function get() {
      var model = {
        id: this.id,
        name: this.name,
        dataValidations: this.dataValidations.model,
        properties: this.properties,
        state: this.state,
        pageSetup: this.pageSetup,
        headerFooter: this.headerFooter,
        rowBreaks: this.rowBreaks,
        views: this.views,
        autoFilter: this.autoFilter,
        media: this._media.map(function (medium) {
          return medium.model;
        })
      }; // =================================================
      // columns

      model.cols = Column.toModel(this.columns); // ==========================================================
      // Rows

      var rows = model.rows = [];
      var dimensions = model.dimensions = new Range();

      this._rows.forEach(function (row) {
        var rowModel = row && row.model;

        if (rowModel) {
          dimensions.expand(rowModel.number, rowModel.min, rowModel.number, rowModel.max);
          rows.push(rowModel);
        }
      }); // ==========================================================
      // Merges


      model.merges = [];

      _.each(this._merges, function (merge) {
        model.merges.push(merge.range);
      });

      return model;
    },
    set: function set(value) {
      var _this7 = this;

      this.name = value.name;
      this._columns = Column.fromModel(this, value.cols);

      this._parseRows(value);

      this._parseMergeCells(value);

      this.dataValidations = new DataValidations(value.dataValidations);
      this.properties = value.properties;
      this.pageSetup = value.pageSetup;
      this.headerFooter = value.headerFooter;
      this.views = value.views;
      this.autoFilter = value.autoFilter;
      this._media = value.media.map(function (medium) {
        return new Image(_this7, medium);
      });
    }
  }]);

  return Worksheet;
}();

module.exports = Worksheet;
//# sourceMappingURL=worksheet.js.map

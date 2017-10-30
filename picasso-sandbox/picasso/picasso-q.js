/**
 * @qlik/picasso-q v0.33.0
 * Copyright (c) 2017 QlikTech International AB
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.picassoQ = factory());
}(this, (function () { 'use strict';

function count(node) {
  var sum = 0,
      children = node.children,
      i = children && children.length;
  if (!i) sum = 1;
  else while (--i >= 0) sum += children[i].value;
  node.value = sum;
}

var node_count = function() {
  return this.eachAfter(count);
};

var node_each = function(callback) {
  var node = this, current, next = [node], children, i, n;
  do {
    current = next.reverse(), next = [];
    while (node = current.pop()) {
      callback(node), children = node.children;
      if (children) for (i = 0, n = children.length; i < n; ++i) {
        next.push(children[i]);
      }
    }
  } while (next.length);
  return this;
};

var node_eachBefore = function(callback) {
  var node = this, nodes = [node], children, i;
  while (node = nodes.pop()) {
    callback(node), children = node.children;
    if (children) for (i = children.length - 1; i >= 0; --i) {
      nodes.push(children[i]);
    }
  }
  return this;
};

var node_eachAfter = function(callback) {
  var node = this, nodes = [node], next = [], children, i, n;
  while (node = nodes.pop()) {
    next.push(node), children = node.children;
    if (children) for (i = 0, n = children.length; i < n; ++i) {
      nodes.push(children[i]);
    }
  }
  while (node = next.pop()) {
    callback(node);
  }
  return this;
};

var node_sum = function(value) {
  return this.eachAfter(function(node) {
    var sum = +value(node.data) || 0,
        children = node.children,
        i = children && children.length;
    while (--i >= 0) sum += children[i].value;
    node.value = sum;
  });
};

var node_sort = function(compare) {
  return this.eachBefore(function(node) {
    if (node.children) {
      node.children.sort(compare);
    }
  });
};

var node_path = function(end) {
  var start = this,
      ancestor = leastCommonAncestor(start, end),
      nodes = [start];
  while (start !== ancestor) {
    start = start.parent;
    nodes.push(start);
  }
  var k = nodes.length;
  while (end !== ancestor) {
    nodes.splice(k, 0, end);
    end = end.parent;
  }
  return nodes;
};

function leastCommonAncestor(a, b) {
  if (a === b) return a;
  var aNodes = a.ancestors(),
      bNodes = b.ancestors(),
      c = null;
  a = aNodes.pop();
  b = bNodes.pop();
  while (a === b) {
    c = a;
    a = aNodes.pop();
    b = bNodes.pop();
  }
  return c;
}

var node_ancestors = function() {
  var node = this, nodes = [node];
  while (node = node.parent) {
    nodes.push(node);
  }
  return nodes;
};

var node_descendants = function() {
  var nodes = [];
  this.each(function(node) {
    nodes.push(node);
  });
  return nodes;
};

var node_leaves = function() {
  var leaves = [];
  this.eachBefore(function(node) {
    if (!node.children) {
      leaves.push(node);
    }
  });
  return leaves;
};

var node_links = function() {
  var root = this, links = [];
  root.each(function(node) {
    if (node !== root) { // Don’t include the root’s parent, if any.
      links.push({source: node.parent, target: node});
    }
  });
  return links;
};

function hierarchy(data, children) {
  var root = new Node(data),
      valued = +data.value && (root.value = data.value),
      node,
      nodes = [root],
      child,
      childs,
      i,
      n;

  if (children == null) children = defaultChildren;

  while (node = nodes.pop()) {
    if (valued) node.value = +node.data.value;
    if ((childs = children(node.data)) && (n = childs.length)) {
      node.children = new Array(n);
      for (i = n - 1; i >= 0; --i) {
        nodes.push(child = node.children[i] = new Node(childs[i]));
        child.parent = node;
        child.depth = node.depth + 1;
      }
    }
  }

  return root.eachBefore(computeHeight);
}

function node_copy() {
  return hierarchy(this).eachBefore(copyData);
}

function defaultChildren(d) {
  return d.children;
}

function copyData(node) {
  node.data = node.data.data;
}

function computeHeight(node) {
  var height = 0;
  do node.height = height;
  while ((node = node.parent) && (node.height < ++height));
}

function Node(data) {
  this.data = data;
  this.depth =
  this.height = 0;
  this.parent = null;
}

Node.prototype = hierarchy.prototype = {
  constructor: Node,
  count: node_count,
  each: node_each,
  eachAfter: node_eachAfter,
  eachBefore: node_eachBefore,
  sum: node_sum,
  sort: node_sort,
  path: node_path,
  ancestors: node_ancestors,
  descendants: node_descendants,
  leaves: node_leaves,
  links: node_links,
  copy: node_copy
};

function enclosesNot(a, b) {
  var dr = a.r - b.r, dx = b.x - a.x, dy = b.y - a.y;
  return dr < 0 || dr * dr < dx * dx + dy * dy;
}

function enclosesWeak(a, b) {
  var dr = a.r - b.r + 1e-6, dx = b.x - a.x, dy = b.y - a.y;
  return dr > 0 && dr * dr > dx * dx + dy * dy;
}

function enclosesWeakAll(a, B) {
  for (var i = 0; i < B.length; ++i) {
    if (!enclosesWeak(a, B[i])) {
      return false;
    }
  }
  return true;
}

function encloseBasis2(a, b) {
  var x1 = a.x, y1 = a.y, r1 = a.r,
      x2 = b.x, y2 = b.y, r2 = b.r,
      x21 = x2 - x1, y21 = y2 - y1, r21 = r2 - r1,
      l = Math.sqrt(x21 * x21 + y21 * y21);
  return {
    x: (x1 + x2 + x21 / l * r21) / 2,
    y: (y1 + y2 + y21 / l * r21) / 2,
    r: (l + r1 + r2) / 2
  };
}

function encloseBasis3(a, b, c) {
  var x1 = a.x, y1 = a.y, r1 = a.r,
      x2 = b.x, y2 = b.y, r2 = b.r,
      x3 = c.x, y3 = c.y, r3 = c.r,
      a2 = x1 - x2,
      a3 = x1 - x3,
      b2 = y1 - y2,
      b3 = y1 - y3,
      c2 = r2 - r1,
      c3 = r3 - r1,
      d1 = x1 * x1 + y1 * y1 - r1 * r1,
      d2 = d1 - x2 * x2 - y2 * y2 + r2 * r2,
      d3 = d1 - x3 * x3 - y3 * y3 + r3 * r3,
      ab = a3 * b2 - a2 * b3,
      xa = (b2 * d3 - b3 * d2) / (ab * 2) - x1,
      xb = (b3 * c2 - b2 * c3) / ab,
      ya = (a3 * d2 - a2 * d3) / (ab * 2) - y1,
      yb = (a2 * c3 - a3 * c2) / ab,
      A = xb * xb + yb * yb - 1,
      B = 2 * (r1 + xa * xb + ya * yb),
      C = xa * xa + ya * ya - r1 * r1,
      r = -(A ? (B + Math.sqrt(B * B - 4 * A * C)) / (2 * A) : C / B);
  return {
    x: x1 + xa + xb * r,
    y: y1 + ya + yb * r,
    r: r
  };
}

var treemapDice = function(parent, x0, y0, x1, y1) {
  var nodes = parent.children,
      node,
      i = -1,
      n = nodes.length,
      k = parent.value && (x1 - x0) / parent.value;

  while (++i < n) {
    node = nodes[i], node.y0 = y0, node.y1 = y1;
    node.x0 = x0, node.x1 = x0 += node.value * k;
  }
};

function TreeNode(node, i) {
  this._ = node;
  this.parent = null;
  this.children = null;
  this.A = null; // default ancestor
  this.a = this; // ancestor
  this.z = 0; // prelim
  this.m = 0; // mod
  this.c = 0; // change
  this.s = 0; // shift
  this.t = null; // thread
  this.i = i; // number
}

TreeNode.prototype = Object.create(Node.prototype);

var treemapSlice = function(parent, x0, y0, x1, y1) {
  var nodes = parent.children,
      node,
      i = -1,
      n = nodes.length,
      k = parent.value && (y1 - y0) / parent.value;

  while (++i < n) {
    node = nodes[i], node.x0 = x0, node.x1 = x1;
    node.y0 = y0, node.y1 = y0 += node.value * k;
  }
};

function squarifyRatio(ratio, parent, x0, y0, x1, y1) {
  var rows = [],
      nodes = parent.children,
      row,
      nodeValue,
      i0 = 0,
      i1 = 0,
      n = nodes.length,
      dx, dy,
      value = parent.value,
      sumValue,
      minValue,
      maxValue,
      newRatio,
      minRatio,
      alpha,
      beta;

  while (i0 < n) {
    dx = x1 - x0, dy = y1 - y0;

    // Find the next non-empty node.
    do sumValue = nodes[i1++].value; while (!sumValue && i1 < n);
    minValue = maxValue = sumValue;
    alpha = Math.max(dy / dx, dx / dy) / (value * ratio);
    beta = sumValue * sumValue * alpha;
    minRatio = Math.max(maxValue / beta, beta / minValue);

    // Keep adding nodes while the aspect ratio maintains or improves.
    for (; i1 < n; ++i1) {
      sumValue += nodeValue = nodes[i1].value;
      if (nodeValue < minValue) minValue = nodeValue;
      if (nodeValue > maxValue) maxValue = nodeValue;
      beta = sumValue * sumValue * alpha;
      newRatio = Math.max(maxValue / beta, beta / minValue);
      if (newRatio > minRatio) { sumValue -= nodeValue; break; }
      minRatio = newRatio;
    }

    // Position and record the row orientation.
    rows.push(row = {value: sumValue, dice: dx < dy, children: nodes.slice(i0, i1)});
    if (row.dice) treemapDice(row, x0, y0, x1, value ? y0 += dy * sumValue / value : y1);
    else treemapSlice(row, x0, y0, value ? x0 += dx * sumValue / value : x1, y1);
    value -= sumValue, i0 = i1;
  }

  return rows;
}

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();





var defineProperty = function (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};





















var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();













var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

/**
 * Resolves the value at the given JSON path
 * @private
 * @param  {String} path [description]
 * @param  {Object} obj  [description]
 * @return {Object}      [description]
 *
 * @example
 * let path = "/path/to/paradise";
 * let obj = {
 *   path: {
 *     to: { paradise: "heaven"},
 *     from: {...}
 *   }
 * };
 * resolve( path, obj ); // "heaven"
 */
function resolve(path, obj) {
  if (path.charAt(0) === '/') {
    path = path.substring(1);
  }
  var arr = path.split('/');
  var subpath = void 0;
  var container = obj;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] === '*' && Array.isArray(container)) {
      var carr = [];
      subpath = arr.slice(i + 1).join('/');
      for (var c = 0; c < container.length; c++) {
        var v = resolve(subpath, container[c]);
        // v.forEach(_ => _._parent = container[c]);
        if (Array.isArray(v)) {
          carr.push.apply(carr, toConsumableArray(v));
        } else {
          carr.push(v);
        }
      }
      return carr;
      // return container.map(v => resolve(arr.slice(i + 1).join('/'), v));
    } else if (!arr[i] && Array.isArray(container)) {
      var _carr = new Array(container.length);
      subpath = arr.slice(i + 1).join('/');
      for (var _c = 0; _c < container.length; _c++) {
        _carr[_c] = resolve(subpath, container[_c]);
      }
      return _carr;
      // return container.map(v => resolve(arr.slice(i + 1).join('/'), v));
    } else if (arr[i] in container) {
      container = container[arr[i]];
    }
  }

  return container;
}

function getKPath(fieldIdx, cube) {
  var idx = fieldIdx;
  var numDimz = cube.qDimensionInfo.length;
  var numMeas = cube.qMeasureInfo.length;
  var order = cube.qEffectiveInterColumnSortOrder;
  if (idx < numDimz && order) {
    idx = order.indexOf(idx);
  } else if (idx >= numDimz && order && numMeas > 1 && order.indexOf(-1) !== -1) {
    idx = order.indexOf(-1);
  }
  var s = '/qData/*/qSubNodes';
  var depth = Math.max(0, Math.min(idx, numDimz));
  var i = 0;
  for (; i < depth; i++) {
    // traverse down to specified depth
    s += '/*/qSubNodes';
  }
  if (fieldIdx >= numDimz) {
    // if the depth is a pseudo level, pick the given pseudo dimension, and then traverse down to leaf level (value nodes)
    if (numMeas > 1) {
      s += '/' + (fieldIdx - numDimz) + '/qSubNodes'; // pick pseudo dimension (measure)
      ++i;
      // traverse to value nodes
      for (; i <= numDimz; i++) {
        s += '/*/qSubNodes';
      }
    } else {
      s += '/' + (fieldIdx - numDimz);
    }
  }
  return s;
}

function getAttrPath(s, attrIdx, attrDimIdx) {
  if (typeof attrIdx === 'number') {
    return s + '/*/qAttrExps/qValues/' + attrIdx;
  }
  if (typeof attrDimIdx === 'number') {
    return s + '/*/qAttrDims/qValues/' + attrDimIdx;
  }
  return s;
}

function getPathToFieldItems(field, _ref) {
  var cache = _ref.cache,
      cube = _ref.cube;

  if (!field) {
    return '';
  }
  var fieldIdx = cache.fields.indexOf(field);
  var attrIdx = void 0;
  var attrDimIdx = void 0;
  if (fieldIdx === -1) {
    for (var i = 0; i < cache.attributeDimensionFields.length; i++) {
      attrDimIdx = cache.attributeDimensionFields[i] ? cache.attributeDimensionFields[i].indexOf(field) : -1;
      if (attrDimIdx !== -1) {
        fieldIdx = i;
        break;
      }
    }
  }
  if (fieldIdx === -1) {
    for (var _i = 0; _i < cache.attributeExpressionFields.length; _i++) {
      attrIdx = cache.attributeExpressionFields[_i] ? cache.attributeExpressionFields[_i].indexOf(field) : -1;
      if (attrIdx !== -1) {
        fieldIdx = _i;
        break;
      }
    }
  }
  return getAttrPath(getKPath(fieldIdx, cube), attrIdx >= 0 ? attrIdx : undefined, attrDimIdx >= 0 ? attrDimIdx : undefined);
}

function getTreePath(field, _ref2) {
  var cache = _ref2.cache,
      cube = _ref2.cube;

  var s1 = getPathToFieldItems(field, { cache: cache, cube: cube });
  var s2 = s1.replace(/qSubNodes/g, 'children');
  var s3 = s2.replace(/children$/g, 'children/*');
  return s3.replace(/qData\/\*/, '');
}

function augment(config, dataset, cache, deps) {
  var rootPath = '/qStackedDataPages/*/qData';
  var cube = dataset.raw();

  var root = resolve(rootPath, cube);
  if (!root || !root[0]) {
    return null;
  }

  var h = hierarchy(root[0], config.children || function (node) {
    return node.qSubNodes;
  });

  var height = h.height;
  var propDefs = [];

  var _loop = function _loop(i) {
    var _deps$normalizeConfig = deps.normalizeConfig(config, dataset),
        props = _deps$normalizeConfig.props,
        main = _deps$normalizeConfig.main;

    var propsArr = Object.keys(props);
    propDefs[i] = { propsArr: propsArr, props: props, main: main };
    var currentField = null;
    var isRoot = i === 0;
    if (i > 0) {
      var idx = cube.qEffectiveInterColumnSortOrder[i - 1];
      // if (idx === -1) { // pseudo
      //   let childIdx = node.parent.children.indexOf(node);
      //   idx = cube.qDimensionInfo.length + childIdx; // measure field
      // }
      if (i > cube.qEffectiveInterColumnSortOrder.length) {
        idx = cube.qDimensionInfo.length;
      }

      currentField = cache.fields[idx];
    }
    var currentItemsPath = currentField ? getTreePath(currentField, { cube: cube, cache: cache }) : rootPath;

    propsArr.forEach(function (prop) {
      var p = props[prop];

      if (p.field) {
        var fieldPath = getTreePath(p.field, { cube: cube, cache: cache });
        if (fieldPath === currentItemsPath) {
          p.isSame = true;
        } else if (isRoot) {
          p.isDescendant = true;
          p.path = fieldPath + '/data';
        } else {
          var isDescendant = fieldPath.match(/\//g).length > currentItemsPath.match(/\//g).length;
          var pathToNode = '';
          if (isDescendant) {
            pathToNode = fieldPath.replace(currentItemsPath, '').replace(/^\/\*/, '') + '/data';
          } else {
            pathToNode = Math.ceil((currentItemsPath.match(/\//g).length - fieldPath.match(/\//g).length) / 2);
          }
          p.isDescendant = isDescendant;
          p.path = pathToNode;
        }
      }
    });
  };

  for (var i = 0; i <= height; i++) {
    _loop(i);
  }

  var originalData = [];
  var expando = 0;
  h.each(function (node) {
    var currentOriginal = originalData[expando++] = node.data;
    var propsArr = propDefs[node.depth].propsArr;
    var props = propDefs[node.depth].props;
    var main = propDefs[node.depth].main;

    node.data = {
      value: typeof main.value === 'function' ? main.value(currentOriginal) : currentOriginal
    };
    propsArr.forEach(function (prop) {
      var p = props[prop];
      var fn = function fn(v) {
        return v;
      };
      var value = void 0;
      if (p.type === 'primitive') {
        value = p.value;
      } else {
        if (typeof p.value === 'function') {
          fn = function fn(v) {
            return p.value(v);
          };
        }
        if (!p.field) {
          value = currentOriginal;
        } else if (p.isSame) {
          value = currentOriginal;
        } else if (p.isDescendant) {
          value = resolve(p.path, node);
          if (Array.isArray(value)) {
            value = value.map(fn);
            fn = p.reduce || function (v) {
              return v.join(', ');
            };
          }
        } else if (p.path) {
          // ancestor
          var num = p.path || 0;
          var it = node;
          for (var i = 0; i < num; i++) {
            it = it.parent;
          }
          value = it.data.value;
        }
      }
      node.data[prop] = {
        value: fn(value)
      };
      if (p.source) {
        node.data[prop].source = { field: p.source };
      }
    });
  });

  return h;
}

function flattenTree(children, steps, prop, arrIndexAtTargetDepth) {
  var arr = [];
  if (steps <= 0) {
    var nodes = arrIndexAtTargetDepth >= 0 ? [children[arrIndexAtTargetDepth]] : children;
    if (prop) {
      arr.push.apply(arr, toConsumableArray(nodes.map(function (v) {
        return v[prop];
      })));
    } else {
      arr.push.apply(arr, toConsumableArray(nodes));
    }
  } else {
    for (var i = 0; i < children.length; i++) {
      if (children[i].children && children[i].children.length) {
        arr.push.apply(arr, toConsumableArray(flattenTree(children[i].children, steps - 1, prop, arrIndexAtTargetDepth)));
      }
    }
  }
  return arr;
}

function treeAccessor(sourceDepth, targetDepth, prop, arrIndexAtTargetDepth) {
  if (sourceDepth === targetDepth) {
    return function (d) {
      return d;
    };
  }
  if (sourceDepth > targetDepth) {
    // traverse upwards
    var steps = Math.max(0, Math.min(100, sourceDepth - targetDepth));
    var path = [].concat(toConsumableArray(Array(steps))).map(String.prototype.valueOf, 'parent').join('.');
    var fn = void 0;
    if (prop) {
      fn = Function('node', 'return node.' + path + '.' + prop + ';'); // eslint-disable-line no-new-func
    } else {
      fn = Function('node', 'return node.' + path + ';'); // eslint-disable-line no-new-func
    }
    return fn;
  }
  if (targetDepth > sourceDepth) {
    // flatten descendants
    var _steps = Math.max(0, Math.min(100, targetDepth - sourceDepth));
    var _fn = function _fn(node) {
      return flattenTree(node.children, _steps - 1, prop, arrIndexAtTargetDepth);
    };
    return _fn;
  }
  return false;
}

function findField(query, _ref) {
  var cache = _ref.cache;

  // if (ATTR_DIM_RX.test(id) && query) { // true if this table is an attribute dimension table
  //   const idx = +/\/(\d+)/.exec(query)[1];
  //   return fields[idx];
  // }

  if (typeof query === 'number') {
    return cache.fields[query];
  }

  var allFields = cache.fields.slice();
  (cache.attributeDimensionFields || []).forEach(function (fields) {
    return allFields.push.apply(allFields, toConsumableArray(fields));
  });
  (cache.attributeExpressionFields || []).forEach(function (fields) {
    return allFields.push.apply(allFields, toConsumableArray(fields));
  });
  if (typeof query === 'string') {
    for (var i = 0; i < allFields.length; i++) {
      // console.log(allFields[i].key());
      if (allFields[i].key() === query || allFields[i].title() === query) {
        return allFields[i];
      }
    }
  } else if (query && allFields.indexOf(query) !== -1) {
    // assume 'query' is a field instance
    return query;
  }

  throw Error('Field not found: ' + query);
}

var DIM_RX = /^qDimensionInfo(?:\/(\d+))?/;
var M_RX = /^qMeasureInfo\/(\d+)/;
var ATTR_EXPR_RX = /\/qAttrExprInfo\/(\d+)/;
var ATTR_DIM_RX = /\/qAttrDimInfo\/(\d+)/;

function getFieldDepth(field, _ref) {
  var cube = _ref.cube;

  if (!field) {
    return -1;
  }
  var key = field.key();
  var isFieldDimension = false;
  var fieldIdx = -1; // cache.fields.indexOf(field);
  var attrIdx = -1;
  var attrDimIdx = -1;
  var fieldDepth = -1;
  var pseudoMeasureIndex = -1;
  var remainder = void 0;

  if (DIM_RX.test(key)) {
    isFieldDimension = true;
    fieldIdx = +DIM_RX.exec(key)[1];
    remainder = key.replace(DIM_RX, '');
  } else if (M_RX.test(key)) {
    pseudoMeasureIndex = +M_RX.exec(key)[1];
    remainder = key.replace(M_RX, '');
  }

  if (remainder) {
    if (ATTR_DIM_RX.exec(remainder)) {
      attrDimIdx = +ATTR_DIM_RX.exec(remainder)[1];
    } else if (ATTR_EXPR_RX.exec(remainder)) {
      attrIdx = +ATTR_EXPR_RX.exec(remainder)[1];
    }
  }

  var treeOrder = cube.qEffectiveInterColumnSortOrder;

  if (isFieldDimension) {
    fieldDepth = treeOrder ? treeOrder.indexOf(fieldIdx) : fieldIdx;
  } else if (treeOrder && treeOrder.indexOf(-1) !== -1) {
    // if pseudo dimension exists in sort order
    fieldDepth = treeOrder.indexOf(-1); // depth of pesudodimension
  } else {
    // assume measure is at the bottom of the tree
    fieldDepth = cube.qDimensionInfo.length;
  }

  return {
    fieldDepth: fieldDepth + 1, // +1 due to root node
    pseudoMeasureIndex: pseudoMeasureIndex,
    attrDimIdx: attrDimIdx,
    attrIdx: attrIdx
  };
}

function getFieldAccessor(sourceDepthObject, targetDepthObject, prop) {
  var nodeFn = treeAccessor(sourceDepthObject.fieldDepth, targetDepthObject.fieldDepth, prop, targetDepthObject.pseudoMeasureIndex);
  var attrFn = void 0;

  if (targetDepthObject.attrDimIdx >= 0) {
    attrFn = function attrFn(data) {
      return data.qAttrDims.qValues[targetDepthObject.attrDimIdx];
    };
  } else if (targetDepthObject.attrIdx >= 0) {
    attrFn = function attrFn(data) {
      return data.qAttrExps.qValues[targetDepthObject.attrIdx];
    };
  }

  return {
    nodeFn: nodeFn,
    attrFn: attrFn
  };
}

function extract(config, dataset, cache, deps) {
  var cfgs = Array.isArray(config) ? config : [config];
  var dataItems = [];
  cfgs.forEach(function (cfg) {
    if (cfg.field) {
      var cube = dataset.raw();
      var f = _typeof(cfg.field) === 'object' ? cfg.field : dataset.field(cfg.field);

      var _deps$normalizeConfig = deps.normalizeConfig(cfg, dataset),
          props = _deps$normalizeConfig.props,
          main = _deps$normalizeConfig.main;

      var propsArr = Object.keys(props);
      var rootPath = '/qStackedDataPages/*/qData';
      if (!cache.tree) {
        var root = resolve(rootPath, cube);
        cache.tree = hierarchy(root[0], function (node) {
          return node.qSubNodes;
        });
      }
      var itemDepthObject = getFieldDepth(f, { cube: cube, cache: cache });

      var _getFieldAccessor = getFieldAccessor({ fieldDepth: 0 }, itemDepthObject),
          nodeFn = _getFieldAccessor.nodeFn,
          attrFn = _getFieldAccessor.attrFn;

      var items = nodeFn(cache.tree);
      propsArr.forEach(function (prop) {
        var p = props[prop];
        if (p.field) {
          if (p.field === f) {
            p.isSame = true;
          } else {
            var depthObject = getFieldDepth(p.field, { cube: cube, cache: cache });
            var accessors = getFieldAccessor(itemDepthObject, depthObject, 'data');
            p.accessor = accessors.nodeFn;
            p.attrAccessor = accessors.attrFn;
          }
        }
      });
      var mapped = items.map(function (item) {
        var itemData = attrFn ? attrFn(item.data) : item.data;
        var ret = {
          value: typeof main.value === 'function' ? main.value(itemData) : typeof main.value !== 'undefined' ? main.value : itemData, // eslint-disable-line no-nested-ternary
          source: {
            field: main.field.key()
          }
        };
        propsArr.forEach(function (prop) {
          var p = props[prop];
          var fn = void 0;
          var value = void 0;
          if (p.type === 'primitive') {
            value = p.value;
          } else {
            if (typeof p.value === 'function') {
              // accessor function
              fn = p.value;
            }
            if (p.accessor) {
              value = p.accessor(item);
              if (Array.isArray(value)) {
                if (p.attrAccessor) {
                  value = value.map(p.attrAccessor);
                }
                if (fn) {
                  value = value.map(fn);
                  fn = null;
                }
                value = p.reduce ? p.reduce(value) : value;
              } else {
                value = p.attrAccessor ? p.attrAccessor(value) : value;
              }
            } else {
              value = itemData;
            }
          }
          ret[prop] = {
            value: fn ? fn(value) : value
          };
          if (p.field) {
            ret[prop].source = { field: p.field.key() };
          }
        });
        return ret;
      });
      dataItems.push.apply(dataItems, toConsumableArray(mapped));
    }
  });
  return dataItems;
}

var hasOwn = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;

var isArray = function isArray(arr) {
	if (typeof Array.isArray === 'function') {
		return Array.isArray(arr);
	}

	return toStr.call(arr) === '[object Array]';
};

var isPlainObject = function isPlainObject(obj) {
	if (!obj || toStr.call(obj) !== '[object Object]') {
		return false;
	}

	var hasOwnConstructor = hasOwn.call(obj, 'constructor');
	var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) { /**/ }

	return typeof key === 'undefined' || hasOwn.call(obj, key);
};

var index$2 = function extend() {
	var options, name, src, copy, copyIsArray, clone;
	var target = arguments[0];
	var i = 1;
	var length = arguments.length;
	var deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}
	if (target == null || (typeof target !== 'object' && typeof target !== 'function')) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target !== copy) {
					// Recurse if we're merging plain objects or arrays
					if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
						if (copyIsArray) {
							copyIsArray = false;
							clone = src && isArray(src) ? src : [];
						} else {
							clone = src && isPlainObject(src) ? src : {};
						}

						// Never move original objects, clone them
						target[name] = extend(deep, clone, copy);

					// Don't bring in undefined values
					} else if (typeof copy !== 'undefined') {
						target[name] = copy;
					}
				}
			}
		}
	}

	// Return the modified object
	return target;
};

function getFieldAccessor$1(field, page, _ref) {
  var cache = _ref.cache;

  if (!field) {
    return -1;
  }
  var fieldIdx = cache.fields.indexOf(field);
  var attrIdx = -1;
  var attrDimIdx = -1;
  if (fieldIdx === -1) {
    for (var i = 0; i < cache.attributeDimensionFields.length; i++) {
      attrDimIdx = cache.attributeDimensionFields[i] ? cache.attributeDimensionFields[i].indexOf(field) : -1;
      if (attrDimIdx !== -1) {
        fieldIdx = i;
        break;
      }
    }
  }
  if (fieldIdx === -1) {
    for (var _i = 0; _i < cache.attributeExpressionFields.length; _i++) {
      attrIdx = cache.attributeExpressionFields[_i] ? cache.attributeExpressionFields[_i].indexOf(field) : -1;
      if (attrIdx !== -1) {
        fieldIdx = _i;
        break;
      }
    }
  }

  fieldIdx -= page.qArea.qLeft;
  if (fieldIdx < 0 || fieldIdx >= page.qArea.qWidth) {
    // throw new Error('Field out of range');
    return -1;
  }

  var path = 'row[' + fieldIdx + ']';

  if (attrDimIdx >= 0) {
    return Function('row', 'return ' + path + '.qAttrDims.qValues[' + attrDimIdx + '];'); // eslint-disable-line no-new-func
  } else if (attrIdx >= 0) {
    return Function('row', 'return ' + path + '.qAttrExps.qValues[' + attrIdx + '];'); // eslint-disable-line no-new-func
  }

  return Function('row', 'return ' + path + ';'); // eslint-disable-line no-new-func
}

// TODO - handle 'other' value
// const specialTextValues = {
//   '-3': (meta) => {
//     if ('othersLabel' in meta) {
//       return meta.othersLabel;
//     }
//     return '';
//   }
// };

function datumExtract(propCfg, cell, _ref2) {
  var key = _ref2.key;

  var datum = {
    value: typeof propCfg.value === 'function' ? propCfg.value(cell) : typeof propCfg.value !== 'undefined' ? propCfg.value : cell // eslint-disable-line no-nested-ternary
  };

  if (propCfg.field) {
    datum.source = {
      key: key,
      field: propCfg.field.key()
    };
  }

  return datum;
}

function extract$1(config, dataset, cache, _ref3) {
  var normalizeConfig = _ref3.normalizeConfig;

  var cfgs = Array.isArray(config) ? config : [config];
  var dataItems = [];
  cfgs.forEach(function (cfg) {
    if (cfg.field) {
      var cube = dataset.raw();
      var sourceKey = dataset.key();
      var f = _typeof(cfg.field) === 'object' ? cfg.field : dataset.field(cfg.field);

      var _normalizeConfig = normalizeConfig(cfg, dataset),
          props = _normalizeConfig.props,
          main = _normalizeConfig.main;

      var propsArr = Object.keys(props);

      var track = !!cfg.trackBy;
      var trackType = _typeof(cfg.trackBy);
      var tracker = {};
      var trackedItems = [];
      var items = [];
      var trackId = void 0;

      cube.qDataPages.forEach(function (page) {
        var fn = getFieldAccessor$1(f, page, { cache: cache });
        if (fn === -1) {
          return;
        }
        page.qMatrix.forEach(function (row, i) {
          var rowIdx = page.qArea.qTop + i;
          var mainCell = index$2({ qRow: rowIdx }, fn(row));
          var ret = datumExtract(main, mainCell, { key: sourceKey });

          // loop through all props that need to be mapped and
          // assign 'value' and 'source' to each property
          propsArr.forEach(function (prop) {
            var p = props[prop];
            var propCell = mainCell;
            if (p.field && p.field !== f) {
              var propCellFn = getFieldAccessor$1(p.field, page, { cache: cache });
              if (propCellFn === -1) {
                return;
              }
              propCell = index$2({ qRow: rowIdx }, propCellFn(row));
            }
            ret[prop] = datumExtract(p, propCell, { key: sourceKey }, prop);
          });

          // collect items based on the trackBy value
          // items with the same trackBy value are placed in an array and reduced later
          if (track) {
            trackId = trackType === 'function' ? cfg.trackBy(mainCell) : mainCell[cfg.trackBy];
            var trackedItem = tracker[trackId];
            if (!trackedItem) {
              trackedItem = tracker[trackId] = {
                items: [],
                id: trackId
              };
              trackedItems.push(trackedItem);
            }
            trackedItem.items.push(ret);
          }

          items.push(ret);
        });
      });

      // reduce if items have been grouped
      if (track) {
        dataItems.push.apply(dataItems, toConsumableArray(trackedItems.map(function (t) {
          var mainValues = t.items.map(function (item) {
            return item.value;
          });
          var mainReduce = main.reduce;
          var ret = {
            value: mainReduce ? mainReduce(mainValues) : mainValues,
            source: t.items[0].source
          };
          propsArr.forEach(function (prop) {
            var values = t.items.map(function (item) {
              return item[prop].value;
            });
            var reduce = props[prop].reduce;
            ret[prop] = {
              value: reduce ? reduce(values) : values
            };
            if (t.items[0][prop].source) {
              ret[prop].source = t.items[0][prop].source;
            }
          });
          return ret;
        })));
      } else {
        dataItems.push.apply(dataItems, items);
      }
    }
  });
  return dataItems;
}

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};





function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var format_min = createCommonjsModule(function (module) {
/*! javascript-number-formatter - v1.1.11 - http://mottie.github.com/javascript-number-formatter/ * © ecava */
!function(a,b){"function"==typeof undefined&&undefined.amd?undefined([],b):module.exports=b();}(commonjsGlobal,function(){return function(a,b){"use strict";if(!a||isNaN(+b))return b;var c,d,e,f,g,h,i,j,k,l,m=a.length,n=a.search(/[0-9\-\+#]/),o=n>0?a.substring(0,n):"",p=a.split("").reverse().join(""),q=p.search(/[0-9\-\+#]/),r=m-q,s=a.substring(r,r+1),t=r+("."===s||","===s?1:0),u=q>0?a.substring(t,m):"";if(a=a.substring(n,t),b="-"===a.charAt(0)?-b:+b,c=b<0?b=-b:0,d=a.match(/[^\d\-\+#]/g),e=d&&d[d.length-1]||".",f=d&&d[1]&&d[0]||",",a=a.split(e),b=b.toFixed(a[1]&&a[1].length),b=+b+"",h=a[1]&&a[1].lastIndexOf("0"),j=b.split("."),(!j[1]||j[1]&&j[1].length<=h)&&(b=(+b).toFixed(h+1)),k=a[0].split(f),a[0]=k.join(""),g=a[0]&&a[0].indexOf("0"),g>-1)for(;j[0].length<a[0].length-g;)j[0]="0"+j[0];else 0===+j[0]&&(j[0]="");if(b=b.split("."),b[0]=j[0],i=k[1]&&k[k.length-1].length){for(l=b[0],p="",r=l.length%i,m=l.length,t=0;t<m;t++)p+=l.charAt(t),!((t-r+1)%i)&&t<m-i&&(p+=f);b[0]=p;}return b[1]=a[1]&&b[1]?e+b[1]:"",d=b.join(""),"0"!==d&&""!==d||(c=!1),o+((c?"-":"")+d)+u}});
});

function escapeRegExp(str) {
  return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
}

/*
* Created by Miralem Drek (mek)
* Re-formatted and fitted into picasso by Hannes Lindquist (bge)
*/
var SIprefixes = {
  3: 'k',
  6: 'M',
  9: 'G',
  12: 'T',
  15: 'P',
  18: 'E',
  21: 'Z',
  24: 'Y',
  '-3': 'm',
  '-6': 'μ',
  '-9': 'n',
  '-12': 'p',
  '-15': 'f',
  '-18': 'a',
  '-21': 'z',
  '-24': 'y'
};
var percentage = /%$/;
var radix = /^\(r(0[2-9]|[12]\d|3[0-6])\)/i;
var oct = /^\(oct\)/i;
var dec = /^\(dec\)/i;
var hex = /^\(hex\)/i;
var bin = /^\(bin\)/i;
var rom = /^\(rom\)/i;
var functional = /^(\(rom\)|\(bin\)|\(hex\)|\(dec\)|\(oct\)|\(r(0[2-9]|[12]\d|3[0-6])\))/i;

function formatRadix(value, fradix, pattern, decimal) {
  value = value.toString(fradix);
  if (pattern[1] === pattern[1].toUpperCase()) {
    value = value.toUpperCase();
  }
  if (value.length - value.indexOf('.') > 10) {
    // limit to 10 decimal places
    value = value.slice(0, value.indexOf('.') + 11);
  }

  return value.replace('.', decimal || '.');
}

// value must be an integer
// value must not be in scientific notation
function formatRoman(value, pattern) {
  var i = void 0,
      s = '',
      v = Number(String(value).slice(-3)),
      nThousands = (value - v) / 1000,
      decimal = [0, 1, 4, 5, 9, 10, 40, 50, 90, 100, 400, 500, 900].reverse(),
      numeral = ['0', 'I', 'IV', 'V', 'IX', 'X', 'XL', 'L', 'XC', 'C', 'CD', 'D', 'CM'].reverse();

  while (v > 0) {
    for (i = 0; i < decimal.length; i++) {
      if (decimal[i] <= v) {
        s += numeral[i];
        v -= decimal[i];
        break;
      }
    }
  }

  for (i = 0; i < nThousands; i++) {
    s = 'M' + s;
  }

  if (pattern[1] !== pattern[1].toUpperCase()) {
    s = s.toLowerCase();
  }
  return s;
}

function formatFunctional(value, pattern, d) {
  var temp = void 0;
  if (radix.test(pattern)) {
    value = formatRadix(value, Number(/\d{2}/.exec(pattern)[0]), pattern, d);
  } else if (oct.test(pattern)) {
    value = formatRadix(value, 8, pattern, d);
  } else if (dec.test(pattern)) {
    value = formatRadix(value, 10, pattern, d);
  } else if (hex.test(pattern)) {
    value = formatRadix(value, 16, pattern, d);
  } else if (bin.test(pattern)) {
    value = formatRadix(value, 2, pattern, d);
  } else if (rom.test(pattern)) {
    temp = '';
    if (value < 0) {
      temp = '-';
      value = -value;
    }
    value = Math.floor(value);
    if (value === 0) {
      value = '0';
    } else if (value <= 500000) {
      // limit in engine
      value = formatRoman(value, pattern);
      value = temp + value;
    } else {
      value = pattern + temp + value.toExponential(0); // to return same result as engine
    }
  }

  return value;
}

function escape(value, flags, justStr) {
  var str = escapeRegExp(value);
  if (justStr) {
    return str;
  }
  return new RegExp(str || '', flags);
}

function createRegExp(thousand, decimal) {
  if (decimal) {
    decimal = escapeRegExp(decimal);
  }
  if (thousand) {
    thousand = escapeRegExp(thousand);
  }
  return new RegExp('(?:[#0]+' + thousand + ')?[#0]+(?:' + decimal + '[#0]+)?');
}

function preparePattern(o, t, d) {
  var parts = void 0,
      lastPart = void 0,
      pattern = o.pattern,
      numericPattern = void 0,
      prefix = void 0,
      postfix = void 0,
      groupTemp = void 0,
      decTemp = void 0,
      temp = void 0,
      regex = void 0;

  if (pattern.indexOf('A') >= 0) {
    // abbreviate SI
    pattern = pattern.replace('A', '');
    o.abbreviate = true;
  }

  // extract the numeric part from the pattern
  regex = createRegExp(t, d);
  numericPattern = pattern.match(regex);
  numericPattern = numericPattern ? numericPattern[0] : '';
  prefix = numericPattern ? pattern.substr(0, pattern.indexOf(numericPattern)) : pattern;
  postfix = numericPattern ? pattern.substring(pattern.indexOf(numericPattern) + numericPattern.length) : '';

  if (!numericPattern) {
    numericPattern = pattern ? '#' : '##########';
  }

  if (t && t === d) {
    // ignore grouping if grouping separator is same as decimal separator
    // extract decimal part
    parts = numericPattern.split(d);
    lastPart = parts.pop();
    numericPattern = parts.join('') + d + lastPart;
    t = '';
  }

  // formatting library does not support multiple characters as separator (nor +-).
  // do a temporary replacement
  groupTemp = t;
  t = /,/.test(d) ? '¤' : ',';
  if (groupTemp) {
    numericPattern = numericPattern.replace(escape(groupTemp, 'g'), t);
  }

  decTemp = d;
  d = '.';
  if (decTemp) {
    numericPattern = numericPattern.replace(escape(decTemp, 'g'), d);
  }

  temp = numericPattern.match(/#/g);
  temp = temp ? temp.length : 0;

  o.prefix = prefix || '';
  o.postfix = postfix || '';
  o.pattern = pattern;
  o.percentage = percentage.test(pattern);
  o.numericPattern = numericPattern || '';
  o.numericRegex = new RegExp(escape(t, null, true) + '|' + escape(d, null, true), 'g');
  o.groupTemp = groupTemp;
  o.decTemp = decTemp;
  o.t = t;
  o.d = d;
  o.temp = temp;
}

var NumberFormatter = function () {
  /**
   * @name NumberFormatter
   * @constructs
   * @param {Object} localeInfo
   * @param {String} pattern
   * @param {String} [thousand]
   * @param {String} [decimal]
   * @param {String} [type]
   */
  function NumberFormatter(localeInfo, pattern, thousand, decimal, type) {
    classCallCheck(this, NumberFormatter);

    this.localeInfo = localeInfo;
    this.pattern = pattern;
    this.thousandDelimiter = thousand || ',';
    this.decimalDelimiter = decimal || '.';
    this.type = type || 'numeric';

    this.prepare();
  }

  createClass(NumberFormatter, [{
    key: 'clone',
    value: function clone() {
      var n = new NumberFormatter(this.localeInfo, this.pattern, this.thousandDelimiter, this.decimalDelimiter, this.type);
      n.subtype = this.subtype;
      return n;
    }

    /**
     * Formats a number according to a specific pattern.
     * Use # for optional numbers and 0 for padding.
     * @param {Number} value Number to format.
     * @param {String} [pattern] The pattern to apply.
     * @param {String} [t] Grouping separator.
     * @param {String} [d] Decimal delimiter.
     * @example
     * format(10, "0") // 10;
     * format(10, "#") // 10;
     * format(10, "##.#") // 10;
     * format(10, "##.0") // 10.0;
     * format(10, "000") // 010;
     * format(10.123, "0.0") // 10.1;
     * format(10.123, "0.00##") // 10.123; // at least 2 decimals, never more than 4
     * format(123456789, "#,###") // 123,456,789;
     * format(123456789, "####-####", "-") // 1-2345-6789;
     * format(10000, "#A") // 10k,  A -> SI abbreviation
     * format(1234567, "#.###A") // 1.235M;
     * format(0.0001, "#.#A") // 0.1m;
     *
     * format(0.257, "0.0%") // 25.7%; // will multiply by 100
     * format(9876, "$#,###") // $9,876;
     * format(-9876, "$#,###;$(#,###)") // $(9,876); // use ; for alternative formatting for negative values
     * format(10, "(r16)") // a; // radix 16
     * format(15, "(hex)") // f; // same as (r16)
     * format(15, "(HEX)") // F;
     * format(10, "(bin)") // 1010; // same as (r02)
     * format(10, "(oct)") // 12; // same as (r08)
     */

  }, {
    key: 'format',
    value: function format(value, pattern, t, d) {
      this.prepare(pattern, t, d);
      return this.formatValue(value);
    }
  }, {
    key: 'prepare',
    value: function prepare(pattern, t, d) {
      var prep = void 0;

      if (typeof pattern === 'undefined') {
        pattern = this.pattern;
      }
      if (typeof t === 'undefined') {
        t = this.thousandDelimiter;
      }
      if (typeof d === 'undefined') {
        d = this.decimalDelimiter;
      }

      if (!pattern) {
        this._prepared = { pattern: false };
        return;
      }

      this._prepared = {
        positive: {
          d: d,
          t: t,
          abbreviate: false,
          isFunctional: false,
          prefix: '',
          postfix: ''
        },
        negative: {
          d: d,
          t: t,
          abbreviate: false,
          isFunctional: false,
          prefix: '',
          postfix: ''
        },
        zero: {
          d: d,
          t: t,
          abbreviate: false,
          isFunctional: false,
          prefix: '',
          postfix: ''
        }
      };
      prep = this._prepared;

      // TODO FIXME qListSep?
      // const patternSeparator = this.localeInfo && this.localeInfo.qListSep ? this.localeInfo.qListSep : ';';
      var patternSeparator = ';';

      pattern = pattern.split(patternSeparator);
      prep.positive.pattern = pattern[0];
      prep.negative.pattern = pattern[1];
      prep.zero.pattern = pattern[2];
      if (functional.test(pattern[0])) {
        prep.positive.isFunctional = true;
      }
      if (!pattern[1]) {
        prep.negative = false;
      } else if (functional.test(pattern[1])) {
        prep.negative.isFunctional = true;
      }
      if (!pattern[2]) {
        prep.zero = false;
      } else if (functional.test(pattern[2])) {
        prep.zero.isFunctional = true;
      }

      if (!prep.positive.isFunctional) {
        preparePattern(prep.positive, t, d);
      }
      if (prep.negative && !prep.negative.isFunctional) {
        preparePattern(prep.negative, t, d);
      }
      if (prep.zero && !prep.zero.isFunctional) {
        preparePattern(prep.zero, t, d);
      }
    }
  }, {
    key: 'formatValue',
    value: function formatValue(value) {
      var prep = this._prepared,
          temp = void 0,
          exponent = void 0,
          abbr = '',
          absValue = void 0,
          num = void 0,
          sciValue = '',
          d = void 0,
          t = void 0,
          i = void 0,
          numericPattern = void 0,
          decimalPartPattern = void 0,
          original = value;

      if (isNaN(value)) {
        return '' + original;
      }

      value = +value;

      if (prep.pattern === false) {
        return value.toString();
      }

      if (value === 0 && prep.zero) {
        prep = prep.zero;
        return prep.pattern;
      } else if (value < 0 && prep.negative) {
        prep = prep.negative;
        value = -value;
      } else {
        prep = prep.positive;
      }
      d = prep.d;
      t = prep.t;

      if (prep.isFunctional) {
        value = formatFunctional(value, prep.pattern, d);
      } else {
        if (prep.percentage) {
          value *= 100;
        }

        if (prep.abbreviate) {
          exponent = Number(Number(value).toExponential().split('e')[1]);
          exponent -= exponent % 3;
          if (exponent in SIprefixes) {
            abbr = SIprefixes[exponent];
            value /= Math.pow(10, exponent);
          }
        }

        absValue = Math.abs(value);
        temp = prep.temp;
        numericPattern = prep.numericPattern;
        decimalPartPattern = numericPattern.split(d)[1];

        if (this.type === 'I') {
          value = Math.round(value);
        }
        num = value;

        if (!decimalPartPattern && numericPattern.slice(-1)[0] === '#') {
          if (absValue >= Math.pow(10, temp) || absValue < 1 || absValue < 1e-4) {
            if (value === 0) {
              value = '0';
            } else if (absValue < 1e-4 || absValue >= 1e20) {
              // engine always formats values < 1e-4 in scientific form, values >= 1e20 can only be represented in scientific form
              value = num.toExponential(Math.max(1, Math.min(14, temp)) - 1);
              value = value.replace(/\.?0+(?=e)/, '');
              sciValue = '';
            } else {
              value = value.toPrecision(Math.max(1, Math.min(14, temp)));
              if (value.indexOf('.') >= 0) {
                value = value.replace(value.indexOf('e') < 0 ? /0+$/ : /\.?0+(?=e)/, '');
                value = value.replace('.', d);
              }
            }
          } else {
            numericPattern += d;
            temp = Math.max(0, Math.min(20, temp - Math.ceil(Math.log(absValue) / Math.log(10))));
            for (i = 0; i < temp; i++) {
              numericPattern += '#';
            }

            value = format_min(numericPattern, value);
          }
        } else if (absValue >= 1e15 || absValue > 0 && absValue <= 1e-14) {
          value = absValue ? absValue.toExponential(15).replace(/\.?0+(?=e)/, '') : '0';
        } else {
          var wholePart = Number(value.toFixed(Math.min(20, decimalPartPattern ? decimalPartPattern.length : 0)).split('.')[0]);
          var wholePartPattern = numericPattern.split(d)[0];
          wholePartPattern += d;

          value = format_min(wholePartPattern, wholePart) || '0';

          if (decimalPartPattern) {
            var nDecimals = Math.max(0, Math.min(14, decimalPartPattern.length)); // the length of e.g. 0000#####
            var nZeroes = decimalPartPattern.replace(/#+$/, '').length;
            var decimalPart = (this.type === 'I' ? 0 : absValue % 1).toFixed(nDecimals).slice(2).replace(/0+$/, ''); // remove trailing zeroes

            for (i = decimalPart.length; i < nZeroes; i++) {
              decimalPart += '0';
            }

            if (decimalPart) {
              value += d + decimalPart;
            }
          } else if (wholePart === 0) {
            // to avoid "-" being prefixed to value
            num = 0;
          }
        }

        value = value.replace(prep.numericRegex, function (m) {
          if (m === t) {
            return prep.groupTemp;
          } else if (m === d) {
            return prep.decTemp;
          }
          return '';
        });
        if (num < 0 && !/^-/.test(value)) {
          value = '-' + value;
        }
      }

      return prep.prefix + value + sciValue + abbr + prep.postfix;
    }
  }], [{
    key: 'getStaticFormatter',
    value: function getStaticFormatter() {
      return {
        prepare: function prepare() {},
        formatValue: function formatValue(v) {
          return '' + v;
        }
      };
    }
  }]);
  return NumberFormatter;
}();

function numberFormatFactory() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return new (Function.prototype.bind.apply(NumberFormatter, [null].concat(args)))();
}

function formatter(pattern, thousand, decimal, qType, localeInfo) {
  var qformat = numberFormatFactory(localeInfo, pattern, thousand, decimal, qType);

  /**
   * Format a value according to the specified pattern created at construct
   *
   * @param  {Number} value   The number to be formatted
   * @return {String}         [description]
   */
  function format(value) {
    return qformat.formatValue(value);
  }

  /**
   * Format a value according to a specific pattern
   * that is not the one specified in the constructor
   *
   * @param  {String} p   Pattern
   * @param  {Number} v   Value
   * @param  {String} t   Thousand
   * @param  {String} d   Decimal
   * @return {String}     Formatted value
   */
  format.format = function formatFn(p, v, t, d) {
    return qformat.format(v, p, t, d);
  };

  /**
   * Change the pattern on existing formatter
   *
   * @param  {String} p     Pattern (optional)
   * @return {String}       Returns the pattern
   */
  format.pattern = function patternFn(p) {
    if (p) {
      qformat.pattern = p;
      qformat.prepare();
    }
    return qformat.pattern;
  };

  /**
   * Set the locale for the formatter
   *
   * @param  {Object} args   Locale object for formatting
   * @return {Undefined}      Returns nothing
   */
  /* format.locale = function( ...args ) {
    locale = formatLocale( ...args );
    d3format = locale.format( pattern );
     return this;
  };*/

  return format;
}

var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
var DAYS_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(s, n) {
  for (var i = s.length; i < n; i++) {
    s = '0' + s;
  }
  return s;
}

function parseDate(d, twelveFormat) {
  var h = d.getHours();
  var day = d.getDay() - 1;
  if (twelveFormat) {
    h %= 12;
    if (!h) {
      // h == 0 -> 12
      h = 12;
    }
  }

  if (day < 0) {
    day = 6;
  }

  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: day,
    date: d.getDate(),
    h: h,
    m: d.getMinutes(),
    s: d.getSeconds(),
    f: d.getMilliseconds(),
    t: d.getHours() >= 12 ? 'pm' : 'am'
  };
}

function getRemainder(value) {
  var s = value.toString().split('.');
  if (s[1]) {
    s = Number('0.' + s[1]);
  } else {
    return 0;
  }
  return s;
}

function parseIntervalDays(days) {
  var d = days;
  var h = 24 * getRemainder(d);
  var m = 60 * getRemainder(h);
  var s = 60 * getRemainder(m);
  var ms = 1000 * getRemainder(s);

  return {
    d: Math.floor(d),
    h: Math.floor(h),
    m: Math.floor(m),
    s: Math.floor(s),
    f: Math.round(ms)
  };
}

function parseInterval(days, pattern) {
  var units = parseIntervalDays(days),
      d = units.d,
      h = units.h,
      m = units.m,
      s = units.s,
      f = units.f,
      w = 0,
      date = void 0;

  if (/w+|t+/gi.test(pattern)) {
    date = new Date(1899, 11, 30 + Math.floor(days), 0, 0, 24 * 60 * 60 * (days - Math.floor(days)));
    if (isNaN(date.getTime())) {
      date = null;
    }
  }

  if (!/D+/gi.test(pattern)) {
    h += d * 24;
  }
  if (!/h+/gi.test(pattern)) {
    m += h * 60;
  }
  if (!/m+/gi.test(pattern)) {
    s += m * 60;
  }
  if (/w+/gi.test(pattern)) {
    w = date ? date.getDay() - 1 : 0;
    if (w < 0) {
      w = 6;
    }
  }

  var someT = '';
  if (date) {
    someT = date.getHours() >= 12 ? 'pm' : 'am';
  }

  return {
    year: 0,
    month: 0,
    day: w,
    date: d,
    h: h,
    m: m,
    s: s,
    f: f,
    t: someT
  };
}

function getMasks(inst, d) {
  return {
    'Y+|y+': {
      Y: '' + Number(('' + d.year).slice(-2)),
      YY: pad(('' + d.year).slice(-2), 2),
      YYY: pad(('' + d.year).slice(-3), 3),
      def: function def(m) {
        // default
        return pad('' + d.year, m.length);
      }
    },
    'M+': {
      M: d.month + 1,
      MM: pad('' + (d.month + 1), 2),
      MMM: inst.locale_months_abbr[d.month],
      def: inst.locale_months[d.month]
    },
    'W+|w+': {
      W: d.day,
      WW: pad('' + d.day, 2),
      WWW: inst.locale_days_abbr[d.day],
      def: inst.locale_days[d.day]
    },
    'D+|d+': {
      D: d.date,
      def: function def(m) {
        return pad('' + d.date, m.length);
      }
    },
    'h+|H+': {
      h: d.h,
      def: function def(m) {
        return pad('' + d.h, m.length);
      }
    },
    'm+': {
      m: d.m,
      def: function def(m) {
        return pad('' + d.m, m.length);
      }
    },
    's+|S+': {
      s: d.s,
      def: function def(m) {
        return pad('' + d.s, m.length);
      }
    },
    'f+|F+': {
      def: function def(m) {
        var f = '' + d.f,
            n = m.length - f.length;
        if (n > 0) {
          for (var i = 0; i < n; i++) {
            f += '0';
          }
        } else if (n < 0) {
          f = f.slice(0, m.length);
        }
        return f;
      }
    },
    't{1,2}|T{1,2}': {
      def: function def(m) {
        var t = d.t;
        if (m[0].toUpperCase() === m[0]) {
          t = t.toUpperCase();
        }
        t = t.slice(0, m.length);
        return t;
      }
    }
  };
}

var DateFormatter = function () {
  /**
   * @name DateFormatter
   * @constructs
   * @param {Object} localeInfo
   * @param {String} pattern
   */
  function DateFormatter(localeInfo, pattern, qtype) {
    classCallCheck(this, DateFormatter);

    var info = localeInfo || {};

    if (!info.qCalendarStrings) {
      info.qCalendarStrings = {
        qLongDayNames: DAYS,
        qDayNames: DAYS_ABBR,
        qLongMonthNames: MONTHS,
        qMonthNames: MONTHS_ABBR
      };
    }

    this.localeInfo = info;
    this.locale_days = info.qCalendarStrings.qLongDayNames.slice();
    this.locale_days_abbr = info.qCalendarStrings.qDayNames.slice();
    this.locale_months = info.qCalendarStrings.qLongMonthNames.slice();
    this.locale_months_abbr = info.qCalendarStrings.qMonthNames.slice();

    if (!pattern) {
      var _patternMap;

      var patternMap = (_patternMap = {}, defineProperty(_patternMap, TYPES.TIME, info.qTimeFmt || 'hh:mm:ss'), defineProperty(_patternMap, TYPES.DATE, info.qDateFmt || 'YYYY-MM-DD'), defineProperty(_patternMap, TYPES.DATE_TIME, info.qTimestampFmt || 'YYYY-MM-DD hh:mm:ss'), _patternMap);

      pattern = patternMap[qtype];
    }

    this.pattern = pattern;
  }

  createClass(DateFormatter, [{
    key: 'clone',
    value: function clone() {
      var n = new DateFormatter(this.localeInfo, this.pattern);
      n.subtype = this.subtype;
      return n;
    }

    /**
     * Formats a date according to given pattern
     * @param {Date} date The date to format.
     * @param {String} pattern The desired format of the date
     * var d = new Date(2013, 8, 15, 13, 55, 40, 987);
     * var n = new DateFormatter();
     * @example
     * m.format( d, 'YYYY-MM-DD hh:mm:ss.ffff') // 2013-08-15 13:55:40.9870
     * m.format( d, 'h:m:s tt') // 1:55:40 pm
     * m.format( d, 'h:m:s TT') // 1:55:40 PM
     * m.format( d, 'M/D/YYYY') // 8/15/2013
     * m.format( d, 'WWWW DD MMM') // Thursday 15 Aug
     * m.format( d, 'WWW DD MMMM @ hh:mm:ss') // Thu 15 August @ 13:55:40
     */

  }, {
    key: 'format',
    value: function format(date, pattern) {
      // Fallback pattern is set in constructor
      if (!pattern) {
        pattern = this.pattern ? this.pattern : 'YYYY-MM-DD hh:mm:ss';
      }

      pattern = pattern.replace(/\[.+]|\[|]/g, '');
      var hasTwelveFlag = /t+/ig.test(pattern);
      var parsedDate = void 0;

      if (date instanceof Date) {
        parsedDate = parseDate(date, hasTwelveFlag);
      } else {
        parsedDate = parseInterval(date, pattern);
      }
      // remove [] and everything inside it

      var masks = getMasks(this, parsedDate);

      var masksArr = [];
      for (var mask in masks) {
        if (Object.prototype.hasOwnProperty.call(masks, mask)) {
          masksArr.push(mask);
        }
      }
      var dateTimeRegex = new RegExp(masksArr.join('|'), 'g');

      var result = pattern.replace(dateTimeRegex, function (m) {
        var r = void 0;
        var mask = void 0;
        for (mask in masks) {
          if (Object.prototype.hasOwnProperty.call(masks, mask)) {
            r = new RegExp(mask);
            if (r.test(m)) {
              break;
            }
          }
        }
        if (!r) {
          return '';
        }
        var value = void 0;
        for (var submask in masks[mask]) {
          if (submask === m || submask.toLowerCase() === m) {
            value = masks[mask][submask];
            if (typeof value === 'undefined') {
              value = masks[mask][submask.toLowerCase()];
            }
            break;
          }
        }
        if (typeof value === 'undefined') {
          value = masks[mask].def;
        }

        if (typeof value === 'function') {
          value = value(m);
        }
        return value;
      });
      return result;
    }
  }]);
  return DateFormatter;
}();

function dateFormatFactory() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return new (Function.prototype.bind.apply(DateFormatter, [null].concat(args)))();
}

function QlikTimeToDate(value) {
  return new Date(1899, 11, 30 + Math.floor(value), 0, 0, 0, 1000 * 24 * 60 * 60 * (value - Math.floor(value)));
}

var TYPES = {
  AUTO: 'U',
  INTEGER: 'I',
  NUMBER: 'R',
  FIXED_TO: 'F',
  MONEY: 'M',
  DATE: 'D',
  TIME: 'T',
  DATE_TIME: 'TS',
  INTERVAL: 'IV'
};

function formatter$2(pattern) {
  var qtype = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'TS';
  var localeInfo = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  var qformat = dateFormatFactory(localeInfo, pattern, qtype);

  /**
   * Prepare a value according to the specified qtype
   *
   * @param  {Number} value The value to be formatted
   * @return {Number}       The converted value (if applied)
   */
  function prepare(value) {
    if (qtype !== TYPES.INTERVAL) {
      return QlikTimeToDate(value);
    }
    return value;
  }

  /**
   * Format a value according to the specified pattern created at construct
   *
   * @param  {Date} value   The number to be formatted
   * @return {String}         [description]
   */
  function format(value) {
    value = prepare(value);
    return qformat.format(value);
  }

  /**
   * Format a value according to a specific pattern
   * that is not the one specified in the constructor
   *
   * @param  {String} p   Pattern
   * @param  {Date} v   Value
   * @return {String}     Formatted value
   */
  format.format = function formatFn(p, v) {
    v = prepare(v);
    return qformat.format(v, p);
  };

  /**
   * Set the locale for the formatter
   *
   * @param  {Object} args   Locale object for formatting
   * @return {Undefined}      Returns nothing
   */
  format.locale = function locale(li) {
    qformat = dateFormatFactory(li, pattern, qtype);

    return this;
  };

  /**
   * Get or set the QType
   *
   * @param  {String} nqt New qType (optional)
   * @return {String}     Current qtype
   */
  format.qtype = function qtypeFn(nqt) {
    if (nqt !== undefined) {
      qtype = nqt;
    }
    return qtype;
  };

  return format;
}

function createFromMetaInfo(meta, localeInfo) {
  if (meta && meta.qNumFormat && ['D', 'T', 'TS', 'IV'].indexOf(meta.qNumFormat.qType) !== -1) {
    return formatter$2(meta.qNumFormat.qFmt, meta.qNumFormat.qType, localeInfo);
  }
  var pattern = '#';
  var thousand = localeInfo && typeof localeInfo.qThousandSep !== 'undefined' ? localeInfo.qThousandSep : ',';
  var decimal = localeInfo && typeof localeInfo.qDecimalSep !== 'undefined' ? localeInfo.qDecimalSep : '.';
  var type = 'U';
  var isAuto = meta && !!meta.qIsAutoFormat;
  if (meta && meta.qNumFormat) {
    pattern = meta.qNumFormat.qFmt || pattern;
    thousand = meta.qNumFormat.qThou || thousand;
    decimal = meta.qNumFormat.qDec || decimal;
    type = meta.qNumFormat.qType || type;
    isAuto = isAuto && ['M'].indexOf(meta.qNumFormat.qType) === -1;
  }

  if (isAuto) {
    pattern = '#' + decimal + '##A';
    type = 'U';
  }

  return formatter(pattern, thousand, decimal, type, localeInfo);
}

// const tagsFn = d => d.qTags;
var elemNoFn = function elemNoFn(cube) {
  return cube.qMode === 'S' ? function (d) {
    return d.qElemNumber;
  } : function (d) {
    return d.qElemNo;
  };
};
var measureValue = function measureValue(cube) {
  return cube.qMode === 'S' ? function (d) {
    return d.qNum;
  } : function (d) {
    return d.qValue;
  };
};

function qField() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      meta = _ref.meta,
      _id = _ref.id,
      _key = _ref.key,
      cube = _ref.cube,
      localeInfo = _ref.localeInfo,
      fieldExtractor = _ref.fieldExtractor;

  var values = void 0;

  var _type = 'qStateCounts' in meta || 'qSize' in meta ? 'dimension' : 'measure';
  var valueFn = _type === 'dimension' ? elemNoFn(cube) : measureValue(cube);
  var labelFn = function labelFn(d) {
    return d.qText;
  };
  var reduce = _type === 'dimension' ? 'first' : 'avg';
  var _formatter = createFromMetaInfo(meta, localeInfo);

  var f = {
    id: function id() {
      return _id;
    },
    key: function key() {
      return _key;
    },
    title: function title() {
      return meta.qFallbackTitle || meta.label;
    },
    type: function type() {
      return _type;
    },
    items: function items() {
      if (!values) {
        values = fieldExtractor(f);
      }
      return values;
    },
    min: function min() {
      return meta.qMin;
    },
    max: function max() {
      return meta.qMax;
    },
    value: valueFn,
    label: labelFn,
    reduce: reduce,
    formatter: function formatter() {
      return _formatter;
    },
    tags: function tags() {
      return meta.qTags;
    }
  };

  return f;
}

function _hierarchy() {
  var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var dataset = arguments[1];
  var cache = arguments[2];
  var deps = arguments[3];

  var cube = dataset.raw();
  if (!cube.qMode === 'K') {
    return null;
  }
  return augment(config, dataset, cache, deps);
}

function extractData(cfg, dataset, cache, deps) {
  var cube = dataset.raw();
  if (cube.qMode === 'K') {
    return extract(cfg, dataset, cache, deps);
  } else if (cube.qMode === 'S') {
    return extract$1(cfg, dataset, cache, deps);
  }
  return [];
}

function createAttrFields(idx, d, _ref) {
  var cache = _ref.cache,
      cube = _ref.cube,
      pages = _ref.pages,
      fieldExtractor = _ref.fieldExtractor,
      key = _ref.key,
      fieldKey = _ref.fieldKey;

  if (d.qAttrDimInfo) {
    cache.attributeDimensionFields[idx] = d.qAttrDimInfo.map(function (attrDim, i) {
      return attrDim ? qField({
        meta: attrDim,
        id: key + '/' + fieldKey + '/qAttrDimInfo/' + i,
        key: fieldKey + '/qAttrDimInfo/' + i,
        cube: cube,
        pages: pages,
        fieldExtractor: fieldExtractor
      }) : undefined;
    });
  }
  if (d.qAttrExprInfo) {
    cache.attributeExpressionFields[idx] = d.qAttrExprInfo.map(function (attrExpr, i) {
      return attrExpr ? qField({
        meta: attrExpr,
        id: key + '/' + fieldKey + '/qAttrExprInfo/' + i,
        key: fieldKey + '/qAttrExprInfo/' + i,
        cube: cube,
        pages: pages,
        fieldExtractor: fieldExtractor
      }) : undefined;
    });
  }
}

function q() {
  var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _key = _ref2.key,
      data = _ref2.data;

  var cache = {
    attributeDimensionFields: [],
    attributeExpressionFields: [],
    fields: []
  };

  var cube = data;

  if (!cube.qDimensionInfo) {
    // assume old data format
    throw new Error('The data input is not recognized as a hypercube');
  }

  var pages = cube.qMode === 'K' ? cube.qStackedDataPages : cube.qDataPages;

  var deps = {
    normalizeConfig: q.normalizeProperties
  };

  var dataset = {
    key: function key() {
      return _key;
    },
    raw: function raw() {
      return cube;
    },
    field: function field(query) {
      return findField(query, {
        cache: cache,
        cube: cube,
        pages: pages
      });
    },
    fields: function fields() {
      return cache.fields.slice();
    },
    extract: function extract$$1(extractionConfig) {
      return extractData(extractionConfig, dataset, cache, deps);
    },
    hierarchy: function hierarchy(hierarchyConfig) {
      return _hierarchy(hierarchyConfig, dataset, cache, deps);
    }
  };

  var fieldExtractor = void 0;

  if (cube.qMode === 'K') {
    fieldExtractor = function fieldExtractor(f) {
      return extract({ field: f }, dataset, cache, deps);
    };
  } else if (cube.qMode === 'S') {
    fieldExtractor = function fieldExtractor(f) {
      return extract$1({ field: f }, dataset, cache, deps);
    };
  } else {
    fieldExtractor = function fieldExtractor() {
      return [];
    }; // TODO - throw unsupported error?
  }

  var dimensions = cube.qDimensionInfo;
  dimensions.forEach(function (d, i) {
    var fieldKey = 'qDimensionInfo/' + i;
    cache.fields.push(qField({
      meta: d,
      id: _key + '/' + fieldKey,
      key: fieldKey,
      cube: cube,
      pages: pages,
      fieldExtractor: fieldExtractor
    }));
    createAttrFields(i, d, { cache: cache, cube: cube, pages: pages, fieldExtractor: fieldExtractor, key: _key, fieldKey: fieldKey });
  });

  cube.qMeasureInfo.forEach(function (d, i) {
    var fieldKey = 'qMeasureInfo/' + i;
    cache.fields.push(qField({
      meta: d,
      id: _key + '/' + fieldKey,
      key: fieldKey,
      cube: cube,
      pages: pages,
      fieldExtractor: fieldExtractor
    }));
    createAttrFields(dimensions.length + i, d, { cache: cache, cube: cube, pages: pages, fieldExtractor: fieldExtractor, key: _key, fieldKey: fieldKey });
  });

  return dataset;
}

var LAYOUT_TO_PROP = [['qHyperCube', 'qHyperCubeDef'], ['qDimensionInfo', 'qDimensions'], ['qMeasureInfo', 'qMeasures'], ['qAttrDimInfo', 'qAttributeDimensions'], ['qAttrExprInfo', 'qAttributeExpressions']];

var DIM_RX$1 = /\/qDimensionInfo(?:\/(\d+))?/;
var M_RX$1 = /\/qMeasureInfo\/(\d+)/;
var ATTR_DIM_RX$1 = /\/qAttrDimInfo\/(\d+)(?:\/(\d+))?/;
var ATTR_EXPR_RX$1 = /\/qAttrExprInfo\/(\d+)/;

function extractFieldFromId(id, layout) {
  var isDimension = false;
  var index = 0;
  var path = id;
  var pathToHC = '' + path.substr(0, path.indexOf('qHyperCube') + 10); // 10 = length of 'qHyperCube'

  var shortenPath = true;

  if (DIM_RX$1.test(id)) {
    index = +DIM_RX$1.exec(id)[1];
    var attr = id.replace(DIM_RX$1, '');
    isDimension = true;
    if (ATTR_DIM_RX$1.test(attr)) {
      index = 0; // default to 0
      var attrDimColIdx = +ATTR_DIM_RX$1.exec(path)[2];
      if (!isNaN(attrDimColIdx)) {
        // use column index if specified
        index = attrDimColIdx;
        path = path.replace(/\/\d+$/, '');
      }
      shortenPath = false;
    } else if (ATTR_EXPR_RX$1.test(attr)) {
      // attrIdx depends on number of measures + number of attr expressions
      // in dimensions before this one
      var attrIdx = 0;
      if (layout) {
        var hc = resolve(pathToHC, layout);

        // offset by number of measures
        attrIdx += hc.qMeasureInfo.length;

        // offset by total number of attr expr in dimensions
        // (assuming attr expr in dimensions are ordered first)
        attrIdx = hc.qDimensionInfo.slice(0, index).reduce(function (v, dim) {
          return v + dim.qAttrExprInfo.length;
        }, attrIdx);

        // offset by the actual column value for the attribute expression itself
        attrIdx += +ATTR_EXPR_RX$1.exec(path)[1];

        index = attrIdx;
        isDimension = false;
      }
    }
  } else if (M_RX$1.test(id)) {
    index = +M_RX$1.exec(id)[1];
    isDimension = false;
    var _attr = id.replace(M_RX$1, '');
    if (ATTR_DIM_RX$1.test(_attr)) {
      index = 0; // default to 0
      var _attrDimColIdx = +ATTR_DIM_RX$1.exec(path)[2];
      if (!isNaN(_attrDimColIdx)) {
        // use column index if specified
        index = _attrDimColIdx;
        path = path.replace(/\/\d+$/, '');
      }
      shortenPath = false;
      isDimension = true;
    } else if (ATTR_EXPR_RX$1.test(_attr)) {
      // depends on number of measures + number of attr expressions
      // in dimensions and measures before this one
      var _attrIdx = 0;
      if (layout) {
        var _hc = resolve(pathToHC, layout);

        // offset by number of measures
        _attrIdx += _hc.qMeasureInfo.length;

        // offset by total number of attr expr in dimensions
        // (assuming attr expr in dimensions are ordered first)
        _attrIdx = _hc.qDimensionInfo.reduce(function (v, dim) {
          return v + dim.qAttrExprInfo.length;
        }, _attrIdx);

        // offset by total number of attr expr in measures before 'index'
        _attrIdx = _hc.qMeasureInfo.slice(0, index).reduce(function (v, meas) {
          return v + meas.qAttrExprInfo.length;
        }, _attrIdx);

        // offset by the actual column value for the attribute expression itself
        _attrIdx += +ATTR_EXPR_RX$1.exec(path)[1];

        index = _attrIdx;
      }
    }
  }

  LAYOUT_TO_PROP.forEach(function (_ref) {
    var _ref2 = slicedToArray(_ref, 2),
        v = _ref2[0],
        prop = _ref2[1];

    path = path.replace(v, prop);
  });

  if (shortenPath) {
    path = '' + path.substr(0, path.indexOf('/qHyperCubeDef') + 14); // 14 = length of '/qHyperCubeDef'
  }

  if (path && path[0] !== '/') {
    path = '/' + path;
  }

  return {
    index: index,
    path: path,
    type: isDimension ? 'dimension' : 'measure'
  };
}

/**
 * Helper method to generate suitable QIX selection methods and parameters based on a brush instance.
 * @alias brush
 * @memberof picasso.q
 * @param {brush} brush A brush instance
 * @param {object} [opts]
 * @param {boolean} [opts.byCells=false] Whether to prefer selection by row index.
 * @param {string} [opts.primarySource] Field source to extract row indices from. If not specified, indices from first source are used.
 * @param {object} [layout] QIX data layout. Needed only when brushing on attribute expressions, to be able to calculate the measure index.
 * @return {object[]} An array of relevant selections
 */
function qBrush(brush) {
  var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var layout = arguments[2];

  var byCells = opts.byCells;
  var primarySource = opts.primarySource;
  var selections = [];
  var methods = {};
  var isActive = brush.isActive();
  var hasValues = false;
  brush.brushes().forEach(function (b) {
    var info = extractFieldFromId(b.id, layout);
    if (b.type === 'range' && info.type === 'measure') {
      var ranges = b.brush.ranges();
      if (ranges.length) {
        hasValues = true;
        if (!methods.rangeSelectHyperCubeValues) {
          methods.rangeSelectHyperCubeValues = {
            path: info.path,
            ranges: []
          };
        }
        ranges.forEach(function (range) {
          return methods.rangeSelectHyperCubeValues.ranges.push({
            qMeasureIx: info.index,
            qRange: {
              qMin: range.min,
              qMax: range.max,
              qMinInclEq: true,
              qMaxInclEq: true
            }
          });
        });
      }
    }
    if (b.type === 'range' && info.type === 'dimension') {
      var _ranges = b.brush.ranges();
      if (_ranges.length) {
        hasValues = true;
        if (!methods.selectHyperCubeContinuousRange) {
          methods.selectHyperCubeContinuousRange = {
            path: info.path,
            ranges: []
          };
        }
        _ranges.forEach(function (range) {
          return methods.selectHyperCubeContinuousRange.ranges.push({
            qDimIx: info.index,
            qRange: {
              qMin: range.min,
              qMax: range.max,
              qMinInclEq: true,
              qMaxInclEq: false
            }
          });
        });
      }
    }
    if (b.type === 'value' && info.type === 'dimension') {
      if (byCells) {
        if (!methods.selectHyperCubeCells) {
          methods.selectHyperCubeCells = {
            path: info.path,
            cols: []
          };
        }

        methods.selectHyperCubeCells.cols.push(info.index);
        if (b.id === primarySource || !primarySource && !methods.selectHyperCubeCells.values) {
          methods.selectHyperCubeCells.values = b.brush.values().map(function (s) {
            return +s;
          }).filter(function (v) {
            return !isNaN(v);
          });
          hasValues = !!methods.selectHyperCubeCells.values.length;
        }
      } else {
        var values = b.brush.values().map(function (s) {
          return +s;
        }).filter(function (v) {
          return !isNaN(v);
        });
        hasValues = !!values.length;
        selections.push({
          params: [info.path, info.index, values, false],
          method: 'selectHyperCubeValues'
        });
      }
    }
  });

  if (!hasValues && isActive) {
    return [{
      method: 'resetMadeSelections',
      params: []
    }];
  }

  if (methods.rangeSelectHyperCubeValues) {
    selections.push({
      method: 'rangeSelectHyperCubeValues',
      params: [methods.rangeSelectHyperCubeValues.path, methods.rangeSelectHyperCubeValues.ranges, [], true]
    });
  }

  if (methods.selectHyperCubeContinuousRange) {
    selections.push({
      method: 'selectHyperCubeContinuousRange',
      params: [methods.selectHyperCubeContinuousRange.path, methods.selectHyperCubeContinuousRange.ranges]
    });
  }

  if (methods.selectHyperCubeCells) {
    selections.push({
      method: 'selectHyperCubeCells',
      params: [methods.selectHyperCubeCells.path, methods.selectHyperCubeCells.values, methods.selectHyperCubeCells.cols]
    });
  }

  return selections;
}

function initialize(picasso) {
  q.normalizeProperties = picasso.data('default').normalizeProperties;
  picasso.data('q', q);
}

initialize.qBrushHelper = qBrush;

return initialize;

})));
//# sourceMappingURL=picasso-q.js.map

(function () {
  "use strict";

  window.AntFarm = window.AntFarm || {};

  var TAU = Math.PI * 2;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function distSq(ax, ay, bx, by) {
    var dx = ax - bx;
    var dy = ay - by;
    return dx * dx + dy * dy;
  }

  function dist(ax, ay, bx, by) {
    return Math.sqrt(distSq(ax, ay, bx, by));
  }

  function normalize(x, y) {
    var length = Math.sqrt(x * x + y * y);
    if (length < 0.0001) {
      return { x: 0, y: 0, length: 0 };
    }

    return { x: x / length, y: y / length, length: length };
  }

  function angleTo(ax, ay, bx, by) {
    return Math.atan2(by - ay, bx - ax);
  }

  function pick(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function colorWithAlpha(hex, alpha) {
    var clean = hex.replace("#", "");
    var r = parseInt(clean.slice(0, 2), 16);
    var g = parseInt(clean.slice(2, 4), 16);
    var b = parseInt(clean.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function hexToRgb(hex) {
    var clean = (hex || "#ffffff").replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(clean)) {
      clean = "ffffff";
    }

    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  }

  function componentToHex(value) {
    var rounded = clamp(Math.round(value), 0, 255);
    return (rounded < 16 ? "0" : "") + rounded.toString(16);
  }

  function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }

  function hslToHex(h, s, l) {
    h = ((h % 1) + 1) % 1;
    s = clamp(s, 0, 1);
    l = clamp(l, 0, 1);

    var r;
    var g;
    var b;

    if (s === 0) {
      r = l;
      g = l;
      b = l;
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      var hue = function (t) {
        t = ((t % 1) + 1) % 1;
        if (t < 1 / 6) {
          return p + (q - p) * 6 * t;
        }
        if (t < 1 / 2) {
          return q;
        }
        if (t < 2 / 3) {
          return p + (q - p) * (2 / 3 - t) * 6;
        }
        return p;
      };

      r = hue(h + 1 / 3);
      g = hue(h);
      b = hue(h - 1 / 3);
    }

    return rgbToHex(r * 255, g * 255, b * 255);
  }

  function mixColors(a, b, t) {
    var from = hexToRgb(a);
    var to = hexToRgb(b);
    var amount = clamp(t, 0, 1);
    return rgbToHex(
      lerp(from.r, to.r, amount),
      lerp(from.g, to.g, amount),
      lerp(from.b, to.b, amount)
    );
  }

  window.AntFarm.Utils = {
    TAU: TAU,
    clamp: clamp,
    lerp: lerp,
    randomRange: randomRange,
    dist: dist,
    distSq: distSq,
    normalize: normalize,
    angleTo: angleTo,
    pick: pick,
    colorWithAlpha: colorWithAlpha,
    hexToRgb: hexToRgb,
    rgbToHex: rgbToHex,
    hslToHex: hslToHex,
    mixColors: mixColors
  };
}());

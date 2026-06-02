(function () {
  "use strict";

  window.AntFarm = window.AntFarm || {};

  function SpatialGrid(cellSize) {
    this.cellSize = cellSize || 96;
    this.cells = new Map();
  }

  SpatialGrid.prototype.clear = function () {
    this.cells.clear();
  };

  SpatialGrid.prototype.setCellSize = function (cellSize) {
    this.cellSize = cellSize || this.cellSize;
  };

  SpatialGrid.prototype.key = function (cx, cy) {
    return cx + "," + cy;
  };

  SpatialGrid.prototype.bucket = function (cx, cy) {
    var key = this.key(cx, cy);
    var bucket = this.cells.get(key);

    if (!bucket) {
      bucket = {
        ants: [],
        resources: [],
        hazards: [],
        colonies: []
      };
      this.cells.set(key, bucket);
    }

    return bucket;
  };

  SpatialGrid.prototype.insert = function (type, item, x, y, radius) {
    var cellSize = this.cellSize;
    var r = radius || 0;
    var minX = Math.floor((x - r) / cellSize);
    var maxX = Math.floor((x + r) / cellSize);
    var minY = Math.floor((y - r) / cellSize);
    var maxY = Math.floor((y + r) / cellSize);

    for (var cy = minY; cy <= maxY; cy += 1) {
      for (var cx = minX; cx <= maxX; cx += 1) {
        this.bucket(cx, cy)[type].push(item);
      }
    }
  };

  SpatialGrid.prototype.query = function (type, x, y, radius) {
    var cellSize = this.cellSize;
    var minX = Math.floor((x - radius) / cellSize);
    var maxX = Math.floor((x + radius) / cellSize);
    var minY = Math.floor((y - radius) / cellSize);
    var maxY = Math.floor((y + radius) / cellSize);
    var results = [];
    var seen = new Set();

    for (var cy = minY; cy <= maxY; cy += 1) {
      for (var cx = minX; cx <= maxX; cx += 1) {
        var bucket = this.cells.get(this.key(cx, cy));

        if (!bucket) {
          continue;
        }

        var items = bucket[type];
        for (var i = 0; i < items.length; i += 1) {
          var item = items[i];
          if (!seen.has(item)) {
            seen.add(item);
            results.push(item);
          }
        }
      }
    }

    return results;
  };

  window.AntFarm.SpatialGrid = SpatialGrid;
}());

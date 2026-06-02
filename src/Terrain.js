(function () {
  "use strict";

  window.AntFarm = window.AntFarm || {};

  var Utils = window.AntFarm.Utils;

  function Terrain(settings) {
    this.settings = settings;
    this.width = 0;
    this.height = 0;
    this.cellSize = settings.terrainCellSize;
    this.cols = 0;
    this.rows = 0;
    this.soilTopRow = 0;
    this.solid = new Uint8Array(0);
    this.owner = new Int8Array(0);
    this.noise = new Float32Array(0);
    this.traffic = new Float32Array(0);
    this.trafficConflict = new Float32Array(0);
    this.trafficOwner = new Int8Array(0);
    this.dugCells = 0;
    this.version = 0;
    this.cachedStats = null;
    this.cachedStatsVersion = -1;
    this.dirtyBounds = null;
  }

  Terrain.prototype.resize = function (width, height) {
    this.width = width;
    this.height = height;
    this.cellSize = this.settings.visualQuality === "low"
      ? Math.max(this.settings.terrainCellSize, 16)
      : this.settings.terrainCellSize;
    this.cols = Math.max(1, Math.ceil(width / this.cellSize));
    this.rows = Math.max(1, Math.ceil(height / this.cellSize));
    this.soilTopRow = Math.max(1, Math.floor(this.rows * this.settings.soilTopFraction));
    this.solid = new Uint8Array(this.cols * this.rows);
    this.owner = new Int8Array(this.cols * this.rows);
    this.noise = new Float32Array(this.cols * this.rows);
    this.traffic = new Float32Array(this.cols * this.rows);
    this.trafficConflict = new Float32Array(this.cols * this.rows);
    this.trafficOwner = new Int8Array(this.cols * this.rows);
    this.trafficOwner.fill(-1);
    this.dugCells = 0;
    this.version += 1;
    this.cachedStats = null;
    this.cachedStatsVersion = -1;
    this.markAllDirty();
  };

  Terrain.prototype.index = function (gx, gy) {
    return gy * this.cols + gx;
  };

  Terrain.prototype.cellAt = function (x, y) {
    return {
      x: Utils.clamp(Math.floor(x / this.cellSize), 0, this.cols - 1),
      y: Utils.clamp(Math.floor(y / this.cellSize), 0, this.rows - 1)
    };
  };

  Terrain.prototype.worldX = function (gx) {
    return (gx + 0.5) * this.cellSize;
  };

  Terrain.prototype.worldY = function (gy) {
    return (gy + 0.5) * this.cellSize;
  };

  Terrain.prototype.generate = function (world) {
    if (this.solid.length === 0) {
      return;
    }

    this.dugCells = 0;
    this.version += 1;
    this.cachedStats = null;
    this.cachedStatsVersion = -1;
    this.markAllDirty();
    for (var y = 0; y < this.rows; y += 1) {
      for (var x = 0; x < this.cols; x += 1) {
        var index = this.index(x, y);
        var depth = y / Math.max(1, this.rows - 1);
        this.solid[index] = y >= this.soilTopRow ? 1 : 0;
        this.owner[index] = -1;
        this.noise[index] = Math.random() * 0.8 + depth * 0.2;
        this.traffic[index] = 0;
        this.trafficConflict[index] = 0;
        this.trafficOwner[index] = -1;
      }
    }

    this.createInitialCaves(world);
  };

  Terrain.prototype.createInitialCaves = function (world) {
    if (!world.colonies.length) {
      return;
    }

    var centerX = world.width * 0.5;
    var centerY = world.height * 0.58;
    this.carveCircle(centerX, centerY, Math.min(world.width, world.height) * 0.045, -1);

    for (var i = 0; i < world.colonies.length; i += 1) {
      var colony = world.colonies[i];
      var direction = i === 0 ? 1 : -1;
      var starterX = colony.x + direction * Utils.randomRange(100, 145);
      var starterY = colony.y + Utils.randomRange(-32, 42);

      this.carveChamber(colony.x, colony.y, world.settings.chamberDigRadius + 16, colony.id);
      this.carveChamber(colony.x, colony.y - 34, world.settings.chamberDigRadius * 0.62, colony.id);
      this.carveTunnel(colony.x, colony.y, starterX, starterY, colony.id, world.settings.caveDigRadius + 1);
      this.carveChamber(starterX, starterY, world.settings.chamberDigRadius * 0.72, colony.id);
      this.carveTunnel(colony.x, colony.y, colony.x, this.soilTopRow * this.cellSize + 22, colony.id, world.settings.caveDigRadius);
    }

    for (var pocket = 0; pocket < 10; pocket += 1) {
      var px = Utils.randomRange(world.width * 0.14, world.width * 0.86);
      var py = Utils.randomRange(world.height * 0.22, world.height * 0.9);
      this.carveChamber(px, py, Utils.randomRange(12, 24), -1);
    }
  };

  Terrain.prototype.carveChamber = function (x, y, radius, ownerId) {
    return this.carveCircle(x, y, radius, ownerId);
  };

  Terrain.prototype.carveTunnel = function (x1, y1, x2, y2, ownerId, radius) {
    var distance = Utils.dist(x1, y1, x2, y2);
    var steps = Math.max(4, Math.ceil(distance / Math.max(6, this.cellSize * 0.55)));
    var carved = 0;
    var wave = Utils.randomRange(-1, 1);

    for (var i = 0; i <= steps; i += 1) {
      var t = i / steps;
      var sway = Math.sin(t * Math.PI * 2 + wave) * this.cellSize * 0.65;
      var x = Utils.lerp(x1, x2, t);
      var y = Utils.lerp(y1, y2, t);
      var nx = y2 - y1;
      var ny = -(x2 - x1);
      var normal = Utils.normalize(nx, ny);
      carved += this.carveCircle(x + normal.x * sway, y + normal.y * sway, radius, ownerId);
    }

    return carved;
  };

  Terrain.prototype.markAllDirty = function () {
    this.dirtyBounds = {
      minX: 0,
      minY: 0,
      maxX: Math.max(0, this.cols - 1),
      maxY: Math.max(0, this.rows - 1),
      full: true
    };
  };

  Terrain.prototype.markDirtyCells = function (minX, minY, maxX, maxY) {
    if (this.cols <= 0 || this.rows <= 0) {
      return;
    }

    var bounds = {
      minX: Utils.clamp(Math.floor(minX), 0, this.cols - 1),
      minY: Utils.clamp(Math.floor(minY), 0, this.rows - 1),
      maxX: Utils.clamp(Math.ceil(maxX), 0, this.cols - 1),
      maxY: Utils.clamp(Math.ceil(maxY), 0, this.rows - 1),
      full: false
    };

    if (!this.dirtyBounds) {
      this.dirtyBounds = bounds;
      return;
    }

    this.dirtyBounds.minX = Math.min(this.dirtyBounds.minX, bounds.minX);
    this.dirtyBounds.minY = Math.min(this.dirtyBounds.minY, bounds.minY);
    this.dirtyBounds.maxX = Math.max(this.dirtyBounds.maxX, bounds.maxX);
    this.dirtyBounds.maxY = Math.max(this.dirtyBounds.maxY, bounds.maxY);
    this.dirtyBounds.full = this.dirtyBounds.full || bounds.full;
  };

  Terrain.prototype.consumeDirtyBounds = function () {
    var bounds = this.dirtyBounds;
    this.dirtyBounds = null;
    return bounds;
  };

  Terrain.prototype.carveCircle = function (x, y, radius, ownerId) {
    if (this.solid.length === 0) {
      return 0;
    }

    var center = this.cellAt(x, y);
    var radiusCells = Math.max(1, Math.ceil(radius / this.cellSize));
    var radiusSq = radiusCells * radiusCells;
    var carved = 0;
    var changed = false;

    for (var gy = center.y - radiusCells; gy <= center.y + radiusCells; gy += 1) {
      if (gy < this.soilTopRow || gy >= this.rows) {
        continue;
      }

      for (var gx = center.x - radiusCells; gx <= center.x + radiusCells; gx += 1) {
        if (gx < 0 || gx >= this.cols) {
          continue;
        }

        var dx = gx - center.x;
        var dy = gy - center.y;
        if (dx * dx + dy * dy > radiusSq) {
          continue;
        }

        var index = this.index(gx, gy);
        if (this.solid[index]) {
          carved += 1;
          this.dugCells += 1;
          changed = true;
        }
        this.solid[index] = 0;
        if (ownerId >= 0 && this.owner[index] !== ownerId) {
          this.owner[index] = ownerId;
          changed = true;
        }
      }
    }

    if (changed) {
      this.version += 1;
      this.cachedStats = null;
      this.markDirtyCells(
        center.x - radiusCells - 2,
        center.y - radiusCells - 2,
        center.x + radiusCells + 2,
        center.y + radiusCells + 2
      );
    }

    return carved;
  };

  Terrain.prototype.isSolid = function (x, y) {
    if (!this.settings.sideViewAntFarm || this.solid.length === 0) {
      return false;
    }

    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return true;
    }

    var cell = this.cellAt(x, y);
    return Boolean(this.solid[this.index(cell.x, cell.y)]);
  };

  Terrain.prototype.isPassable = function (x, y) {
    return !this.isSolid(x, y);
  };

  Terrain.prototype.isCellPassable = function (gx, gy) {
    if (!this.settings.sideViewAntFarm || this.solid.length === 0) {
      return true;
    }

    if (gx < 0 || gx >= this.cols || gy < 0 || gy >= this.rows) {
      return false;
    }

    return !this.solid[this.index(gx, gy)];
  };

  Terrain.prototype.recordTraffic = function (x, y, colonyId, role, dt) {
    if (!this.settings.sideViewAntFarm || this.solid.length === 0 || colonyId < 0) {
      return;
    }

    var cell = this.cellAt(x, y);
    var baseAmount = Utils.clamp(dt * (role === "soldier" ? 0.62 : 0.42), 0, 0.055);

    for (var gy = cell.y - 1; gy <= cell.y + 1; gy += 1) {
      if (gy < this.soilTopRow || gy >= this.rows) {
        continue;
      }

      for (var gx = cell.x - 1; gx <= cell.x + 1; gx += 1) {
        if (gx < 0 || gx >= this.cols || !this.isCellPassable(gx, gy)) {
          continue;
        }

        var dx = gx - cell.x;
        var dy = gy - cell.y;
        var distanceSq = dx * dx + dy * dy;
        if (distanceSq > 2) {
          continue;
        }

        var index = this.index(gx, gy);
        var weight = distanceSq === 0 ? 1 : 0.32;
        var owner = this.trafficOwner[index];
        var amount = baseAmount * weight;

        if (owner >= 0 && owner !== colonyId && this.traffic[index] > 0.12) {
          this.trafficConflict[index] = Utils.clamp(this.trafficConflict[index] + amount * 2.9, 0, 1);
        }

        this.trafficOwner[index] = colonyId;
        this.traffic[index] = Utils.clamp(this.traffic[index] + amount, 0, 1);
      }
    }
  };

  Terrain.prototype.decayTraffic = function (dt) {
    if (this.traffic.length === 0) {
      return;
    }

    var wearLoss = dt * 0.0025;
    var conflictDecay = Math.exp(-1.05 * dt);

    for (var i = 0; i < this.traffic.length; i += 1) {
      if (this.traffic[i] > 0) {
        this.traffic[i] = Math.max(0, this.traffic[i] - wearLoss);
      }

      if (this.trafficConflict[i] > 0) {
        this.trafficConflict[i] *= conflictDecay;
        if (this.trafficConflict[i] < 0.01) {
          this.trafficConflict[i] = 0;
        }
      }

      if (this.traffic[i] <= 0.005 && this.trafficConflict[i] <= 0.005) {
        this.trafficOwner[i] = -1;
      }
    }
  };

  Terrain.prototype.nearestPassableCell = function (x, y, maxRadius) {
    if (!this.settings.sideViewAntFarm || this.solid.length === 0) {
      var freeCell = this.cellAt(x, y);
      return {
        x: freeCell.x,
        y: freeCell.y,
        wx: this.worldX(freeCell.x),
        wy: this.worldY(freeCell.y)
      };
    }

    var origin = this.cellAt(x, y);
    var radius = Math.max(0, maxRadius || 12);

    if (this.isCellPassable(origin.x, origin.y)) {
      return {
        x: origin.x,
        y: origin.y,
        wx: this.worldX(origin.x),
        wy: this.worldY(origin.y)
      };
    }

    for (var r = 1; r <= radius; r += 1) {
      var best = null;
      var bestDistance = Infinity;

      for (var gy = origin.y - r; gy <= origin.y + r; gy += 1) {
        for (var gx = origin.x - r; gx <= origin.x + r; gx += 1) {
          if (Math.abs(gx - origin.x) !== r && Math.abs(gy - origin.y) !== r) {
            continue;
          }

          if (!this.isCellPassable(gx, gy)) {
            continue;
          }

          var distance = (gx - origin.x) * (gx - origin.x) + (gy - origin.y) * (gy - origin.y);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = { x: gx, y: gy };
          }
        }
      }

      if (best) {
        return {
          x: best.x,
          y: best.y,
          wx: this.worldX(best.x),
          wy: this.worldY(best.y)
        };
      }
    }

    return null;
  };

  Terrain.prototype.hasLineOfSight = function (x1, y1, x2, y2) {
    if (!this.settings.sideViewAntFarm || this.solid.length === 0) {
      return true;
    }

    var distance = Utils.dist(x1, y1, x2, y2);
    var steps = Math.max(1, Math.ceil(distance / Math.max(4, this.cellSize * 0.55)));

    for (var i = 0; i <= steps; i += 1) {
      var t = i / steps;
      if (this.isSolid(Utils.lerp(x1, x2, t), Utils.lerp(y1, y2, t))) {
        return false;
      }
    }

    return true;
  };

  Terrain.prototype.findPath = function (x1, y1, x2, y2, maxVisited, requireComplete) {
    if (!this.settings.sideViewAntFarm || this.solid.length === 0) {
      return [{ x: x2, y: y2 }];
    }

    var start = this.nearestPassableCell(x1, y1, 8);
    var goal = this.nearestPassableCell(x2, y2, 18);

    if (!start || !goal) {
      return [];
    }

    var startIndex = this.index(start.x, start.y);
    var goalIndex = this.index(goal.x, goal.y);

    if (startIndex === goalIndex) {
      return [{ x: goal.wx, y: goal.wy }];
    }

    var limit = Math.max(80, maxVisited || this.settings.routeMaxVisitedCells || 900);
    var total = this.cols * this.rows;
    var parent = new Int32Array(total);
    var gScore = new Float32Array(total);
    var closed = new Uint8Array(total);
    var inOpen = new Uint8Array(total);
    var open = [startIndex];

    for (var i = 0; i < total; i += 1) {
      parent[i] = -1;
      gScore[i] = Infinity;
    }

    gScore[startIndex] = 0;
    inOpen[startIndex] = 1;

    var visited = 0;
    var bestIndex = startIndex;
    var bestHeuristic = Math.abs(start.x - goal.x) + Math.abs(start.y - goal.y);
    var neighborOffsets = [
      { x: 1, y: 0, cost: 10 },
      { x: -1, y: 0, cost: 10 },
      { x: 0, y: 1, cost: 10 },
      { x: 0, y: -1, cost: 10 },
      { x: 1, y: 1, cost: 14 },
      { x: 1, y: -1, cost: 14 },
      { x: -1, y: 1, cost: 14 },
      { x: -1, y: -1, cost: 14 }
    ];

    while (open.length && visited < limit) {
      var openSlot = 0;
      var current = open[0];
      var currentX = current % this.cols;
      var currentY = Math.floor(current / this.cols);
      var currentScore = gScore[current] + (Math.abs(currentX - goal.x) + Math.abs(currentY - goal.y)) * 10;

      for (var openIndex = 1; openIndex < open.length; openIndex += 1) {
        var candidate = open[openIndex];
        var cx = candidate % this.cols;
        var cy = Math.floor(candidate / this.cols);
        var score = gScore[candidate] + (Math.abs(cx - goal.x) + Math.abs(cy - goal.y)) * 10;

        if (score < currentScore) {
          currentScore = score;
          current = candidate;
          currentX = cx;
          currentY = cy;
          openSlot = openIndex;
        }
      }

      open[openSlot] = open[open.length - 1];
      open.pop();
      inOpen[current] = 0;

      if (closed[current]) {
        continue;
      }

      closed[current] = 1;
      visited += 1;

      var heuristic = Math.abs(currentX - goal.x) + Math.abs(currentY - goal.y);
      if (heuristic < bestHeuristic) {
        bestHeuristic = heuristic;
        bestIndex = current;
      }

      if (current === goalIndex) {
        return this.reconstructPath(parent, current);
      }

      for (var n = 0; n < neighborOffsets.length; n += 1) {
        var offset = neighborOffsets[n];
        var nx = currentX + offset.x;
        var ny = currentY + offset.y;

        if (!this.isCellPassable(nx, ny)) {
          continue;
        }

        if (offset.x !== 0 && offset.y !== 0) {
          if (!this.isCellPassable(currentX + offset.x, currentY) || !this.isCellPassable(currentX, currentY + offset.y)) {
            continue;
          }
        }

        var neighbor = this.index(nx, ny);
        if (closed[neighbor]) {
          continue;
        }

        var tentative = gScore[current] + offset.cost;
        if (tentative >= gScore[neighbor]) {
          continue;
        }

        parent[neighbor] = current;
        gScore[neighbor] = tentative;

        if (!inOpen[neighbor]) {
          open.push(neighbor);
          inOpen[neighbor] = 1;
        }
      }
    }

    if (!requireComplete && bestIndex !== startIndex) {
      return this.reconstructPath(parent, bestIndex);
    }

    return [];
  };

  Terrain.prototype.reconstructPath = function (parent, current) {
    var cells = [];

    while (current >= 0) {
      cells.push(current);
      current = parent[current];
    }

    cells.reverse();

    if (cells.length <= 1) {
      return [];
    }

    var points = [];
    for (var i = 0; i < cells.length; i += 1) {
      var cellIndex = cells[i];
      var gx = cellIndex % this.cols;
      var gy = Math.floor(cellIndex / this.cols);
      points.push({ x: this.worldX(gx), y: this.worldY(gy) });
    }

    var path = [];
    var cursor = 0;

    while (cursor < points.length - 1) {
      var next = cursor + 1;
      var farthest = next;
      var lookAheadLimit = Math.min(points.length - 1, cursor + 10);

      for (var probe = next + 1; probe <= lookAheadLimit; probe += 1) {
        if (this.hasLineOfSight(points[cursor].x, points[cursor].y, points[probe].x, points[probe].y)) {
          farthest = probe;
        } else {
          break;
        }
      }

      path.push(points[farthest]);
      cursor = farthest;
    }

    return path;
  };

  Terrain.prototype.digAt = function (x, y, radius, ownerId) {
    return this.carveCircle(x, y, radius, ownerId);
  };

  Terrain.prototype.countSolidCircle = function (x, y, radius) {
    if (this.solid.length === 0) {
      return 0;
    }

    var center = this.cellAt(x, y);
    var radiusCells = Math.max(1, Math.ceil(radius / this.cellSize));
    var radiusSq = radiusCells * radiusCells;
    var count = 0;

    for (var gy = center.y - radiusCells; gy <= center.y + radiusCells; gy += 1) {
      if (gy < this.soilTopRow || gy >= this.rows) {
        continue;
      }

      for (var gx = center.x - radiusCells; gx <= center.x + radiusCells; gx += 1) {
        if (gx < 0 || gx >= this.cols) {
          continue;
        }

        var dx = gx - center.x;
        var dy = gy - center.y;
        if (dx * dx + dy * dy > radiusSq) {
          continue;
        }

        if (this.solid[this.index(gx, gy)]) {
          count += 1;
        }
      }
    }

    return count;
  };

  Terrain.prototype.chooseExpansionTarget = function (colony, world) {
    var nearestEnemy = world.nearestEnemyColony(colony);
    var towardX = nearestEnemy ? nearestEnemy.x - colony.x : world.width * 0.5 - colony.x;
    var towardY = nearestEnemy ? nearestEnemy.y - colony.y : world.height * 0.55 - colony.y;
    var baseAngle = Math.atan2(towardY, towardX);

    if (Math.random() < 0.35) {
      baseAngle += Utils.randomRange(-1.4, 1.4);
    } else {
      baseAngle += Utils.randomRange(-0.45, 0.45);
    }

    var distance = Utils.randomRange(82, Math.min(world.width, world.height) * 0.34);
    var yBias = Math.random() < 0.35 ? Utils.randomRange(-120, 140) : 0;
    var targetX = colony.x + Math.cos(baseAngle) * distance;
    var targetY = colony.y + Math.sin(baseAngle) * distance + yBias;
    var minY = this.soilTopRow * this.cellSize + 24;

    return {
      x: Utils.clamp(targetX, 30, world.width - 30),
      y: Utils.clamp(targetY, minY, world.height - 30),
      radius: Math.random() < 0.28 ? world.settings.chamberDigRadius : world.settings.caveDigRadius
    };
  };

  Terrain.prototype.stats = function () {
    if (this.cachedStats && this.cachedStatsVersion === this.version) {
      return this.cachedStats;
    }

    var solid = 0;
    var open = 0;

    for (var i = 0; i < this.solid.length; i += 1) {
      if (this.solid[i]) {
        solid += 1;
      } else {
        open += 1;
      }
    }

    this.cachedStats = {
      cols: this.cols,
      rows: this.rows,
      solid: solid,
      open: open,
      dug: this.dugCells
    };
    this.cachedStatsVersion = this.version;

    return this.cachedStats;
  };

  window.AntFarm.Terrain = Terrain;
}());

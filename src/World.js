(function () {
  "use strict";

  window.AntFarm = window.AntFarm || {};

  var Utils = window.AntFarm.Utils;

  function World(settings, ui) {
    this.settings = settings;
    this.ui = ui;
    this.width = 0;
    this.height = 0;
    this.time = 0;
    this.initialized = false;
    this.colonies = [];
    this.resources = [];
    this.hazards = [];
    this.grid = new window.AntFarm.SpatialGrid(settings.spatialCellSize);
    this.pheromones = new window.AntFarm.PheromoneField(settings);
    this.terrain = new window.AntFarm.Terrain(settings);
    this.particles = new window.AntFarm.ParticleSystem(settings);
    this.foodAccumulator = 0;
    this.fireSparkAccumulator = 0;
    this.rainSeepAccumulator = Utils.randomRange(0.72, 0.95);
    this.trafficAccumulator = 0;
    this.digEventAccumulator = 0;
    this.audio = null;
  }

  World.prototype.resize = function (width, height) {
    var oldWidth = this.width;
    var oldHeight = this.height;
    this.width = width;
    this.height = height;
    this.pheromones.resize(width, height);
    this.terrain.resize(width, height);

    if (!this.initialized) {
      this.initialized = true;
      this.initialize();
      return;
    }

    if (oldWidth <= 0 || oldHeight <= 0) {
      return;
    }

    var sx = width / oldWidth;
    var sy = height / oldHeight;
    this.scaleEntities(sx, sy);
    this.terrain.generate(this);
  };

  World.prototype.scaleEntities = function (sx, sy) {
    function scalePoint(item) {
      item.x *= sx;
      item.y *= sy;
      if (Object.prototype.hasOwnProperty.call(item, "patrolX")) {
        item.patrolX *= sx;
        item.patrolY *= sy;
      }
      if (Object.prototype.hasOwnProperty.call(item, "sourceX")) {
        item.sourceX *= sx;
        item.sourceY *= sy;
      }
    }

    for (var i = 0; i < this.colonies.length; i += 1) {
      var colony = this.colonies[i];
      scalePoint(colony);
      for (var a = 0; a < colony.ants.length; a += 1) {
        scalePoint(colony.ants[a]);
      }
    }

    for (var r = 0; r < this.resources.length; r += 1) {
      scalePoint(this.resources[r]);
    }

    for (var h = 0; h < this.hazards.length; h += 1) {
      scalePoint(this.hazards[h]);
    }

    for (var p = 0; p < this.particles.particles.length; p += 1) {
      scalePoint(this.particles.particles[p]);
    }

    for (var c2 = 0; c2 < this.colonies.length; c2 += 1) {
      for (var ch = 0; ch < this.colonies[c2].chambers.length; ch += 1) {
        scalePoint(this.colonies[c2].chambers[ch]);
      }
    }
  };

  World.prototype.initialize = function () {
    this.createColonies();
    if (this.settings.sideViewAntFarm) {
      this.terrain.generate(this);
    }

    var initialFood = this.settings.sideViewAntFarm ? 18 : 13;
    for (var i = 0; i < initialFood; i += 1) {
      this.spawnRandomFood(false);
    }

    for (var c = 0; c < this.colonies.length; c += 1) {
      this.addResource(
        this.colonies[c].x + Utils.randomRange(-92, 92),
        this.colonies[c].y + Utils.randomRange(-84, 96),
        Utils.randomRange(18, 34),
        false,
        false
      );
    }
  };

  World.prototype.createColonies = function () {
    var colors = this.colonyColors();
    var names = this.settings.sideViewAntFarm
      ? ["Red", "Blue"]
      : ["Red", "Blue", "Green", "Violet", "Amber"];
    var positions = this.settings.sideViewAntFarm
      ? [
        { x: 0.1, y: 0.66 },
        { x: 0.9, y: 0.66 }
      ]
      : [
        { x: 0.22, y: 0.30 },
        { x: 0.78, y: 0.36 },
        { x: 0.51, y: 0.75 },
        { x: 0.24, y: 0.74 },
        { x: 0.76, y: 0.72 }
      ];
    var count = Math.min(this.settings.colonyCount, positions.length);

    this.colonies.length = 0;
    for (var i = 0; i < count; i += 1) {
      var px = Utils.clamp(positions[i].x * this.width, 64, this.width - 64);
      var py = Utils.clamp(positions[i].y * this.height, 64, this.height - 64);
      var colony = new window.AntFarm.Colony(i, names[i], colors[i], px, py, this.settings);
      this.colonies.push(colony);
      colony.seedAnts(this);
    }
  };

  World.prototype.colonyColors = function () {
    var colors = [
      this.settings.team1Color || "#ff5f57",
      this.settings.team2Color || "#57a9ff",
      this.settings.team3Color || "#65d46e",
      this.settings.team4Color || "#d57cff",
      this.settings.team5Color || "#ffb84c"
    ];

    return this.settings.sideViewAntFarm ? colors.slice(0, 2) : colors;
  };

  World.prototype.applyColonySettings = function () {
    var colors = this.colonyColors();
    for (var i = 0; i < this.colonies.length; i += 1) {
      this.colonies[i].color = colors[i % colors.length];
    }
  };

  World.prototype.applySettings = function (options) {
    options = options || {};
    var rebuildTerrain = Object.prototype.hasOwnProperty.call(options, "rebuildTerrain") ? options.rebuildTerrain : true;
    var resizePheromones = Object.prototype.hasOwnProperty.call(options, "resizePheromones") ? options.resizePheromones : true;

    this.grid.setCellSize(this.settings.spatialCellSize);
    this.pheromones.settings = this.settings;
    if (resizePheromones) {
      this.pheromones.resize(this.width, this.height);
    }
    this.terrain.settings = this.settings;
    if (rebuildTerrain) {
      this.terrain.resize(this.width, this.height);
      if (this.settings.sideViewAntFarm) {
        this.terrain.generate(this);
      }
    }
    this.particles.settings = this.settings;
    this.applyColonySettings();

    while (this.resources.length > this.settings.maxFoodNodes) {
      this.resources.shift();
    }

    if (this.particles.particles.length > this.settings.particleCap) {
      this.particles.particles.splice(0, this.particles.particles.length - this.settings.particleCap);
    }

    while (this.getTotalAnts() > this.settings.maxAnts) {
      var largest = this.colonies[0];
      for (var i = 1; i < this.colonies.length; i += 1) {
        if (this.colonies[i].ants.length > largest.ants.length) {
          largest = this.colonies[i];
        }
      }
      largest.ants.pop();
    }
  };

  World.prototype.update = function (dt) {
    if (!this.initialized) {
      return;
    }

    var scaledDt = dt * this.settings.simulationSpeed;
    this.time += scaledDt;
    this.ui.update(scaledDt);
    this.updateColonyColorMode();

    this.foodAccumulator += scaledDt * this.settings.foodSpawnRate;
    while (this.foodAccumulator >= 1) {
      this.foodAccumulator -= 1;
      this.spawnRandomFood(true);
    }

    this.updateRainSeeps(scaledDt);

    for (var r = 0; r < this.resources.length; r += 1) {
      this.resources[r].update(scaledDt);
    }

    for (var h = this.hazards.length - 1; h >= 0; h -= 1) {
      this.hazards[h].update(scaledDt);
      if (!this.hazards[h].isAlive()) {
        this.hazards.splice(h, 1);
      }
    }

    this.pheromones.update(scaledDt, this);
    this.updateTerrainTraffic(scaledDt);
    this.emitHazardParticles(scaledDt);
    this.rebuildGrid();

    for (var c = 0; c < this.colonies.length; c += 1) {
      this.colonies[c].update(scaledDt, this);
    }

    for (var i = 0; i < this.colonies.length; i += 1) {
      var ants = this.colonies[i].ants;
      for (var a = 0; a < ants.length; a += 1) {
        ants[a].update(scaledDt, this);
      }
    }

    this.cleanup();
    this.particles.update(scaledDt);
  };

  World.prototype.rebuildGrid = function () {
    this.grid.clear();

    for (var c = 0; c < this.colonies.length; c += 1) {
      var colony = this.colonies[c];
      if (colony.alive) {
        this.grid.insert("colonies", colony, colony.x, colony.y, colony.baseRadius);
      }

      for (var a = 0; a < colony.ants.length; a += 1) {
        var ant = colony.ants[a];
        if (ant.alive) {
          this.grid.insert("ants", ant, ant.x, ant.y, 3);
        }
      }
    }

    for (var r = 0; r < this.resources.length; r += 1) {
      var resource = this.resources[r];
      if (!resource.isDepleted()) {
        this.grid.insert("resources", resource, resource.x, resource.y, resource.radius);
      }
    }

    for (var h = 0; h < this.hazards.length; h += 1) {
      var hazard = this.hazards[h];
      if (hazard.isAlive()) {
        this.grid.insert("hazards", hazard, hazard.x, hazard.y, hazard.radius);
      }
    }
  };

  World.prototype.cleanup = function () {
    for (var c = 0; c < this.colonies.length; c += 1) {
      var colony = this.colonies[c];
      var survivors = [];
      for (var a = 0; a < colony.ants.length; a += 1) {
        if (colony.ants[a].alive) {
          survivors.push(colony.ants[a]);
        }
      }
      colony.ants = survivors;
    }

    var resources = [];
    for (var r = 0; r < this.resources.length; r += 1) {
      if (!this.resources[r].isDepleted()) {
        resources.push(this.resources[r]);
      }
    }
    this.resources = resources;
  };

  World.prototype.updateColonyColorMode = function () {
    var mode = this.settings.colonyColorMode || "manual";
    var baseColors = this.colonyColors();
    var audio = this.audio || {};
    var bass = Utils.clamp((audio.bass || 0) * this.settings.audioSensitivity, 0, 1);

    for (var i = 0; i < this.colonies.length; i += 1) {
      if (mode === "rgb") {
        this.colonies[i].color = Utils.hslToHex(this.time * 0.026 + i * 0.56, 0.82, 0.58);
      } else if (mode === "audio") {
        var pulse = Utils.hslToHex(this.time * 0.018 + i * 0.56 + bass * 0.08, 0.9, 0.48 + bass * 0.16);
        this.colonies[i].color = Utils.mixColors(baseColors[i % baseColors.length], pulse, 0.26 + bass * 0.48);
      } else {
        this.colonies[i].color = baseColors[i % baseColors.length];
      }
    }
  };

  World.prototype.updateTerrainTraffic = function (dt) {
    if (!this.settings.sideViewAntFarm || !this.terrain || !this.terrain.decayTraffic) {
      return;
    }

    this.trafficAccumulator += dt;
    if (this.trafficAccumulator < 0.28) {
      return;
    }

    this.terrain.decayTraffic(this.trafficAccumulator);
    this.trafficAccumulator = 0;
  };

  World.prototype.updateRainSeeps = function (dt) {
    if (!this.settings.sideViewAntFarm || !this.settings.enableRainSeep || !this.terrain || this.settings.rainSeepFrequency <= 0) {
      return;
    }

    var audio = this.settings.enableAudioReactive && this.audio ? Utils.clamp(this.audio.treble * 0.28, 0, 0.22) : 0;
    this.rainSeepAccumulator += dt * this.settings.rainSeepFrequency * (0.65 + this.settings.disasterFrequency * 0.35 + audio);

    if (this.rainSeepAccumulator < 1) {
      return;
    }

    this.rainSeepAccumulator -= 1;
    this.addRainSeep(true);
  };

  World.prototype.emitHazardParticles = function (dt) {
    if (!this.settings.showParticles || this.hazards.length === 0) {
      return;
    }

    this.fireSparkAccumulator += dt * 34 * Math.max(0.35, this.settings.disasterFrequency);
    while (this.fireSparkAccumulator >= 1) {
      this.fireSparkAccumulator -= 1;
      var hazard = Utils.pick(this.hazards);
      if (!hazard) {
        return;
      }
      if (hazard.type === "water") {
        if (Math.random() < 0.55) {
          var dripX = Utils.lerp(hazard.sourceX, hazard.x, Math.random()) + Utils.randomRange(-4, 4);
          var dripY = Utils.lerp(hazard.sourceY, hazard.y, Math.random()) + Utils.randomRange(-3, 3);
          this.particles.water(dripX, dripY);
        }
      } else {
        var angle = Math.random() * Utils.TAU;
        var radius = Math.sqrt(Math.random()) * hazard.radius * 0.86;
        this.particles.fire(hazard.x + Math.cos(angle) * radius, hazard.y + Math.sin(angle) * radius);
      }
    }
  };

  World.prototype.spawnRandomFood = function (announce) {
    if (this.resources.length >= this.settings.maxFoodNodes) {
      return;
    }

    var amount = Utils.randomRange(this.settings.foodAmountMin, this.settings.foodAmountMax);
    if (Math.random() < 0.12) {
      amount *= 1.65;
    }

    var margin = 52;
    var x = Utils.randomRange(margin, Math.max(margin + 1, this.width - margin));
    var y = Utils.randomRange(margin, Math.max(margin + 1, this.height - margin));

    if (this.settings.sideViewAntFarm) {
      var soilTop = this.terrain.soilTopRow * this.terrain.cellSize;
      y = Utils.randomRange(soilTop + 36, Math.max(soilTop + 37, this.height - margin));
      if (Math.random() < 0.22) {
        x = this.width * 0.5 + Utils.randomRange(-this.width * 0.2, this.width * 0.2);
      }
    }

    this.addResource(x, y, amount, false, announce && Math.random() < 0.28);
  };

  World.prototype.addResource = function (x, y, amount, userDropped, announce) {
    if (this.resources.length >= this.settings.maxFoodNodes) {
      this.resources.shift();
    }

    var resource = new window.AntFarm.Resource(
      Utils.clamp(x, 16, this.width - 16),
      Utils.clamp(
        y,
        this.settings.sideViewAntFarm ? this.terrain.soilTopRow * this.terrain.cellSize + 18 : 16,
        this.height - 16
      ),
      amount,
      userDropped
    );
    this.resources.push(resource);
    this.pheromones.depositFood(resource.x, resource.y, 0.5, resource.radius + 18);
    this.particles.sparkle(resource.x, resource.y, "#eadb77", userDropped ? 14 : 6);

    if (this.settings.sideViewAntFarm) {
      this.terrain.carveChamber(resource.x, resource.y, userDropped ? 24 : 14, -1);
    }

    if (announce) {
      this.addEvent("Food bloom detected", "#d7c56a");
    }

    return resource;
  };

  World.prototype.addHazard = function (x, y, type) {
    var hazardType = type || "fire";
    if (hazardType === "fire" && !this.settings.enableFire) {
      return null;
    }
    if (hazardType === "water" && !this.settings.enableRainSeep) {
      return null;
    }

    var hazard = new window.AntFarm.Hazard(
      Utils.clamp(x, 10, this.width - 10),
      Utils.clamp(
        y,
        this.settings.sideViewAntFarm ? this.terrain.soilTopRow * this.terrain.cellSize + 12 : 10,
        this.height - 10
      ),
      this.settings,
      hazardType
    );
    if (hazardType === "water") {
      hazard.sourceX = Utils.clamp(x + Utils.randomRange(-18, 18), 10, this.width - 10);
      hazard.sourceY = this.terrain.soilTopRow * this.terrain.cellSize + 3;
    }
    this.hazards.push(hazard);

    if (this.hazards.length > 12) {
      this.hazards.shift();
    }

    this.particles.collapse(hazard.x, hazard.y, hazardType === "water" ? "#83d8ff" : "#ff8a34");
    this.pheromones.depositDanger(hazard.x, hazard.y, 1, hazard.radius + 20);
    this.addEvent(hazardType === "water" ? "Rainwater seep" : "Fire outbreak", hazardType === "water" ? "#83d8ff" : "#ff9a38");
    return hazard;
  };

  World.prototype.addRainSeep = function (announce) {
    var soilY = this.terrain.soilTopRow * this.terrain.cellSize;
    var x = Utils.randomRange(this.width * 0.08, this.width * 0.92);
    var y = Utils.randomRange(soilY + 22, Math.min(this.height - 24, soilY + 112));
    var hazard = this.addHazard(x, y, "water");

    if (hazard && !announce) {
      hazard.lifetime *= 0.8;
    }

    return hazard;
  };

  World.prototype.onDig = function (x, y, colony, count) {
    if (!count) {
      return;
    }

    this.digEventAccumulator += count;
    if (this.settings.showParticles && Math.random() < 0.2) {
      this.particles.digDust(x, y, "#8f6d47", Math.min(6, count));
    }

    if (this.digEventAccumulator > 170) {
      this.digEventAccumulator = 0;
      this.particles.sparkle(x, y, colony.color, 10);
      this.addEvent(colony.name + " Colony opened new tunnels", colony.color);
    }
  };

  World.prototype.tryDig = function (x, y, radius, colony) {
    if (!this.settings.sideViewAntFarm || !this.terrain || !colony || !colony.alive) {
      return 0;
    }

    var possible = this.terrain.countSolidCircle(x, y, radius);
    if (possible <= 0) {
      return 0;
    }

    var costPerCell = this.settings.digPointCostPerCell;
    var affordable = Math.floor(colony.digPoints / costPerCell);
    if (affordable <= 0) {
      return 0;
    }

    var digRadius = radius;
    if (affordable < possible) {
      digRadius = Math.max(this.terrain.cellSize * 0.58, radius * Math.sqrt(affordable / possible));
    }

    var carved = this.terrain.digAt(x, y, digRadius, colony.id);
    if (carved <= 0) {
      return 0;
    }

    colony.digPoints = Math.max(0, colony.digPoints - carved * costPerCell);
    this.onDig(x, y, colony, carved);
    return carved;
  };

  World.prototype.workOnChamber = function (chamber, colony) {
    if (!chamber || chamber.complete || !colony || !colony.alive) {
      return 0;
    }

    var carved = this.tryDig(chamber.x, chamber.y, chamber.radius * 0.75, colony);
    chamber.progress += carved;

    var remainingSolid = this.terrain.countSolidCircle(
      chamber.x,
      chamber.y,
      Math.max(this.terrain.cellSize, chamber.radius - this.settings.chamberCompletionPadding)
    );

    if (remainingSolid <= 8 || chamber.progress >= chamber.targetProgress) {
      chamber.complete = true;
      this.terrain.carveChamber(chamber.x, chamber.y, chamber.radius, colony.id);
      this.particles.foodDeposit(chamber.x, chamber.y, colony.color);
      this.particles.sparkle(chamber.x, chamber.y, colony.color, 18);
      this.addEvent(colony.name + " " + colony.chamberLabel(chamber.type) + " is active", colony.color);
    }

    return carved;
  };

  World.prototype.addEvent = function (message, color) {
    this.ui.push(message, color);
  };

  World.prototype.getTotalAnts = function () {
    var total = 0;
    for (var i = 0; i < this.colonies.length; i += 1) {
      total += this.colonies[i].ants.length;
    }
    return total;
  };

  World.prototype.canSpawnAnt = function (colony) {
    if (!colony.alive) {
      return false;
    }

    if (this.getTotalAnts() >= this.settings.maxAnts) {
      return false;
    }

    return colony.ants.length < this.settings.perColonyCap;
  };

  World.prototype.nearestEnemyColony = function (colony) {
    var best = null;
    var bestDistance = Infinity;

    for (var i = 0; i < this.colonies.length; i += 1) {
      var other = this.colonies[i];
      if (!other.alive || other === colony) {
        continue;
      }

      var distance = Utils.distSq(colony.x, colony.y, other.x, other.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = other;
      }
    }

    return best;
  };

  window.AntFarm.World = World;
}());

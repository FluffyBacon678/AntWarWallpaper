(function () {
  "use strict";

  window.AntFarm = window.AntFarm || {};

  var Utils = window.AntFarm.Utils;

  function PheromoneField(settings) {
    this.settings = settings;
    this.width = 0;
    this.height = 0;
    this.cellSize = settings.pheromoneCellSize;
    this.cols = 0;
    this.rows = 0;
    this.food = new Float32Array(0);
    this.danger = new Float32Array(0);
    this.foodScratch = new Float32Array(0);
    this.dangerScratch = new Float32Array(0);
  }

  PheromoneField.prototype.resize = function (width, height) {
    var qualitySize = this.settings.visualQuality === "low"
      ? Math.max(this.settings.pheromoneCellSize, 32)
      : this.settings.pheromoneCellSize;
    var cols = Math.max(1, Math.ceil(width / qualitySize));
    var rows = Math.max(1, Math.ceil(height / qualitySize));

    this.width = width;
    this.height = height;
    this.cellSize = qualitySize;

    if (cols === this.cols && rows === this.rows) {
      return;
    }

    this.cols = cols;
    this.rows = rows;
    this.food = new Float32Array(cols * rows);
    this.danger = new Float32Array(cols * rows);
    this.foodScratch = new Float32Array(cols * rows);
    this.dangerScratch = new Float32Array(cols * rows);
  };

  PheromoneField.prototype.indexAtCell = function (gx, gy) {
    return gy * this.cols + gx;
  };

  PheromoneField.prototype.cellAt = function (x, y) {
    return {
      x: Utils.clamp(Math.floor(x / this.cellSize), 0, this.cols - 1),
      y: Utils.clamp(Math.floor(y / this.cellSize), 0, this.rows - 1)
    };
  };

  PheromoneField.prototype.update = function (dt, world) {
    if (!this.settings.enablePheromones || this.food.length === 0) {
      return;
    }

    this.depositSources(dt, world);
    this.processChannel("food", this.settings.foodPheromoneDecay, this.settings.pheromoneDiffusion, dt);
    this.processChannel("danger", this.settings.dangerPheromoneDecay, this.settings.pheromoneDiffusion * 0.75, dt);
  };

  PheromoneField.prototype.depositSources = function (dt, world) {
    for (var i = 0; i < world.resources.length; i += 1) {
      var resource = world.resources[i];
      if (!resource.isDepleted()) {
        var amountRatio = Utils.clamp(resource.amount / resource.maxAmount, 0.1, 1);
        this.depositFood(resource.x, resource.y, this.settings.foodSourcePheromone * amountRatio * dt, resource.radius + 20);
      }
    }

    for (var h = 0; h < world.hazards.length; h += 1) {
      var hazard = world.hazards[h];
      if (hazard.isAlive()) {
        this.depositDanger(
          hazard.x,
          hazard.y,
          this.settings.dangerSourcePheromone * hazard.alpha() * dt,
          hazard.radius + 24
        );
      }
    }
  };

  PheromoneField.prototype.processChannel = function (channelName, decayRate, diffusionRate, dt) {
    var source = channelName === "food" ? this.food : this.danger;
    var scratch = channelName === "food" ? this.foodScratch : this.dangerScratch;
    var decay = Math.exp(-decayRate * dt);
    var diffusion = Utils.clamp(diffusionRate * dt, 0, 0.18);
    var cols = this.cols;
    var rows = this.rows;

    for (var y = 0; y < rows; y += 1) {
      for (var x = 0; x < cols; x += 1) {
        var index = y * cols + x;
        var value = source[index];
        var neighbors = 0;
        var neighborTotal = 0;

        if (x > 0) {
          neighborTotal += source[index - 1];
          neighbors += 1;
        }
        if (x < cols - 1) {
          neighborTotal += source[index + 1];
          neighbors += 1;
        }
        if (y > 0) {
          neighborTotal += source[index - cols];
          neighbors += 1;
        }
        if (y < rows - 1) {
          neighborTotal += source[index + cols];
          neighbors += 1;
        }

        var neighborAverage = neighbors > 0 ? neighborTotal / neighbors : value;
        var next = value * decay + (neighborAverage - value) * diffusion;
        scratch[index] = next < 0.002 ? 0 : Utils.clamp(next, 0, 1);
      }
    }

    if (channelName === "food") {
      this.food = scratch;
      this.foodScratch = source;
    } else {
      this.danger = scratch;
      this.dangerScratch = source;
    }
  };

  PheromoneField.prototype.depositFood = function (x, y, amount, radius) {
    this.deposit(this.food, x, y, amount, radius);
  };

  PheromoneField.prototype.depositDanger = function (x, y, amount, radius) {
    this.deposit(this.danger, x, y, amount, radius);
  };

  PheromoneField.prototype.deposit = function (channel, x, y, amount, radius) {
    if (!this.settings.enablePheromones || amount <= 0 || channel.length === 0) {
      return;
    }

    var center = this.cellAt(x, y);
    var radiusCells = Math.max(1, Math.ceil((radius || this.cellSize) / this.cellSize));
    var radiusSq = radiusCells * radiusCells;

    for (var gy = center.y - radiusCells; gy <= center.y + radiusCells; gy += 1) {
      if (gy < 0 || gy >= this.rows) {
        continue;
      }

      for (var gx = center.x - radiusCells; gx <= center.x + radiusCells; gx += 1) {
        if (gx < 0 || gx >= this.cols) {
          continue;
        }

        var dx = gx - center.x;
        var dy = gy - center.y;
        var distanceSq = dx * dx + dy * dy;

        if (distanceSq > radiusSq) {
          continue;
        }

        var falloff = 1 - Math.sqrt(distanceSq) / (radiusCells + 0.001);
        var index = this.indexAtCell(gx, gy);
        channel[index] = Utils.clamp(channel[index] + amount * (0.22 + falloff * 0.78), 0, 1);
      }
    }
  };

  PheromoneField.prototype.sampleFood = function (x, y) {
    return this.sample(this.food, x, y);
  };

  PheromoneField.prototype.sampleDanger = function (x, y) {
    return this.sample(this.danger, x, y);
  };

  PheromoneField.prototype.sample = function (channel, x, y) {
    if (!this.settings.enablePheromones || channel.length === 0) {
      return 0;
    }

    var cell = this.cellAt(x, y);
    return channel[this.indexAtCell(cell.x, cell.y)];
  };

  PheromoneField.prototype.gradient = function (channelName, x, y) {
    if (!this.settings.enablePheromones) {
      return { x: 0, y: 0, strength: 0 };
    }

    var channel = channelName === "danger" ? this.danger : this.food;
    var step = this.cellSize * 1.35;
    var gx = this.sample(channel, x + step, y) - this.sample(channel, x - step, y);
    var gy = this.sample(channel, x, y + step) - this.sample(channel, x, y - step);
    var direction = Utils.normalize(gx, gy);

    return {
      x: direction.x,
      y: direction.y,
      strength: Utils.clamp(direction.length, 0, 1)
    };
  };

  PheromoneField.prototype.activeCounts = function () {
    var threshold = this.settings.pheromoneRenderThreshold;
    var food = 0;
    var danger = 0;
    var maxFood = 0;
    var maxDanger = 0;

    for (var i = 0; i < this.food.length; i += 1) {
      if (this.food[i] > threshold) {
        food += 1;
        maxFood = Math.max(maxFood, this.food[i]);
      }
      if (this.danger[i] > threshold) {
        danger += 1;
        maxDanger = Math.max(maxDanger, this.danger[i]);
      }
    }

    return {
      food: food,
      danger: danger,
      maxFood: maxFood,
      maxDanger: maxDanger
    };
  };

  window.AntFarm.PheromoneField = PheromoneField;
}());

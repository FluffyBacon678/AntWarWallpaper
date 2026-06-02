(function () {
  "use strict";

  window.AntFarm = window.AntFarm || {};

  var Utils = window.AntFarm.Utils;

  function Colony(id, name, color, x, y, settings) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.x = x;
    this.y = y;
    this.baseRadius = settings.baseRadius;
    this.maxHealth = settings.baseHealth;
    this.health = this.maxHealth;
    this.food = 38 + Math.random() * 18;
    this.digPoints = settings.initialDigPoints;
    this.maxDigPoints = settings.maxDigPoints;
    this.ants = [];
    this.chambers = [];
    this.alive = true;
    this.basePulse = Math.random() * Utils.TAU;
    this.spawnCooldown = Utils.randomRange(1.2, 3.2);
    this.chamberPlanCooldown = Utils.randomRange(1.5, 4.5);
    this.eventCooldown = 0;
    this.underAttackCooldown = 0;
    this.aggression = Utils.randomRange(0.18, 0.38);
  }

  Colony.prototype.seedAnts = function (world) {
    this.chambers.push({
      type: "queen",
      x: this.x,
      y: this.y,
      radius: world.settings.chamberDigRadius + 18,
      complete: true,
      progress: 1,
      targetProgress: 1,
      age: 0
    });

    for (var i = 0; i < world.settings.initialWorkers; i += 1) {
      this.spawnAnt(world, "worker", true);
    }

    for (var j = 0; j < world.settings.initialSoldiers; j += 1) {
      this.spawnAnt(world, "soldier", true);
    }
  };

  Colony.prototype.update = function (dt, world) {
    this.basePulse += dt;
    this.eventCooldown = Math.max(0, this.eventCooldown - dt);
    this.underAttackCooldown = Math.max(0, this.underAttackCooldown - dt);
    this.chamberPlanCooldown = Math.max(0, this.chamberPlanCooldown - dt);

    if (!this.alive) {
      return;
    }

    this.updateChambers(dt, world);
    this.generateDigPoints(dt, world);

    if (this.health < this.maxHealth && this.food > world.settings.baseRepairFoodThreshold) {
      var repair = Math.min(this.maxHealth - this.health, dt * 1.1);
      this.health += repair;
      this.food -= repair * 0.45;
    }

    this.spawnCooldown -= dt;
    if (this.spawnCooldown > 0) {
      return;
    }

    this.spawnCooldown = Utils.randomRange(1.45, 3.6) * this.spawnCooldownMultiplier(world);
    if (!world.canSpawnAnt(this)) {
      return;
    }

    var role = this.chooseSpawnRole(world);
    var cost = role === "soldier" ? world.settings.soldierSpawnCost : world.settings.workerSpawnCost;

    if (this.food >= cost && this.spawnAnt(world, role, false)) {
      this.food -= cost;
      if (this.eventCooldown <= 0 && Math.random() < 0.44) {
        world.addEvent(this.name + " Colony is growing", this.color);
        this.eventCooldown = 8;
      }
    }
  };

  Colony.prototype.generateDigPoints = function (dt, world) {
    var counts = this.countAnts();
    var digStores = this.countCompleteChambers("digStore");
    var granaries = this.countCompleteChambers("granary");
    var workerBonus = Math.min(1.35, counts.workers / 34);
    var foodBonus = Math.min(1.4, this.food / 120);
    var pressurePenalty = this.health < this.maxHealth * 0.45 ? 0.72 : 1;
    var chamberBonus = 1 + digStores * world.settings.digStoreRegenBoost + granaries * 0.06;
    var generated = world.settings.digPointRegenRate * (0.55 + workerBonus * 0.38 + foodBonus * 0.22) * pressurePenalty * chamberBonus * dt;

    this.maxDigPoints = world.settings.maxDigPoints + digStores * world.settings.digStoreCapacityBonus;

    this.addDigPoints(generated);
  };

  Colony.prototype.updateChambers = function (dt, world) {
    for (var i = 0; i < this.chambers.length; i += 1) {
      this.chambers[i].age += dt;
    }

    if (this.chamberPlanCooldown > 0 || this.pendingChamber()) {
      return;
    }

    var plan = this.chooseChamberPlan(world);
    if (!plan) {
      return;
    }

    this.food -= plan.foodCost;
    this.chambers.push({
      type: plan.type,
      x: plan.x,
      y: plan.y,
      radius: plan.radius,
      complete: false,
      progress: 0,
      targetProgress: plan.targetProgress,
      age: 0
    });
    this.chamberPlanCooldown = world.settings.chamberPlanCooldown + Utils.randomRange(1.5, 5.5);
    world.addEvent(this.name + " Colony planned a " + plan.label, this.color);
  };

  Colony.prototype.chooseChamberPlan = function (world) {
    var counts = this.countChambers();
    var type = null;
    var foodCost = 0;

    if ((counts.nursery || 0) < 1 && this.food >= 34) {
      type = "nursery";
      foodCost = 18;
    } else if ((counts.digStore || 0) < 1 && this.food >= 46) {
      type = "digStore";
      foodCost = 24;
    } else if ((counts.granary || 0) < 1 && this.food >= 58) {
      type = "granary";
      foodCost = 26;
    } else if ((counts.barracks || 0) < 1 && this.food >= 72) {
      type = "barracks";
      foodCost = 30;
    } else if ((counts.nursery || 0) < 2 && this.ants.length > 52 && this.food >= 82) {
      type = "nursery";
      foodCost = 34;
    } else if ((counts.digStore || 0) < 2 && this.digPoints < world.settings.maxDigPoints * 0.38 && this.food >= 92) {
      type = "digStore";
      foodCost = 36;
    } else if ((counts.barracks || 0) < 2 && this.ants.length > 74 && this.food >= 105) {
      type = "barracks";
      foodCost = 42;
    }

    if (!type) {
      return null;
    }

    var location = this.chooseChamberLocation(type, world);
    var radius = this.chamberRadius(type, world);
    var targetProgress = Math.max(8, Math.round(Math.pow(radius / world.terrain.cellSize, 2) * 0.8));

    return {
      type: type,
      label: this.chamberLabel(type),
      x: location.x,
      y: location.y,
      radius: radius,
      foodCost: foodCost,
      targetProgress: targetProgress
    };
  };

  Colony.prototype.chooseChamberLocation = function (type, world) {
    var side = this.id === 0 ? 1 : -1;
    var offsets = {
      nursery: { x: -side * 42, y: -76 },
      digStore: { x: -side * 58, y: 72 },
      granary: { x: side * 78, y: -28 },
      barracks: { x: side * 118, y: 34 }
    };
    var offset = offsets[type] || { x: side * 80, y: 0 };
    var jitterX = Utils.randomRange(-34, 34);
    var jitterY = Utils.randomRange(-28, 28);
    var minY = world.terrain.soilTopRow * world.terrain.cellSize + 32;

    return {
      x: Utils.clamp(this.x + offset.x + jitterX, 34, world.width - 34),
      y: Utils.clamp(this.y + offset.y + jitterY, minY, world.height - 34)
    };
  };

  Colony.prototype.chamberRadius = function (type, world) {
    if (type === "nursery") {
      return world.settings.chamberDigRadius * 0.88;
    }
    if (type === "digStore") {
      return world.settings.chamberDigRadius * 0.78;
    }
    if (type === "granary") {
      return world.settings.chamberDigRadius * 0.82;
    }
    if (type === "barracks") {
      return world.settings.chamberDigRadius * 0.9;
    }
    return world.settings.chamberDigRadius;
  };

  Colony.prototype.chamberLabel = function (type) {
    if (type === "nursery") {
      return "nursery";
    }
    if (type === "digStore") {
      return "dig store";
    }
    if (type === "granary") {
      return "granary";
    }
    if (type === "barracks") {
      return "barracks";
    }
    return "chamber";
  };

  Colony.prototype.pendingChamber = function () {
    for (var i = 0; i < this.chambers.length; i += 1) {
      if (!this.chambers[i].complete) {
        return this.chambers[i];
      }
    }

    return null;
  };

  Colony.prototype.findWorkChamber = function () {
    var best = null;
    var bestDistance = Infinity;

    for (var i = 0; i < this.chambers.length; i += 1) {
      var chamber = this.chambers[i];
      if (chamber.complete) {
        continue;
      }

      var distance = Utils.distSq(this.x, this.y, chamber.x, chamber.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = chamber;
      }
    }

    return best;
  };

  Colony.prototype.countChambers = function () {
    var counts = {};

    for (var i = 0; i < this.chambers.length; i += 1) {
      var chamber = this.chambers[i];
      if (!chamber.complete) {
        continue;
      }
      counts[chamber.type] = (counts[chamber.type] || 0) + 1;
    }

    return counts;
  };

  Colony.prototype.countCompleteChambers = function (type) {
    return this.countChambers()[type] || 0;
  };

  Colony.prototype.spawnCooldownMultiplier = function (world) {
    var nurseryCount = this.countCompleteChambers("nursery");
    return Math.max(0.52, 1 - nurseryCount * world.settings.nurserySpawnBoost);
  };

  Colony.prototype.foodToDigMultiplier = function (world) {
    return 1 + this.countCompleteChambers("granary") * world.settings.granaryDigConversionBoost;
  };

  Colony.prototype.damageMultiplier = function (world) {
    return 1 + this.countCompleteChambers("barracks") * world.settings.barracksDamageBoost;
  };

  Colony.prototype.addDigPoints = function (amount) {
    this.digPoints = Utils.clamp(this.digPoints + amount, 0, this.maxDigPoints);
  };

  Colony.prototype.spendDigPoints = function (amount) {
    if (amount <= 0) {
      return true;
    }

    if (this.digPoints < amount) {
      return false;
    }

    this.digPoints -= amount;
    return true;
  };

  Colony.prototype.chooseSpawnRole = function (world) {
    var counts = this.countAnts();
    var enemies = world.grid.query("ants", this.x, this.y, 190);
    var pressure = 0;

    for (var i = 0; i < enemies.length; i += 1) {
      if (enemies[i].alive && enemies[i].colony !== this) {
        pressure += enemies[i].role === "soldier" ? 2 : 1;
      }
    }

    if (counts.workers < 8) {
      return "worker";
    }

    if (pressure > Math.max(1, counts.soldiers * 0.5)) {
      return "soldier";
    }

    var barracksBoost = this.countCompleteChambers("barracks") * world.settings.barracksSoldierRatioBoost;
    if (counts.soldiers < counts.workers * (0.34 + barracksBoost) && this.food > world.settings.soldierSpawnCost + 3) {
      return "soldier";
    }

    return "worker";
  };

  Colony.prototype.spawnAnt = function (world, role, free) {
    if (!this.alive || !world.canSpawnAnt(this)) {
      return false;
    }

    if (!free) {
      var cost = role === "soldier" ? world.settings.soldierSpawnCost : world.settings.workerSpawnCost;
      if (this.food < cost) {
        return false;
      }
    }

    var angle = Math.random() * Utils.TAU;
    var distance = Utils.randomRange(this.baseRadius * 0.55, this.baseRadius + 12);
    var ant = new window.AntFarm.Ant(
      this,
      role,
      this.x + Math.cos(angle) * distance,
      this.y + Math.sin(angle) * distance,
      world.settings
    );
    this.ants.push(ant);
    return true;
  };

  Colony.prototype.countAnts = function () {
    var workers = 0;
    var soldiers = 0;

    for (var i = 0; i < this.ants.length; i += 1) {
      var ant = this.ants[i];
      if (!ant.alive) {
        continue;
      }

      if (ant.role === "soldier") {
        soldiers += 1;
      } else {
        workers += 1;
      }
    }

    return { workers: workers, soldiers: soldiers };
  };

  Colony.prototype.takeBaseDamage = function (amount, world, attackerColony) {
    if (!this.alive || !world.settings.enableCombat) {
      return;
    }

    this.health -= amount;

    if (this.underAttackCooldown <= 0) {
      world.addEvent(this.name + " Queen under attack", this.color);
      this.underAttackCooldown = 5.5;
    }

    if (this.health <= 0) {
      this.collapse(world, attackerColony);
    }
  };

  Colony.prototype.collapse = function (world, attackerColony) {
    if (!this.alive) {
      return;
    }

    this.alive = false;
    this.health = 0;
    world.particles.collapse(this.x, this.y, this.color);

    if (this.food > 2) {
      world.addResource(this.x + Utils.randomRange(-24, 24), this.y + Utils.randomRange(-24, 24), this.food * 0.45, false, false);
    }

    this.food = 0;
    this.digPoints = 0;
    for (var i = 0; i < this.chambers.length; i += 1) {
      this.chambers[i].complete = false;
    }
    var suffix = attackerColony ? " after " + attackerColony.name + " pressure" : "";
    world.addEvent(this.name + " Colony collapsed" + suffix, this.color);
  };

  window.AntFarm.Colony = Colony;
}());

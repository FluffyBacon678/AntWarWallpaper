(function () {
  "use strict";

  window.AntFarm = window.AntFarm || {};

  var Utils = window.AntFarm.Utils;
  var nextAntId = 1;

  function Ant(colony, role, x, y, settings) {
    this.id = nextAntId;
    nextAntId += 1;

    this.colony = colony;
    this.role = role;
    this.x = x;
    this.y = y;
    this.vx = Utils.randomRange(-8, 8);
    this.vy = Utils.randomRange(-8, 8);
    this.angle = Math.random() * Utils.TAU;
    this.state = role === "soldier" ? "patrol" : "wander";
    this.radius = role === "soldier" ? 3.6 : 2.7;
    this.maxHealth = role === "soldier" ? settings.soldierHealth : settings.workerHealth;
    this.health = this.maxHealth;
    this.carry = 0;
    this.dirtCarry = 0;
    this.cargoPhase = Math.random() * Utils.TAU;
    this.alive = true;
    this.targetResource = null;
    this.targetAnt = null;
    this.targetColony = null;
    this.patrolX = x;
    this.patrolY = y;
    this.patrolTimer = Utils.randomRange(0.2, 2.5);
    this.attackCooldown = Utils.randomRange(0, 0.45);
    this.wanderAngle = Math.random() * Utils.TAU;
    this.flash = 0;
    this.raiding = false;
    this.buildTarget = null;
    this.blockedTimer = 0;
    this.digCooldown = Utils.randomRange(0.15, 1.4);
    this.route = [];
    this.routeTargetX = null;
    this.routeTargetY = null;
    this.routeCooldown = Utils.randomRange(0, settings.routeRefreshInterval || 0.75);
    this.stuckCheckTimer = Utils.randomRange(0.2, 0.9);
    this.lastCheckX = x;
    this.lastCheckY = y;
    this.stuckScore = 0;
    this.unreachableAntId = null;
    this.unreachableAntTimer = 0;
    this.unreachableBaseId = null;
    this.unreachableBaseTimer = 0;
  }

  Ant.prototype.update = function (dt, world) {
    if (!this.alive) {
      return;
    }

    this.flash = Math.max(0, this.flash - dt * 4);
    this.dirtCarry = Math.max(0, this.dirtCarry - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.digCooldown = Math.max(0, this.digCooldown - dt);
    this.routeCooldown = Math.max(0, this.routeCooldown - dt);
    this.unreachableAntTimer = Math.max(0, this.unreachableAntTimer - dt);
    this.unreachableBaseTimer = Math.max(0, this.unreachableBaseTimer - dt);
    if (this.unreachableAntTimer <= 0) {
      this.unreachableAntId = null;
    }
    if (this.unreachableBaseTimer <= 0) {
      this.unreachableBaseId = null;
    }
    this.updateStuckMonitor(dt, world);

    if (!this.colony.alive) {
      this.updatePanic(dt, world);
      return;
    }

    if (this.role === "worker") {
      this.updateWorker(dt, world);
    } else {
      this.updateSoldier(dt, world);
    }

    this.keepInBounds(world);
  };

  Ant.prototype.updateWorker = function (dt, world) {
    if (world.settings.sideViewAntFarm) {
      this.updateSideWorker(dt, world);
      return;
    }

    var settings = world.settings;
    var enemy = this.findNearbyEnemySoldier(world, settings.workerEnemyFearRadius);

    if (enemy) {
      this.state = "fleeDanger";
      this.moveWithIntent(
        (this.x - enemy.x) * 1.4 + (this.colony.x - this.x) * 0.35,
        (this.y - enemy.y) * 1.4 + (this.colony.y - this.y) * 0.35,
        settings.workerSpeed * 1.16,
        dt,
        world,
        0.2
      );
      return;
    }

    if (this.carry > 0) {
      this.state = "returnHome";
      world.pheromones.depositFood(this.x, this.y, settings.foodTrailDeposit * dt, 22);
      this.moveWithIntent(this.colony.x - this.x, this.colony.y - this.y, settings.workerSpeed, dt, world, 0.12);

      if (Utils.distSq(this.x, this.y, this.colony.x, this.colony.y) < Math.pow(this.colony.baseRadius + 10, 2)) {
        this.colony.food += this.carry;
        world.particles.foodDeposit(this.x, this.y, this.colony.color);
        this.carry = 0;
      }

      return;
    }

    var priorityChamber = this.colony.findWorkChamber();
    if (priorityChamber && (this.id % 3 === 0 || this.colony.food > 95) && this.colony.digPoints > settings.digPointLowThreshold) {
      this.state = "buildChamber";
      if (Utils.distSq(this.x, this.y, priorityChamber.x, priorityChamber.y) < Math.pow(priorityChamber.radius + 12, 2)) {
        if (this.digCooldown <= 0) {
          var priorityBuilt = world.workOnChamber(priorityChamber, this.colony);
          this.digCooldown = priorityBuilt > 0 ? Utils.randomRange(0.55, 1.1) : Utils.randomRange(0.35, 0.8);
          if (priorityBuilt > 0) {
            this.dirtCarry = Utils.randomRange(0.65, 1.45);
          }
        }
      } else {
        this.moveWithIntent(priorityChamber.x - this.x, priorityChamber.y - this.y, settings.workerSpeed * 0.86, dt, world, 0.14);
      }
      return;
    }

    if (!this.targetResource || this.targetResource.isDepleted()) {
      this.targetResource = this.findNearestResource(world);
    }

    if (this.targetResource) {
      var resource = this.targetResource;
      var distanceSq = Utils.distSq(this.x, this.y, resource.x, resource.y);
      this.state = "seekFood";

      if (distanceSq < Math.pow(resource.radius + 5, 2)) {
        var taken = resource.take(settings.workerCarryAmount);
        if (taken > 0) {
          this.carry = taken;
          world.particles.foodPickup(this.x, this.y);
          this.targetResource = null;
        }
      } else {
        this.moveWithIntent(resource.x - this.x, resource.y - this.y, settings.workerSpeed, dt, world, 0.22);
      }

      return;
    }

    this.state = "wander";
    var trail = world.pheromones.gradient("food", this.x, this.y);
    if (trail.strength > 0.01) {
      this.state = "followTrail";
      this.moveWithIntent(
        Math.cos(this.wanderAngle) * 0.7 + trail.x * settings.workerPheromoneAttraction * trail.strength,
        Math.sin(this.wanderAngle) * 0.7 + trail.y * settings.workerPheromoneAttraction * trail.strength,
        settings.workerSpeed * 0.88,
        dt,
        world,
        0.32
      );
      return;
    }

    this.wander(dt, world, settings.workerSpeed * 0.82, this.colony.x, this.colony.y, Math.min(world.width, world.height) * 0.42);
  };

  Ant.prototype.updateSideWorker = function (dt, world) {
    var settings = world.settings;
    var enemy = this.findNearbyEnemySoldier(world, settings.workerEnemyFearRadius);

    if (enemy) {
      this.state = "fleeDanger";
      this.moveWithIntent(
        (this.x - enemy.x) * 1.4 + (this.colony.x - this.x) * 0.35,
        (this.y - enemy.y) * 1.25 + (this.colony.y - this.y) * 0.25,
        settings.workerSpeed * 1.08,
        dt,
        world,
        0.12
      );
      return;
    }

    if (this.carry > 0) {
      this.state = "returnHome";
      world.pheromones.depositFood(this.x, this.y, settings.foodTrailDeposit * dt, 22);
      this.moveTowardSideTarget(this.colony.x, this.colony.y, settings.workerSpeed * 0.94, dt, world, 0.08);

      if (Utils.distSq(this.x, this.y, this.colony.x, this.colony.y) < Math.pow(this.colony.baseRadius + 12, 2)) {
        this.colony.food += this.carry;
        this.colony.addDigPoints(this.carry * settings.foodToDigPointRate * this.colony.foodToDigMultiplier(world));
        this.carry = 0;
        this.buildTarget = null;
        var homeDug = world.tryDig(
          this.colony.x + Utils.randomRange(-22, 22),
          this.colony.y + Utils.randomRange(-30, 30),
          settings.chamberDigRadius * 0.52,
          this.colony
        );
        if (homeDug > 0) {
          this.dirtCarry = Utils.randomRange(0.55, 1.25);
        }
        world.particles.foodDeposit(this.x, this.y, this.colony.color);
      }
      return;
    }

    if (!this.targetResource || this.targetResource.isDepleted()) {
      this.targetResource = this.findNearestResource(world);
    }

    if (this.targetResource) {
      var resource = this.targetResource;
      var resourceSolid = world.terrain.isSolid(resource.x, resource.y);
      this.state = resourceSolid ? "digToFood" : "seekFood";

      if (Utils.distSq(this.x, this.y, resource.x, resource.y) < Math.pow(resource.radius + 7, 2)) {
        if (resourceSolid) {
          if (this.digCooldown <= 0) {
            var opened = world.tryDig(resource.x, resource.y, settings.caveDigRadius, this.colony);
            this.digCooldown = opened > 0 ? Utils.randomRange(0.55, 1.2) : Utils.randomRange(0.25, 0.55);
            if (opened > 0) {
              this.dirtCarry = Utils.randomRange(0.75, 1.65);
            }
          }

          if (world.terrain.isSolid(resource.x, resource.y)) {
            return;
          }
        }

        var taken = resource.take(settings.workerCarryAmount);
        if (taken > 0) {
          this.carry = taken;
          this.targetResource = null;
          world.particles.foodPickup(this.x, this.y);
        }
      } else {
        this.moveTowardSideTarget(resource.x, resource.y, settings.workerSpeed, dt, world, 0.12, {
          allowSolidGoal: resourceSolid
        });
      }
      return;
    }

    var workChamber = this.colony.findWorkChamber();
    if (workChamber && (this.colony.digPoints > settings.digPointLowThreshold || !world.terrain.isSolid(workChamber.x, workChamber.y))) {
      this.state = "buildChamber";
      if (Utils.distSq(this.x, this.y, workChamber.x, workChamber.y) < Math.pow(workChamber.radius + 12, 2)) {
        if (this.digCooldown <= 0) {
          var built = world.workOnChamber(workChamber, this.colony);
          this.digCooldown = built > 0 ? Utils.randomRange(0.55, 1.1) : Utils.randomRange(0.35, 0.8);
          if (built > 0) {
            this.dirtCarry = Utils.randomRange(0.65, 1.45);
          }
        }
      } else {
        this.moveTowardSideTarget(workChamber.x, workChamber.y, settings.workerSpeed * 0.86, dt, world, 0.14, {
          allowSolidGoal: world.terrain.isSolid(workChamber.x, workChamber.y)
        });
      }
      return;
    }

    if (!this.buildTarget || Utils.distSq(this.x, this.y, this.buildTarget.x, this.buildTarget.y) < Math.pow(this.buildTarget.radius + 12, 2)) {
      this.buildTarget = world.terrain.chooseExpansionTarget(this.colony, world);
    }

    if (this.buildTarget && this.colony.digPoints > settings.digPointLowThreshold && Math.random() < settings.buildExpansionRate) {
      this.state = "excavate";
      this.moveTowardSideTarget(
        this.buildTarget.x,
        this.buildTarget.y,
        settings.workerSpeed * 0.82,
        dt,
        world,
        0.18,
        { allowSolidGoal: true }
      );
      return;
    }

    var trail = world.pheromones.gradient("food", this.x, this.y);
    if (trail.strength > 0.012) {
      this.state = "followTrail";
      this.moveWithIntent(
        Math.cos(this.wanderAngle) * 0.55 + trail.x * settings.workerPheromoneAttraction * trail.strength,
        Math.sin(this.wanderAngle) * 0.55 + trail.y * settings.workerPheromoneAttraction * trail.strength,
        settings.workerSpeed * 0.8,
        dt,
        world,
        0.18
      );
      return;
    }

    this.state = "wander";
    this.wander(dt, world, settings.workerSpeed * 0.66, this.colony.x, this.colony.y, Math.min(world.width, world.height) * 0.28);
  };

  Ant.prototype.updateSoldier = function (dt, world) {
    if (world.settings.sideViewAntFarm) {
      this.updateSideSoldier(dt, world);
      return;
    }

    var settings = world.settings;

    if (!settings.enableCombat) {
      this.patrol(dt, world);
      return;
    }

    if (!this.targetAnt || !this.targetAnt.alive || this.targetAnt.colony === this.colony) {
      this.targetAnt = this.findEnemyNearOwnBase(world) || this.findNearestEnemyAnt(world, settings.soldierSenseRadius);
    }

    if (this.targetAnt) {
      this.state = "chaseEnemy";
      var antDistanceSq = Utils.distSq(this.x, this.y, this.targetAnt.x, this.targetAnt.y);

      if (antDistanceSq < Math.pow(settings.soldierAttackRange + this.targetAnt.radius, 2)) {
        this.tryAttackAnt(this.targetAnt, world);
        this.moveWithIntent(this.targetAnt.x - this.x, this.targetAnt.y - this.y, settings.soldierSpeed * 0.45, dt, world, 0.05);
      } else {
        this.moveWithIntent(this.targetAnt.x - this.x, this.targetAnt.y - this.y, settings.soldierSpeed * 1.08, dt, world, 0.1);
      }

      return;
    }

    var enemyBase = this.findEnemyBaseInRange(world, settings.baseAttackSense);
    if (enemyBase) {
      this.state = "attackBase";
      this.targetColony = enemyBase;
      this.attackBase(enemyBase, dt, world);
      return;
    }

    this.patrol(dt, world);
  };

  Ant.prototype.updateSideSoldier = function (dt, world) {
    var settings = world.settings;

    if (!settings.enableCombat) {
      this.patrol(dt, world);
      return;
    }

    if (!this.targetAnt || !this.targetAnt.alive || this.targetAnt.colony === this.colony) {
      this.targetAnt = this.findEnemyNearOwnBase(world) || this.findNearestEnemyAnt(world, settings.soldierSenseRadius + 110);
    }

    var breachedBase = world.nearestEnemyColony(this.colony);
    if (
      breachedBase &&
      !this.isBaseTemporarilyUnreachable(breachedBase) &&
      Utils.distSq(this.x, this.y, breachedBase.x, breachedBase.y) < 210 * 210
    ) {
      this.state = "attackBase";
      this.targetColony = breachedBase;
      if (this.attackBase(breachedBase, dt, world) !== false) {
        return;
      }
      this.markBaseUnreachable(breachedBase, world);
      this.targetColony = null;
    }

    if (this.targetAnt) {
      this.state = "raidEnemy";
      var targetDistanceSq = Utils.distSq(this.x, this.y, this.targetAnt.x, this.targetAnt.y);
      var canStrike = targetDistanceSq < Math.pow(settings.soldierAttackRange + this.targetAnt.radius + 2, 2) &&
        world.terrain.hasLineOfSight(this.x, this.y, this.targetAnt.x, this.targetAnt.y);
      var movedToEnemy = false;

      if (canStrike) {
        this.tryAttackAnt(this.targetAnt, world);
        movedToEnemy = this.moveTowardSideTarget(this.targetAnt.x, this.targetAnt.y, settings.soldierSpeed * 0.38, dt, world, 0.04, {
          requireCompleteRoute: true
        });
      } else {
        movedToEnemy = this.moveTowardSideTarget(this.targetAnt.x, this.targetAnt.y, settings.soldierSpeed * 0.95, dt, world, 0.08, {
          requireCompleteRoute: true
        });
      }

      if (!movedToEnemy) {
        this.markAntUnreachable(this.targetAnt, world);
        this.targetAnt = null;
        this.pickLocalTunnelPatrolPoint(world);
        this.patrol(dt, world);
      }
      return;
    }

    var enemyBase = this.findEnemyBaseInRange(world, settings.baseAttackSense + 120) || world.nearestEnemyColony(this.colony);
    if (enemyBase && this.isBaseTemporarilyUnreachable(enemyBase)) {
      enemyBase = null;
    }

    if (enemyBase) {
      var centerX = world.width * 0.5;
      var centerY = world.height * 0.58;
      var centerDistanceSq = Utils.distSq(this.x, this.y, centerX, centerY);
      var enemyDistanceSq = Utils.distSq(this.x, this.y, enemyBase.x, enemyBase.y);

      if (centerDistanceSq > 72 * 72 && enemyDistanceSq > 190 * 190) {
        this.state = "raidTunnel";
        if (!this.moveTowardSideTarget(centerX, centerY, settings.soldierSpeed * 0.78, dt, world, 0.07, {
          requireCompleteRoute: true
        })) {
          this.pickLocalTunnelPatrolPoint(world);
          this.patrol(dt, world);
        }
        return;
      }

      this.state = "attackBase";
      this.targetColony = enemyBase;
      if (this.attackBase(enemyBase, dt, world) === false) {
        this.markBaseUnreachable(enemyBase, world);
        this.targetColony = null;
        this.pickLocalTunnelPatrolPoint(world);
        this.patrol(dt, world);
      }
      return;
    }

    this.patrol(dt, world);
  };

  Ant.prototype.updatePanic = function (dt, world) {
    this.state = "panic";
    this.health -= dt * Utils.randomRange(1.2, 3.5);

    if (this.health <= 0) {
      this.die(world);
      return;
    }

    this.wander(dt, world, world.settings.workerSpeed * 1.08, this.x, this.y, 99999);
  };

  Ant.prototype.findNearestResource = function (world) {
    var settings = world.settings;
    var resources = world.grid.query("resources", this.x, this.y, settings.foodSenseRadius);
    var best = null;
    var bestScore = Infinity;

    for (var i = 0; i < resources.length; i += 1) {
      var resource = resources[i];
      if (resource.isDepleted()) {
        continue;
      }

      var distance = Utils.distSq(this.x, this.y, resource.x, resource.y);
      var score = distance - resource.amount * 18;

      if (score < bestScore) {
        bestScore = score;
        best = resource;
      }
    }

    return best;
  };

  Ant.prototype.findNearbyEnemySoldier = function (world, radius) {
    var ants = world.grid.query("ants", this.x, this.y, radius);
    var best = null;
    var bestDistance = Infinity;

    for (var i = 0; i < ants.length; i += 1) {
      var ant = ants[i];
      if (!ant.alive || ant.colony === this.colony || ant.role !== "soldier") {
        continue;
      }

      var distance = Utils.distSq(this.x, this.y, ant.x, ant.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = ant;
      }
    }

    return best;
  };

  Ant.prototype.findNearestEnemyAnt = function (world, radius) {
    var ants = world.grid.query("ants", this.x, this.y, radius);
    var best = null;
    var bestScore = Infinity;

    for (var i = 0; i < ants.length; i += 1) {
      var ant = ants[i];
      if (!ant.alive || ant.colony === this.colony || this.isAntTemporarilyUnreachable(ant)) {
        continue;
      }

      var distance = Utils.distSq(this.x, this.y, ant.x, ant.y);
      var score = distance;
      if (ant.role === "soldier") {
        score -= 1800;
      }

      if (score < bestScore) {
        bestScore = score;
        best = ant;
      }
    }

    return best;
  };

  Ant.prototype.findEnemyNearOwnBase = function (world) {
    var ants = world.grid.query("ants", this.colony.x, this.colony.y, 175);
    var best = null;
    var bestScore = Infinity;

    for (var i = 0; i < ants.length; i += 1) {
      var ant = ants[i];
      if (!ant.alive || ant.colony === this.colony || this.isAntTemporarilyUnreachable(ant)) {
        continue;
      }

      var distanceToBase = Utils.distSq(this.colony.x, this.colony.y, ant.x, ant.y);
      if (distanceToBase < bestScore) {
        bestScore = distanceToBase;
        best = ant;
      }
    }

    return best;
  };

  Ant.prototype.findEnemyBaseInRange = function (world, radius) {
    var colonies = world.grid.query("colonies", this.x, this.y, radius);
    var best = null;
    var bestDistance = Infinity;

    for (var i = 0; i < colonies.length; i += 1) {
      var colony = colonies[i];
      if (!colony.alive || colony === this.colony || this.isBaseTemporarilyUnreachable(colony)) {
        continue;
      }

      var distance = Utils.distSq(this.x, this.y, colony.x, colony.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = colony;
      }
    }

    return best;
  };

  Ant.prototype.isAntTemporarilyUnreachable = function (ant) {
    return Boolean(ant && this.unreachableAntTimer > 0 && this.unreachableAntId === ant.id);
  };

  Ant.prototype.isBaseTemporarilyUnreachable = function (colony) {
    return Boolean(colony && this.unreachableBaseTimer > 0 && this.unreachableBaseId === colony.id);
  };

  Ant.prototype.markAntUnreachable = function (ant, world) {
    if (!ant) {
      return;
    }

    this.unreachableAntId = ant.id;
    this.unreachableAntTimer = world.settings.soldierUnreachableRetry || 4.5;
    this.route.length = 0;
    this.routeCooldown = 0;
  };

  Ant.prototype.markBaseUnreachable = function (colony, world) {
    if (!colony) {
      return;
    }

    this.unreachableBaseId = colony.id;
    this.unreachableBaseTimer = world.settings.soldierUnreachableRetry || 4.5;
    this.route.length = 0;
    this.routeCooldown = 0;
  };

  Ant.prototype.tryAttackAnt = function (target, world) {
    if (this.attackCooldown > 0 || !target.alive) {
      return;
    }

    this.attackCooldown = Utils.randomRange(0.52, 0.82);
    target.takeDamage(world.settings.soldierDamage * this.colony.damageMultiplier(world), world);
    world.particles.hit(target.x, target.y);
  };

  Ant.prototype.attackBase = function (targetColony, dt, world) {
    var settings = world.settings;
    var dx = targetColony.x - this.x;
    var dy = targetColony.y - this.y;
    var distanceSq = dx * dx + dy * dy;
    var attackDistance = targetColony.baseRadius + settings.soldierAttackRange + 4;
    if (settings.sideViewAntFarm) {
      attackDistance = targetColony.baseRadius + 62;
    }

    if (distanceSq < attackDistance * attackDistance) {
      if (settings.sideViewAntFarm) {
        if (!this.moveTowardSideTarget(targetColony.x, targetColony.y, settings.soldierSpeed * 0.18, dt, world, 0.05, {
          requireCompleteRoute: true
        })) {
          return false;
        }
      } else {
        this.moveWithIntent(dx, dy, settings.soldierSpeed * 0.28, dt, world, 0.05);
      }

      if (this.attackCooldown <= 0) {
        this.attackCooldown = Utils.randomRange(0.62, 0.95);
        targetColony.takeBaseDamage(settings.soldierDamage * settings.baseAttackDamageScale * this.colony.damageMultiplier(world), world, this.colony);
        world.particles.hit(targetColony.x + Utils.randomRange(-10, 10), targetColony.y + Utils.randomRange(-10, 10));
      }
    } else {
      if (settings.sideViewAntFarm) {
        if (!this.moveTowardSideTarget(targetColony.x, targetColony.y, settings.soldierSpeed, dt, world, 0.08, {
          requireCompleteRoute: true
        })) {
          return false;
        }
      } else {
        this.moveWithIntent(dx, dy, settings.soldierSpeed, dt, world, 0.08);
      }
    }

    return true;
  };

  Ant.prototype.takeDamage = function (amount, world) {
    if (!this.alive) {
      return;
    }

    this.health -= amount;
    this.flash = 1;

    if (this.health <= 0) {
      this.die(world);
    }
  };

  Ant.prototype.die = function (world) {
    if (!this.alive) {
      return;
    }

    this.alive = false;
    if (this.carry > 0 && Math.random() < 0.45) {
      world.addResource(this.x, this.y, this.carry + Utils.randomRange(2, 7), false, false);
    }
    world.particles.death(this.x, this.y, this.colony.color);
  };

  Ant.prototype.patrol = function (dt, world) {
    this.state = "patrol";
    this.patrolTimer -= dt;

    var reached = Utils.distSq(this.x, this.y, this.patrolX, this.patrolY) < 28 * 28;
    if (this.patrolTimer <= 0 || reached) {
      this.pickPatrolPoint(world);
    }

    if (world.settings.sideViewAntFarm) {
      if (!this.moveTowardSideTarget(this.patrolX, this.patrolY, world.settings.soldierSpeed * 0.78, dt, world, 0.18, {
        requireCompleteRoute: this.role === "soldier"
      })) {
        this.pickLocalTunnelPatrolPoint(world);
        this.moveTowardSideTarget(this.patrolX, this.patrolY, world.settings.soldierSpeed * 0.72, dt, world, 0.14, {
          requireCompleteRoute: this.role === "soldier"
        });
      }
    } else {
      this.moveWithIntent(this.patrolX - this.x, this.patrolY - this.y, world.settings.soldierSpeed * 0.78, dt, world, 0.18);
    }
  };

  Ant.prototype.pickLocalTunnelPatrolPoint = function (world) {
    if (!world.settings.sideViewAntFarm || !world.terrain) {
      this.pickPatrolPoint(world);
      return;
    }

    var minY = world.terrain.soilTopRow * world.terrain.cellSize + 24;
    for (var attempt = 0; attempt < 18; attempt += 1) {
      var angle = Math.random() * Utils.TAU;
      var radius = Utils.randomRange(34, 125);
      var x = Utils.clamp(this.x + Math.cos(angle) * radius, 18, world.width - 18);
      var y = Utils.clamp(this.y + Math.sin(angle) * radius, minY, world.height - 18);
      var openCell = world.terrain.nearestPassableCell(x, y, 7);

      if (!openCell) {
        continue;
      }

      var route = world.terrain.findPath(
        this.x,
        this.y,
        openCell.wx,
        openCell.wy,
        world.settings.routeMaxVisitedCells,
        true
      );

      if (route.length > 0 || world.terrain.hasLineOfSight(this.x, this.y, openCell.wx, openCell.wy)) {
        this.patrolX = openCell.wx;
        this.patrolY = openCell.wy;
        this.patrolTimer = Utils.randomRange(1.4, 3.4);
        this.raiding = false;
        return;
      }
    }

    this.patrolX = this.x + Math.cos(this.wanderAngle) * 32;
    this.patrolY = this.y + Math.sin(this.wanderAngle) * 32;
    this.patrolX = Utils.clamp(this.patrolX, 18, world.width - 18);
    this.patrolY = Utils.clamp(this.patrolY, minY, world.height - 18);
    this.patrolTimer = Utils.randomRange(0.9, 1.8);
    this.raiding = false;
  };

  Ant.prototype.pickPatrolPoint = function (world) {
    if (world.settings.sideViewAntFarm && this.role === "soldier") {
      var enemy = world.nearestEnemyColony(this.colony);
      var centerX = world.width * 0.5;
      var centerY = world.height * 0.58;

      if (enemy && Math.random() < 0.42) {
        this.patrolX = Utils.lerp(centerX, enemy.x, Utils.randomRange(0.25, 0.72)) + Utils.randomRange(-34, 34);
        this.patrolY = Utils.lerp(centerY, enemy.y, Utils.randomRange(0.18, 0.52)) + Utils.randomRange(-26, 26);
        this.raiding = true;
      } else {
        this.patrolX = centerX + Utils.randomRange(-90, 90);
        this.patrolY = centerY + Utils.randomRange(-65, 80);
        this.raiding = false;
      }

      this.patrolX = Utils.clamp(this.patrolX, 18, world.width - 18);
      this.patrolY = Utils.clamp(this.patrolY, world.terrain.soilTopRow * world.terrain.cellSize + 24, world.height - 18);
      this.patrolTimer = Utils.randomRange(2.2, 5.5);
      return;
    }

    var settings = world.settings;
    var enemyColony = world.nearestEnemyColony(this.colony);
    var shouldRaid = enemyColony && Math.random() < this.colony.aggression + Math.min(0.18, this.colony.food / 420);

    this.raiding = Boolean(shouldRaid);

    if (shouldRaid) {
      var raidAngle = Utils.angleTo(this.colony.x, this.colony.y, enemyColony.x, enemyColony.y) + Utils.randomRange(-0.48, 0.48);
      var raidDistance = Utils.randomRange(0.55, 0.98) * Utils.dist(this.colony.x, this.colony.y, enemyColony.x, enemyColony.y);
      this.patrolX = this.colony.x + Math.cos(raidAngle) * raidDistance + Utils.randomRange(-42, 42);
      this.patrolY = this.colony.y + Math.sin(raidAngle) * raidDistance + Utils.randomRange(-42, 42);
      this.patrolTimer = Utils.randomRange(4.5, 8.5);
    } else {
      var angle = Math.random() * Utils.TAU;
      var radius = Utils.randomRange(48, 205);
      this.patrolX = this.colony.x + Math.cos(angle) * radius;
      this.patrolY = this.colony.y + Math.sin(angle) * radius;
      this.patrolTimer = Utils.randomRange(2.5, 6.5);
    }

    this.patrolX = Utils.clamp(this.patrolX, 18, world.width - 18);
    this.patrolY = Utils.clamp(this.patrolY, 18, world.height - 18);
  };

  Ant.prototype.wander = function (dt, world, speed, anchorX, anchorY, softRadius) {
    this.wanderAngle += Utils.randomRange(-1.65, 1.65) * dt;

    var dx = Math.cos(this.wanderAngle);
    var dy = Math.sin(this.wanderAngle);
    var fromAnchorX = this.x - anchorX;
    var fromAnchorY = this.y - anchorY;
    var fromAnchor = Math.sqrt(fromAnchorX * fromAnchorX + fromAnchorY * fromAnchorY);

    if (fromAnchor > softRadius) {
      dx += (anchorX - this.x) / Math.max(1, fromAnchor) * 2.4;
      dy += (anchorY - this.y) / Math.max(1, fromAnchor) * 2.4;
    }

    this.moveWithIntent(dx, dy, speed, dt, world, 0.5);
  };

  Ant.prototype.hazardAvoidance = function (dt, world) {
    var settings = world.settings;
    var hazardRadius = Math.max(settings.fireRadius, settings.rainSeepRadius || settings.fireRadius);
    var hazards = world.grid.query("hazards", this.x, this.y, settings.hazardAvoidRadius + hazardRadius + 20);
    var avoidX = 0;
    var avoidY = 0;

    for (var i = 0; i < hazards.length; i += 1) {
      var hazard = hazards[i];
      if (!hazard.isAlive()) {
        continue;
      }

      var dx = this.x - hazard.x;
      var dy = this.y - hazard.y;
      var distance = Math.sqrt(dx * dx + dy * dy) || 0.001;
      var inside = hazard.radius - distance;

      if (inside > 0) {
        this.takeDamage(hazard.damagePerSecond * dt, world);
      }

      var avoidDistance = hazard.radius + settings.hazardAvoidRadius;
      if (distance < avoidDistance) {
        var strength = Math.pow(1 - distance / avoidDistance, 2) * 4.8;
        avoidX += dx / distance * strength;
        avoidY += dy / distance * strength;
      }
    }

    var dangerTrail = world.pheromones.gradient("danger", this.x, this.y);
    if (dangerTrail.strength > 0.003) {
      avoidX -= dangerTrail.x * settings.dangerPheromoneRepel * dangerTrail.strength;
      avoidY -= dangerTrail.y * settings.dangerPheromoneRepel * dangerTrail.strength;
    }

    return { x: avoidX, y: avoidY };
  };

  Ant.prototype.moveTowardSideTarget = function (targetX, targetY, speed, dt, world, noise, options) {
    options = options || {};

    if (!world.settings.sideViewAntFarm || !world.terrain) {
      this.route.length = 0;
      this.moveWithIntent(targetX - this.x, targetY - this.y, speed, dt, world, noise);
      return true;
    }

    var terrain = world.terrain;
    var goalSolid = terrain.isSolid(targetX, targetY);
    var allowSolidGoal = Boolean(options.allowSolidGoal);
    var requireCompleteRoute = Boolean(options.requireCompleteRoute);
    var targetChanged = this.routeTargetX === null ||
      Utils.distSq(targetX, targetY, this.routeTargetX, this.routeTargetY) > 24 * 24;
    var distanceToGoalSq = Utils.distSq(this.x, this.y, targetX, targetY);

    if (!goalSolid && terrain.hasLineOfSight(this.x, this.y, targetX, targetY)) {
      this.route.length = 0;
      this.routeTargetX = targetX;
      this.routeTargetY = targetY;
      this.moveWithIntent(targetX - this.x, targetY - this.y, speed, dt, world, noise);
      return true;
    }

    if (
      targetChanged ||
      this.route.length === 0 ||
      this.routeCooldown <= 0 ||
      this.stuckScore > 1.6
    ) {
      this.route = terrain.findPath(
        this.x,
        this.y,
        targetX,
        targetY,
        world.settings.routeMaxVisitedCells,
        requireCompleteRoute
      );
      this.routeTargetX = targetX;
      this.routeTargetY = targetY;
      this.routeCooldown = world.settings.routeRefreshInterval * Utils.randomRange(0.72, 1.38);
    }

    while (this.route.length > 0) {
      var threshold = this.route.length === 1 ? 10 : 13;
      if (Utils.distSq(this.x, this.y, this.route[0].x, this.route[0].y) > threshold * threshold) {
        break;
      }
      this.route.shift();
    }

    if (this.route.length > 0) {
      var waypoint = this.route[0];
      if (!terrain.hasLineOfSight(this.x, this.y, waypoint.x, waypoint.y)) {
        this.route.length = 0;
        this.routeCooldown = 0;

        if (allowSolidGoal && goalSolid) {
          this.moveWithIntent(targetX - this.x, targetY - this.y, speed, dt, world, noise);
          return true;
        }

        if (requireCompleteRoute) {
          return false;
        } else {
          this.wanderAngle += Utils.randomRange(-1.1, 1.1) * dt;
          this.moveWithIntent(Math.cos(this.wanderAngle), Math.sin(this.wanderAngle), speed * 0.45, dt, world, noise + 0.18);
          return true;
        }
      }

      this.moveWithIntent(waypoint.x - this.x, waypoint.y - this.y, speed, dt, world, noise * 0.65);
      return true;
    }

    if (allowSolidGoal && goalSolid) {
      this.moveWithIntent(targetX - this.x, targetY - this.y, speed, dt, world, noise);
      return true;
    }

    if (requireCompleteRoute) {
      return false;
    }

    if (!goalSolid && distanceToGoalSq < 32 * 32) {
      this.moveWithIntent(targetX - this.x, targetY - this.y, speed, dt, world, noise);
      return true;
    }

    this.wanderAngle += Utils.randomRange(-0.9, 0.9) * dt;
    this.moveWithIntent(
      Math.cos(this.wanderAngle),
      Math.sin(this.wanderAngle),
      speed * 0.5,
      dt,
      world,
      noise + 0.16
    );
    return true;
  };

  Ant.prototype.updateStuckMonitor = function (dt, world) {
    if (!world.settings.sideViewAntFarm || !world.terrain) {
      return;
    }

    this.stuckCheckTimer -= dt;
    if (this.stuckCheckTimer > 0) {
      return;
    }

    var interval = world.settings.stuckCheckInterval || 0.9;
    this.stuckCheckTimer = Utils.randomRange(interval * 0.75, interval * 1.35);

    var moved = Utils.dist(this.x, this.y, this.lastCheckX, this.lastCheckY);
    this.lastCheckX = this.x;
    this.lastCheckY = this.y;

    var workingInPlace = this.role === "worker" &&
      (this.state === "buildChamber" || this.state === "digToFood") &&
      this.digCooldown > 0.05;

    if (this.state === "attackBase" || this.state === "panic" || workingInPlace) {
      this.stuckScore = Math.max(0, this.stuckScore - 0.35);
      return;
    }

    if (moved < (world.settings.stuckDistanceThreshold || 5.5)) {
      this.stuckScore += 1;
      this.route.length = 0;
      this.routeCooldown = 0;
      this.wanderAngle = Math.random() * Utils.TAU;
      this.vx *= 0.25;
      this.vy *= 0.25;

      if (this.role === "soldier" && this.stuckScore > 2) {
        this.targetAnt = null;
        this.targetColony = null;
        this.pickLocalTunnelPatrolPoint(world);
        this.stuckScore = 0.8;
      } else if (this.role === "worker" && this.stuckScore > 4) {
        this.targetResource = null;
        this.buildTarget = null;
        this.stuckScore = 1.4;
      }
    } else {
      this.stuckScore = Math.max(0, this.stuckScore - 0.55);
    }
  };

  Ant.prototype.moveWithIntent = function (dx, dy, speed, dt, world, noise) {
    var avoid = this.hazardAvoidance(dt, world);
    var edgePush = this.edgePush(world);

    dx += avoid.x + edgePush.x;
    dy += avoid.y + edgePush.y;

    if (noise > 0) {
      dx += Math.cos(this.wanderAngle + world.time * 0.7) * noise;
      dy += Math.sin(this.wanderAngle - world.time * 0.6) * noise;
    }

    var direction = Utils.normalize(dx, dy);
    if (direction.length <= 0) {
      direction.x = Math.cos(this.angle);
      direction.y = Math.sin(this.angle);
    }

    var turn = Utils.clamp(dt * 5.5, 0, 1);
    this.vx = Utils.lerp(this.vx, direction.x * speed, turn);
    this.vy = Utils.lerp(this.vy, direction.y * speed, turn);
    var nextX = this.x + this.vx * dt;
    var nextY = this.y + this.vy * dt;

    if (world.settings.sideViewAntFarm && world.terrain && world.terrain.isSolid(nextX, nextY)) {
      if (this.role === "worker") {
        var digRadius = this.state === "excavate" ? world.settings.chamberDigRadius * 0.42 : world.settings.caveDigRadius;
        var dug = 0;
        if (this.digCooldown <= 0) {
          dug = world.tryDig(nextX, nextY, digRadius, this.colony);
          this.digCooldown = dug > 0 ? Utils.randomRange(0.45, 1.05) : Utils.randomRange(0.25, 0.65);
          if (dug > 0) {
            this.dirtCarry = Utils.randomRange(0.75, 1.8);
          }
        }
        var progressScale = dug > 0 ? 0.38 : 0.02;
        nextX = this.x + this.vx * dt * progressScale;
        nextY = this.y + this.vy * dt * progressScale;

        if (world.terrain.isSolid(nextX, nextY)) {
          nextX = this.x;
          nextY = this.y;
          this.vx *= 0.12;
          this.vy *= 0.12;
          this.blockedTimer += dt;
        } else {
          this.blockedTimer = 0;
        }
      } else {
        var alternative = this.findSideViewPassage(world, dt);
        if (alternative) {
          nextX = alternative.x;
          nextY = alternative.y;
          this.vx = alternative.vx;
          this.vy = alternative.vy;
          this.blockedTimer = 0;
        } else {
          nextX = this.x;
          nextY = this.y;
          this.vx *= 0.2;
          this.vy *= 0.2;
          this.blockedTimer += dt;
        }

        if (this.blockedTimer > 2.4) {
          this.targetAnt = null;
          this.targetColony = null;
          this.pickPatrolPoint(world);
          this.blockedTimer = 0;
        }
      }
    } else {
      this.blockedTimer = 0;
    }

    this.x = nextX;
    this.y = nextY;

    if (world.settings.sideViewAntFarm && world.terrain) {
      world.terrain.recordTraffic(this.x, this.y, this.colony.id, this.role, dt);
    }

    if (Math.abs(this.vx) + Math.abs(this.vy) > 0.1) {
      this.angle = Math.atan2(this.vy, this.vx);
    }
  };

  Ant.prototype.findSideViewPassage = function (world, dt) {
    var speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed < 0.01) {
      return null;
    }

    var baseAngle = Math.atan2(this.vy, this.vx);
    var step = Math.max(world.terrain.cellSize * 0.85, speed * dt);
    var offsets = [0.45, -0.45, 0.85, -0.85, 1.35, -1.35, Math.PI];

    for (var i = 0; i < offsets.length; i += 1) {
      var angle = baseAngle + offsets[i];
      var vx = Math.cos(angle) * speed;
      var vy = Math.sin(angle) * speed;
      var x = this.x + Math.cos(angle) * step;
      var y = this.y + Math.sin(angle) * step;

      if (world.terrain.isPassable(x, y)) {
        return { x: x, y: y, vx: vx, vy: vy };
      }
    }

    return null;
  };

  Ant.prototype.edgePush = function (world) {
    var margin = 28;
    var x = 0;
    var y = 0;

    if (this.x < margin) {
      x += (margin - this.x) / margin * 3.5;
    } else if (this.x > world.width - margin) {
      x -= (this.x - (world.width - margin)) / margin * 3.5;
    }

    if (this.y < margin) {
      y += (margin - this.y) / margin * 3.5;
    } else if (this.y > world.height - margin) {
      y -= (this.y - (world.height - margin)) / margin * 3.5;
    }

    return { x: x, y: y };
  };

  Ant.prototype.keepInBounds = function (world) {
    if (this.x < 4 || this.x > world.width - 4) {
      this.vx *= -0.35;
    }
    if (this.y < 4 || this.y > world.height - 4) {
      this.vy *= -0.35;
    }

    this.x = Utils.clamp(this.x, 4, world.width - 4);
    this.y = Utils.clamp(this.y, 4, world.height - 4);
  };

  window.AntFarm.Ant = Ant;
}());

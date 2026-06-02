(function () {
  "use strict";

  window.AntFarm = window.AntFarm || {};

  var Utils = window.AntFarm.Utils;

  function ParticleSystem(settings) {
    this.settings = settings;
    this.particles = [];
  }

  ParticleSystem.prototype.add = function (particle) {
    if (!this.settings.showParticles) {
      return;
    }

    if (this.particles.length >= this.settings.particleCap) {
      this.particles.splice(0, this.particles.length - this.settings.particleCap + 1);
    }

    this.particles.push(particle);
  };

  ParticleSystem.prototype.burst = function (x, y, color, count, options) {
    options = options || {};
    var speedMin = options.speedMin || 8;
    var speedMax = options.speedMax || 42;
    var lifeMin = options.lifeMin || 0.25;
    var lifeMax = options.lifeMax || 0.9;
    var sizeMin = options.sizeMin || 1.2;
    var sizeMax = options.sizeMax || 3.8;

    for (var i = 0; i < count; i += 1) {
      var angle = Math.random() * Utils.TAU;
      var speed = Utils.randomRange(speedMin, speedMax);
      var life = Utils.randomRange(lifeMin, lifeMax);
      this.add({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: life,
        maxLife: life,
        size: Utils.randomRange(sizeMin, sizeMax),
        color: color,
        drag: options.drag || 0.92,
        glow: options.glow || 0
      });
    }
  };

  ParticleSystem.prototype.foodPickup = function (x, y) {
    this.burst(x, y, "#d9c75f", 3, {
      speedMin: 4,
      speedMax: 16,
      lifeMin: 0.18,
      lifeMax: 0.45,
      sizeMin: 0.9,
      sizeMax: 2.2
    });
  };

  ParticleSystem.prototype.foodDeposit = function (x, y, color) {
    this.burst(x, y, color || "#e6d882", 5, {
      speedMin: 8,
      speedMax: 28,
      lifeMin: 0.25,
      lifeMax: 0.65,
      sizeMin: 1,
      sizeMax: 2.8,
      glow: 8
    });
  };

  ParticleSystem.prototype.sparkle = function (x, y, color, count) {
    this.burst(x, y, color || "#e8d88a", count || 6, {
      speedMin: 2,
      speedMax: 22,
      lifeMin: 0.45,
      lifeMax: 1.1,
      sizeMin: 0.8,
      sizeMax: 2.2,
      drag: 0.96,
      glow: 14
    });
  };

  ParticleSystem.prototype.digDust = function (x, y, color, count) {
    this.burst(x, y, color || "#9a7448", count || 5, {
      speedMin: 2,
      speedMax: 20,
      lifeMin: 0.55,
      lifeMax: 1.25,
      sizeMin: 1,
      sizeMax: 3.4,
      drag: 0.9,
      glow: 0
    });
  };

  ParticleSystem.prototype.hit = function (x, y) {
    this.burst(x, y, "#ff7b52", 4, {
      speedMin: 12,
      speedMax: 40,
      lifeMin: 0.15,
      lifeMax: 0.35,
      sizeMin: 1,
      sizeMax: 2.5,
      glow: 6
    });
  };

  ParticleSystem.prototype.death = function (x, y, color) {
    this.burst(x, y, color, 8, {
      speedMin: 10,
      speedMax: 52,
      lifeMin: 0.35,
      lifeMax: 0.85,
      sizeMin: 1,
      sizeMax: 3.2,
      glow: 4
    });
  };

  ParticleSystem.prototype.fire = function (x, y) {
    this.burst(x, y, "#ff9a38", 1, {
      speedMin: 6,
      speedMax: 24,
      lifeMin: 0.25,
      lifeMax: 0.6,
      sizeMin: 1.6,
      sizeMax: 4.6,
      glow: 12
    });
  };

  ParticleSystem.prototype.water = function (x, y) {
    this.burst(x, y, "#83d8ff", 1, {
      speedMin: 2,
      speedMax: 14,
      lifeMin: 0.45,
      lifeMax: 1.1,
      sizeMin: 1,
      sizeMax: 3.2,
      drag: 0.94,
      glow: 10
    });
  };

  ParticleSystem.prototype.collapse = function (x, y, color) {
    this.burst(x, y, color, 42, {
      speedMin: 18,
      speedMax: 94,
      lifeMin: 0.65,
      lifeMax: 1.8,
      sizeMin: 1.4,
      sizeMax: 5.2,
      glow: 10
    });
  };

  ParticleSystem.prototype.update = function (dt) {
    for (var i = this.particles.length - 1; i >= 0; i -= 1) {
      var p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
    }
  };

  window.AntFarm.ParticleSystem = ParticleSystem;
}());

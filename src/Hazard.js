(function () {
  "use strict";

  window.AntFarm = window.AntFarm || {};

  function Hazard(x, y, settings, type) {
    this.type = type || "fire";
    this.x = x;
    this.y = y;
    this.sourceX = x;
    this.sourceY = y;
    this.radius = this.type === "water" ? settings.rainSeepRadius : settings.fireRadius;
    this.maxLifetime = this.type === "water" ? settings.rainSeepLifetime : settings.fireLifetime;
    this.lifetime = this.maxLifetime;
    this.damagePerSecond = this.type === "water" ? settings.rainSeepDamagePerSecond : settings.fireDamagePerSecond;
    this.phase = Math.random() * Math.PI * 2;
    this.flow = Math.random() * 0.4 + 0.65;
  }

  Hazard.prototype.update = function (dt) {
    this.lifetime -= dt;
  };

  Hazard.prototype.isAlive = function () {
    return this.lifetime > 0;
  };

  Hazard.prototype.alpha = function () {
    return Math.max(0, this.lifetime / this.maxLifetime);
  };

  window.AntFarm.Hazard = Hazard;
}());

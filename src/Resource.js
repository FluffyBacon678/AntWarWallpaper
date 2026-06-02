(function () {
  "use strict";

  window.AntFarm = window.AntFarm || {};

  var Utils = window.AntFarm.Utils;
  var nextResourceId = 1;

  function Resource(x, y, amount, userDropped) {
    this.id = nextResourceId;
    nextResourceId += 1;
    this.x = x;
    this.y = y;
    this.amount = amount;
    this.maxAmount = amount;
    this.userDropped = Boolean(userDropped);
    this.age = Math.random() * 10;
    this.radius = Utils.clamp(8 + Math.sqrt(amount) * 1.55, 12, 32);
    this.grains = [];

    var grainCount = Math.round(Utils.clamp(amount / 2.6, 7, 22));
    for (var i = 0; i < grainCount; i += 1) {
      var angle = Math.random() * Utils.TAU;
      var distance = this.radius * Math.sqrt(Math.random()) * 0.82;
      this.grains.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        size: Utils.randomRange(1.5, 3.6),
        phase: Math.random() * Utils.TAU
      });
    }
  }

  Resource.prototype.update = function (dt) {
    this.age += dt;
  };

  Resource.prototype.take = function (amount) {
    var taken = Math.min(this.amount, amount);
    this.amount -= taken;
    return taken;
  };

  Resource.prototype.isDepleted = function () {
    return this.amount <= 0.01;
  };

  window.AntFarm.Resource = Resource;
}());

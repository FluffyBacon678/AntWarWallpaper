(function () {
  "use strict";

  window.AntFarm = window.AntFarm || {};

  function UIOverlay(settings) {
    this.settings = settings;
    this.messages = [];
  }

  UIOverlay.prototype.push = function (text, color) {
    this.messages.unshift({
      text: text,
      color: color || "#e8e2c4",
      life: 5,
      maxLife: 5
    });

    if (this.messages.length > 7) {
      this.messages.length = 7;
    }
  };

  UIOverlay.prototype.update = function (dt) {
    for (var i = this.messages.length - 1; i >= 0; i -= 1) {
      this.messages[i].life -= dt;
      if (this.messages[i].life <= 0) {
        this.messages.splice(i, 1);
      }
    }
  };

  UIOverlay.prototype.draw = function (ctx, world) {
    if (!this.settings.showUI) {
      return;
    }

    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "12px Segoe UI, Arial, sans-serif";

    var x = 18;
    var y = 16;
    for (var i = this.messages.length - 1; i >= 0; i -= 1) {
      var message = this.messages[i];
      var alpha = Math.min(1, message.life / 0.7, message.life / message.maxLife + 0.15);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(3, 7, 6, 0.42)";
      var width = ctx.measureText(message.text).width + 18;
      ctx.fillRect(x - 8, y - 4, width, 22);
      ctx.fillStyle = message.color;
      ctx.fillText(message.text, x, y);
      y += 24;
    }

    if (this.settings.showStats) {
      this.drawStats(ctx, world);
    }

    ctx.restore();
  };

  UIOverlay.prototype.drawStats = function (ctx, world) {
    var lines = [];
    lines.push("Ants " + world.getTotalAnts() + "/" + world.settings.maxAnts + "  Food " + world.resources.length + "  Hazards " + world.hazards.length);

    for (var i = 0; i < world.colonies.length; i += 1) {
      var colony = world.colonies[i];
      var counts = colony.countAnts();
      var status = colony.alive ? Math.round(colony.health) + " hp" : "collapsed";
      var dig = Object.prototype.hasOwnProperty.call(colony, "digPoints") ? "  " + Math.floor(colony.digPoints) + " dig" : "";
      var chamberCounts = colony.countChambers ? colony.countChambers() : {};
      var chamberTotal = (chamberCounts.nursery || 0) + (chamberCounts.granary || 0) + (chamberCounts.digStore || 0) + (chamberCounts.barracks || 0);
      var pending = colony.pendingChamber && colony.pendingChamber() ? "+1" : "";
      lines.push(colony.name + " " + Math.floor(colony.food) + " food" + dig + "  " + counts.workers + "w/" + counts.soldiers + "s  ch " + chamberTotal + pending + "  " + status);
    }

    ctx.font = "11px Segoe UI, Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.globalAlpha = 0.74;

    var x = world.width - 18;
    var y = 16;
    var maxWidth = 0;
    for (var j = 0; j < lines.length; j += 1) {
      maxWidth = Math.max(maxWidth, ctx.measureText(lines[j]).width);
    }

    ctx.fillStyle = "rgba(3, 7, 6, 0.35)";
    ctx.fillRect(x - maxWidth - 12, y - 5, maxWidth + 20, lines.length * 16 + 8);

    for (var k = 0; k < lines.length; k += 1) {
      ctx.fillStyle = k === 0 ? "#d9ddcf" : world.colonies[k - 1].color;
      ctx.fillText(lines[k], x, y + k * 16);
    }
  };

  window.AntFarm.UIOverlay = UIOverlay;
}());

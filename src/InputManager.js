(function () {
  "use strict";

  window.AntFarm = window.AntFarm || {};

  function InputManager(canvas, world, ui, settings) {
    this.canvas = canvas;
    this.world = world;
    this.ui = ui;
    this.settings = settings;
    this.enabled = settings.enableInteraction;
    this.lastFireDropTime = 0;
    this.bind();
  }

  InputManager.prototype.bind = function () {
    var self = this;

    this.canvas.addEventListener("contextmenu", function (event) {
      event.preventDefault();
      if (self.enabled) {
        self.dropFire(self.canvasPoint(event));
      }
    });

    this.canvas.addEventListener("pointerdown", function (event) {
      self.handlePointerDown(event);
    });
  };

  InputManager.prototype.applySettings = function () {
    this.enabled = this.settings.enableInteraction;
  };

  InputManager.prototype.canvasPoint = function (event) {
    var rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / Math.max(1, rect.width) * this.world.width,
      y: (event.clientY - rect.top) / Math.max(1, rect.height) * this.world.height
    };
  };

  InputManager.prototype.handlePointerDown = function (event) {
    if (!this.enabled) {
      return;
    }

    var point = this.canvasPoint(event);

    if (event.button === 2) {
      event.preventDefault();
      this.dropFire(point);
      return;
    }

    if (event.button === 0) {
      this.world.addResource(point.x, point.y, this.settings.userFoodAmount, true, true);
      this.world.particles.foodDeposit(point.x, point.y, "#e4d474");
      return;
    }

    if (event.button === 1) {
      event.preventDefault();
    }
  };

  InputManager.prototype.dropFire = function (point) {
    var now = performance.now();
    if (now - this.lastFireDropTime < 120) {
      return;
    }

    this.lastFireDropTime = now;
    this.world.addHazard(point.x, point.y);
  };

  window.AntFarm.InputManager = InputManager;
}());

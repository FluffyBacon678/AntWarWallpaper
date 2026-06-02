(function () {
  "use strict";

  window.AntFarm = window.AntFarm || {};

  var Utils = window.AntFarm.Utils;

  function Renderer(canvas, ctx, settings) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.settings = settings;
    this.width = 0;
    this.height = 0;
    this.pattern = null;
    this.soilPattern = null;
    this.tunnelPattern = null;
    this.soilAssetImage = null;
    this.soilAssetPattern = null;
    this.soilAssetReady = false;
    this.ambientMotes = [];
    this.glassScratches = [];
    this.glassStreaks = [];
    this.condensationDrops = [];
    this.terrainLayer = null;
    this.terrainLayerCtx = null;
    this.terrainLayerVersion = -1;
    this.terrainLayerWidth = 0;
    this.terrainLayerHeight = 0;
    this.loadVisualAssets();
  }

  Renderer.prototype.resize = function (width, height) {
    this.width = width;
    this.height = height;
    this.pattern = this.createBackgroundPattern();
    this.soilPattern = this.createSoilPattern();
    this.tunnelPattern = this.createTunnelPattern();
    this.refreshSoilAssetPattern();
    this.ambientMotes = this.createAmbientMotes(width, height);
    this.glassScratches = this.createGlassScratches(width, height);
    this.glassStreaks = this.createGlassStreaks(width, height);
    this.condensationDrops = this.createCondensationDrops(width, height);
    this.terrainLayerVersion = -1;
    this.terrainLayerWidth = width;
    this.terrainLayerHeight = height;
    if (!this.terrainLayer) {
      this.terrainLayer = document.createElement("canvas");
      this.terrainLayerCtx = this.terrainLayer.getContext("2d");
    }
    this.terrainLayer.width = Math.ceil(width);
    this.terrainLayer.height = Math.ceil(height);
  };

  Renderer.prototype.invalidateTerrain = function () {
    this.terrainLayerVersion = -1;
  };

  Renderer.prototype.loadVisualAssets = function () {
    if (typeof Image === "undefined") {
      return;
    }

    var self = this;
    var image = new Image();

    image.onload = function () {
      self.soilAssetImage = image;
      self.soilAssetReady = true;
      self.refreshSoilAssetPattern();
      self.invalidateTerrain();
    };

    image.onerror = function () {
      self.soilAssetImage = null;
      self.soilAssetPattern = null;
      self.soilAssetReady = false;
    };

    this.soilAssetImage = image;
    image.src = "assets/soil-texture.png?v=sidefarm-23";
  };

  Renderer.prototype.refreshSoilAssetPattern = function () {
    if (
      !this.soilAssetImage ||
      !this.soilAssetImage.complete ||
      !this.soilAssetImage.naturalWidth ||
      !this.ctx ||
      !this.ctx.createPattern
    ) {
      return;
    }

    try {
      this.soilAssetPattern = this.ctx.createPattern(this.soilAssetImage, "repeat");
    } catch (error) {
      this.soilAssetPattern = null;
    }
  };

  Renderer.prototype.seeded = function (x, y, salt) {
    var value = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453;
    return value - Math.floor(value);
  };

  Renderer.prototype.createBackgroundPattern = function () {
    var texture = document.createElement("canvas");
    var size = 320;
    texture.width = size;
    texture.height = size;
    var ctx = texture.getContext("2d");

    ctx.fillStyle = "#07100c";
    ctx.fillRect(0, 0, size, size);

    for (var i = 0; i < 900; i += 1) {
      var x = Math.random() * size;
      var y = Math.random() * size;
      var shade = Math.random() < 0.55 ? "rgba(74, 91, 64, 0.09)" : "rgba(21, 37, 27, 0.16)";
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, Math.random() * 2.2 + 0.4, Math.random() * 2.2 + 0.4);
    }

    ctx.strokeStyle = "rgba(90, 105, 70, 0.055)";
    ctx.lineWidth = 1;
    for (var j = 0; j < 28; j += 1) {
      ctx.beginPath();
      var startX = Math.random() * size;
      var startY = Math.random() * size;
      ctx.moveTo(startX, startY);
      for (var k = 0; k < 5; k += 1) {
        startX += Utils.randomRange(-34, 34);
        startY += Utils.randomRange(-34, 34);
        ctx.lineTo(startX, startY);
      }
      ctx.stroke();
    }

    return this.ctx.createPattern(texture, "repeat");
  };

  Renderer.prototype.createSoilPattern = function () {
    var texture = document.createElement("canvas");
    var size = 256;
    texture.width = size;
    texture.height = size;
    var ctx = texture.getContext("2d");

    ctx.fillStyle = "#463525";
    ctx.fillRect(0, 0, size, size);

    for (var i = 0; i < 1500; i += 1) {
      var x = Math.random() * size;
      var y = Math.random() * size;
      var alpha = Utils.randomRange(0.035, 0.16);
      var warm = Math.random() < 0.55;
      ctx.fillStyle = warm
        ? "rgba(188, 143, 86, " + alpha + ")"
        : "rgba(38, 29, 21, " + (alpha * 1.2) + ")";
      ctx.fillRect(x, y, Utils.randomRange(0.8, 3.2), Utils.randomRange(0.8, 3.2));
    }

    for (var s = 0; s < 12; s += 1) {
      var sy = s * size / 12 + Utils.randomRange(-6, 6);
      ctx.strokeStyle = "rgba(221, 176, 104, 0.07)";
      ctx.lineWidth = Utils.randomRange(1, 2.5);
      ctx.beginPath();
      ctx.moveTo(0, sy);
      for (var px = 0; px <= size; px += 28) {
        ctx.lineTo(px, sy + Math.sin(px * 0.05 + s) * Utils.randomRange(2, 7));
      }
      ctx.stroke();
    }

    return this.ctx.createPattern(texture, "repeat");
  };

  Renderer.prototype.createTunnelPattern = function () {
    var texture = document.createElement("canvas");
    var size = 160;
    texture.width = size;
    texture.height = size;
    var ctx = texture.getContext("2d");

    ctx.fillStyle = "#050706";
    ctx.fillRect(0, 0, size, size);

    for (var i = 0; i < 320; i += 1) {
      var alpha = Utils.randomRange(0.02, 0.08);
      ctx.fillStyle = Math.random() < 0.5
        ? "rgba(116, 91, 57, " + alpha + ")"
        : "rgba(0, 0, 0, " + (alpha * 1.4) + ")";
      ctx.fillRect(Math.random() * size, Math.random() * size, Utils.randomRange(0.8, 2.4), Utils.randomRange(0.8, 2.4));
    }

    return this.ctx.createPattern(texture, "repeat");
  };

  Renderer.prototype.createAmbientMotes = function (width, height) {
    var count = this.settings.visualQuality === "low" ? 34 : 92;
    var motes = [];

    for (var i = 0; i < count; i += 1) {
      motes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Utils.randomRange(0.7, 2.6),
        speed: Utils.randomRange(3, 12),
        drift: Utils.randomRange(5, 22),
        phase: Math.random() * Utils.TAU,
        alpha: Utils.randomRange(0.05, 0.18)
      });
    }

    return motes;
  };

  Renderer.prototype.createGlassScratches = function (width, height) {
    var count = this.settings.visualQuality === "low" ? 8 : 22;
    var scratches = [];

    for (var i = 0; i < count; i += 1) {
      scratches.push({
        x: Utils.randomRange(18, Math.max(20, width - 18)),
        y: Utils.randomRange(18, Math.max(20, height - 18)),
        length: Utils.randomRange(28, 135),
        angle: Utils.randomRange(-0.22, 0.22),
        alpha: Utils.randomRange(0.025, 0.075)
      });
    }

    return scratches;
  };

  Renderer.prototype.createGlassStreaks = function (width, height) {
    var count = this.settings.visualQuality === "low" ? 8 : 24;
    var streaks = [];

    for (var i = 0; i < count; i += 1) {
      streaks.push({
        x: Utils.randomRange(14, Math.max(18, width - 14)),
        y: Utils.randomRange(-height * 0.2, height * 0.92),
        length: Utils.randomRange(44, 190),
        width: Utils.randomRange(0.7, 1.8),
        speed: Utils.randomRange(1.2, 5.8),
        alpha: Utils.randomRange(0.018, 0.065),
        phase: Math.random() * Utils.TAU
      });
    }

    return streaks;
  };

  Renderer.prototype.createCondensationDrops = function (width, height) {
    var count = this.settings.visualQuality === "low" ? 16 : 48;
    var drops = [];

    for (var i = 0; i < count; i += 1) {
      var edgeBias = Math.random();
      var nearEdge = edgeBias < 0.68;
      drops.push({
        x: nearEdge
          ? (Math.random() < 0.5 ? Utils.randomRange(10, 52) : Utils.randomRange(Math.max(10, width - 52), width - 10))
          : Utils.randomRange(18, Math.max(19, width - 18)),
        y: Utils.randomRange(18, Math.max(20, height - 18)),
        radius: Utils.randomRange(0.8, 2.9),
        alpha: Utils.randomRange(0.018, 0.082),
        phase: Math.random() * Utils.TAU
      });
    }

    return drops;
  };

  Renderer.prototype.render = function (world, ui) {
    var ctx = this.ctx;
    this.drawBackground(ctx, world);
    this.drawTerrain(ctx, world);
    this.drawParallaxDepth(ctx, world);
    this.drawTunnelWear(ctx, world);
    this.drawChambers(ctx, world);
    this.drawTerritory(ctx, world);
    this.drawPheromones(ctx, world);
    this.drawTunnelActivity(ctx, world);
    this.drawResources(ctx, world);
    this.drawHazards(ctx, world);
    this.drawBases(ctx, world);
    this.drawColonyBeacons(ctx, world);
    this.drawAnts(ctx, world);
    this.drawParticles(ctx, world);
    this.drawGlassOverlay(ctx, world);
    ui.draw(ctx, world);
  };

  Renderer.prototype.drawBackground = function (ctx, world) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = world.settings.sideViewAntFarm ? "#050909" : "#07100c";
    ctx.fillRect(0, 0, world.width, world.height);

    if (this.pattern) {
      ctx.fillStyle = this.pattern;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(0, 0, world.width, world.height);
    }

    var gradient = ctx.createRadialGradient(
      world.width * 0.5,
      world.height * 0.48,
      Math.min(world.width, world.height) * 0.1,
      world.width * 0.5,
      world.height * 0.5,
      Math.max(world.width, world.height) * 0.74
    );
    gradient.addColorStop(0, "rgba(34, 50, 34, 0.26)");
    gradient.addColorStop(0.65, "rgba(7, 12, 10, 0.05)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.55)");
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, world.width, world.height);

    ctx.restore();
  };

  Renderer.prototype.audioValue = function (world, channel) {
    if (!this.settings.enableAudioReactive || !world.audio) {
      return 0;
    }

    return Utils.clamp((world.audio[channel] || 0) * this.settings.audioSensitivity, 0, 1.35);
  };

  Renderer.prototype.drawParallaxDepth = function (ctx, world) {
    if (!world.settings.sideViewAntFarm || !world.terrain || this.settings.visualQuality === "low") {
      return;
    }

    var soilY = world.terrain.soilTopRow * world.terrain.cellSize;
    var audio = this.audioValue(world, "mid");

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, soilY, world.width, world.height - soilY);
    ctx.clip();
    ctx.globalCompositeOperation = "multiply";

    var bands = Math.max(5, Math.floor(world.width / 230));
    for (var i = 0; i < bands; i += 1) {
      var drift = Math.sin(world.time * 0.045 + i * 1.7) * 34;
      var x = (i + 0.18) * world.width / bands + drift - 90;
      var gradient = ctx.createLinearGradient(x - 120, soilY, x + 160, world.height);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(0.48, "rgba(0, 0, 0, " + (0.1 + audio * 0.035) + ")");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.68;
      ctx.beginPath();
      ctx.moveTo(x, soilY);
      ctx.lineTo(x + 150, soilY);
      ctx.lineTo(x + 62, world.height);
      ctx.lineTo(x - 128, world.height);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };

  Renderer.prototype.drawAmbientMotes = function (ctx, world) {
    if (!this.ambientMotes.length || this.settings.visualQuality === "low") {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (var i = 0; i < this.ambientMotes.length; i += 1) {
      var mote = this.ambientMotes[i];
      var x = mote.x + Math.sin(world.time * 0.38 + mote.phase) * mote.drift;
      var y = (mote.y - world.time * mote.speed) % (world.height + 40);
      if (y < -20) {
        y += world.height + 40;
      }

      ctx.globalAlpha = mote.alpha * (0.7 + Math.sin(world.time * 0.7 + mote.phase) * 0.3);
      ctx.fillStyle = i % 3 === 0 ? "#d3c780" : "#9fb6aa";
      ctx.beginPath();
      ctx.arc(x, y, mote.size, 0, Utils.TAU);
      ctx.fill();
    }

    ctx.restore();
  };

  Renderer.prototype.drawTerrain = function (ctx, world) {
    if (!world.settings.sideViewAntFarm || !world.terrain || world.terrain.solid.length === 0) {
      return;
    }

    if (
      !this.terrainLayer ||
      !this.terrainLayerCtx ||
      this.terrainLayer.width !== Math.ceil(world.width) ||
      this.terrainLayer.height !== Math.ceil(world.height)
    ) {
      this.terrainLayer = document.createElement("canvas");
      this.terrainLayerCtx = this.terrainLayer.getContext("2d");
      this.terrainLayer.width = Math.ceil(world.width);
      this.terrainLayer.height = Math.ceil(world.height);
      this.terrainLayerVersion = -1;
    }

    if (this.terrainLayerVersion !== world.terrain.version) {
      var dirty = world.terrain.consumeDirtyBounds();
      var fullRebuild = this.terrainLayerVersion < 0 || !dirty || dirty.full;

      if (!fullRebuild) {
        var dirtyCells = (dirty.maxX - dirty.minX + 1) * (dirty.maxY - dirty.minY + 1);
        var totalCells = Math.max(1, world.terrain.cols * world.terrain.rows);
        fullRebuild = dirtyCells / totalCells > 0.34;
      }

      if (fullRebuild) {
        this.terrainLayerCtx.clearRect(0, 0, this.terrainLayer.width, this.terrainLayer.height);
        this.renderTerrainLayer(this.terrainLayerCtx, world, null);
      } else {
        this.renderTerrainLayer(this.terrainLayerCtx, world, dirty);
      }

      this.terrainLayerVersion = world.terrain.version;
    }

    ctx.drawImage(this.terrainLayer, 0, 0, world.width, world.height);
  };

  Renderer.prototype.renderTerrainLayer = function (ctx, world, dirty) {
    if (!world.settings.sideViewAntFarm || !world.terrain || world.terrain.solid.length === 0) {
      return;
    }

    var terrain = world.terrain;
    var size = terrain.cellSize;
    var soilY = terrain.soilTopRow * size;
    var xStart = 0;
    var xEnd = terrain.cols - 1;
    var yStart = terrain.soilTopRow;
    var yEnd = terrain.rows - 1;

    ctx.save();

    if (dirty) {
      xStart = Utils.clamp(dirty.minX, 0, terrain.cols - 1);
      xEnd = Utils.clamp(dirty.maxX, 0, terrain.cols - 1);
      yStart = Utils.clamp(Math.max(terrain.soilTopRow, dirty.minY), terrain.soilTopRow, terrain.rows - 1);
      yEnd = Utils.clamp(dirty.maxY, terrain.soilTopRow, terrain.rows - 1);

      var dirtyX = xStart * size;
      var dirtyY = yStart * size;
      var dirtyW = Math.min(world.width - dirtyX, (xEnd - xStart + 1) * size);
      var dirtyH = Math.min(world.height - dirtyY, (yEnd - yStart + 1) * size);

      ctx.clearRect(dirtyX, dirtyY, dirtyW, dirtyH);
      ctx.beginPath();
      ctx.rect(dirtyX, dirtyY, dirtyW, dirtyH);
      ctx.clip();
    }

    var sky = ctx.createLinearGradient(0, 0, 0, soilY + 40);
    sky.addColorStop(0, "rgba(13, 24, 25, 0.92)");
    sky.addColorStop(0.55, "rgba(10, 15, 14, 0.98)");
    sky.addColorStop(1, "rgba(5, 7, 6, 1)");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, world.width, soilY + 40);
    this.drawSurfaceScene(ctx, world, soilY);

    var soilGradient = ctx.createLinearGradient(0, soilY, 0, world.height);
    soilGradient.addColorStop(0, "#735739");
    soilGradient.addColorStop(0.23, "#533c28");
    soilGradient.addColorStop(0.58, "#33281f");
    soilGradient.addColorStop(1, "#181614");
    ctx.fillStyle = soilGradient;
    ctx.fillRect(0, soilY, world.width, world.height - soilY);

    if (this.soilPattern) {
      ctx.globalAlpha = 0.58;
      ctx.fillStyle = this.soilPattern;
      ctx.fillRect(0, soilY, world.width, world.height - soilY);
      ctx.globalAlpha = 1;
    }

    this.drawSoilAssetOverlay(ctx, world, soilY);
    this.drawSoilStrata(ctx, world, soilY);

    for (var y = yStart; y <= yEnd; y += 1) {
      for (var x = xStart; x <= xEnd; x += 1) {
        var index = terrain.index(x, y);
        var px = x * size;
        var py = y * size;
        var noise = terrain.noise[index];

        if (terrain.solid[index]) {
          var depth = y / Math.max(1, terrain.rows - 1);
          var shade = Math.floor(31 + noise * 39 + depth * 23);
          var warm = Math.floor(24 + noise * 28 + depth * 6);
          var red = Utils.clamp(shade + 17, 25, 104);
          var green = Utils.clamp(warm + 20, 24, 86);
          var blue = Utils.clamp(warm + 6, 18, 58);
          var hasMaterialOverlay = this.soilAssetPattern && this.settings.visualQuality !== "low";
          ctx.fillStyle = "rgb(" + red + "," + green + "," + blue + ")";
          ctx.globalAlpha = hasMaterialOverlay ? 0.24 + noise * 0.07 : 0.54 + noise * 0.14;
          ctx.fillRect(px, py, size + 1, size + 1);

          var speckle = this.seeded(x, y, 2);
          if (noise > 0.62 || speckle > 0.86) {
            ctx.globalAlpha = 0.08 + speckle * 0.11;
            ctx.fillStyle = speckle > 0.91 ? "#a99663" : "#c1905d";
            ctx.fillRect(
              px + size * (0.16 + this.seeded(x, y, 3) * 0.55),
              py + size * (0.18 + this.seeded(x, y, 4) * 0.55),
              size * (0.12 + this.seeded(x, y, 5) * 0.32),
              size * (0.1 + this.seeded(x, y, 6) * 0.24)
            );
          }

          if (this.seeded(x, y, 8) > 0.975) {
            ctx.globalAlpha = 0.18;
            ctx.strokeStyle = "#2a2119";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px + size * 0.12, py + size * 0.72);
            ctx.quadraticCurveTo(px + size * 0.48, py + size * 0.18, px + size * 0.9, py + size * 0.36);
            ctx.stroke();
          }
        } else if (y >= terrain.soilTopRow) {
          var tunnelX = px + size * 0.5;
          var tunnelY = py + size * 0.5;

          ctx.globalAlpha = 0.96;
          ctx.fillStyle = "#040706";
          ctx.beginPath();
          ctx.arc(tunnelX, tunnelY, size * 0.82, 0, Utils.TAU);
          ctx.fill();

          var leftOpen = x > 0 && !terrain.solid[index - 1];
          var rightOpen = x < terrain.cols - 1 && !terrain.solid[index + 1];
          var topOpen = y > terrain.soilTopRow && !terrain.solid[index - terrain.cols];
          var bottomOpen = y < terrain.rows - 1 && !terrain.solid[index + terrain.cols];

          if (leftOpen || rightOpen) {
            ctx.fillRect(
              tunnelX - (leftOpen ? size * 0.56 : size * 0.16),
              tunnelY - size * 0.42,
              (leftOpen ? size * 0.56 : size * 0.16) + (rightOpen ? size * 0.56 : size * 0.16),
              size * 0.84
            );
          }

          if (topOpen || bottomOpen) {
            ctx.fillRect(
              tunnelX - size * 0.42,
              tunnelY - (topOpen ? size * 0.56 : size * 0.16),
              size * 0.84,
              (topOpen ? size * 0.56 : size * 0.16) + (bottomOpen ? size * 0.56 : size * 0.16)
            );
          }

          if (this.tunnelPattern) {
            ctx.globalAlpha = 0.24;
            ctx.fillStyle = this.tunnelPattern;
            ctx.beginPath();
            ctx.arc(tunnelX, tunnelY, size * 0.78, 0, Utils.TAU);
            ctx.fill();
          }

          var edgeCount = 0;
          var leftEdge = x > 0 && terrain.solid[index - 1];
          var rightEdge = x < terrain.cols - 1 && terrain.solid[index + 1];
          var topEdge = y > terrain.soilTopRow && terrain.solid[index - terrain.cols];
          var bottomEdge = y < terrain.rows - 1 && terrain.solid[index + terrain.cols];

          if (leftEdge) {
            edgeCount += 1;
          }
          if (rightEdge) {
            edgeCount += 1;
          }
          if (topEdge) {
            edgeCount += 1;
          }
          if (bottomEdge) {
            edgeCount += 1;
          }

          if (edgeCount > 0) {
            var centerX = px + size * 0.5;
            var centerY = py + size * 0.5;
            var wallDust = ctx.createRadialGradient(centerX, centerY, size * 0.08, centerX, centerY, size * 0.9);
            wallDust.addColorStop(0, "rgba(0, 0, 0, 0)");
            wallDust.addColorStop(0.55, "rgba(207, 153, 91, " + (0.022 + edgeCount * 0.014) + ")");
            wallDust.addColorStop(1, "rgba(2, 2, 2, " + (0.08 + edgeCount * 0.026) + ")");
            ctx.globalAlpha = 1;
            ctx.fillStyle = wallDust;
            ctx.beginPath();
            ctx.arc(centerX, centerY, size * 0.86, 0, Utils.TAU);
            ctx.fill();

            ctx.globalAlpha = 0.09 + edgeCount * 0.018;
            ctx.strokeStyle = "#d1a166";
            ctx.lineWidth = Math.max(0.8, size * 0.08);
            ctx.lineCap = "round";
            ctx.beginPath();
            var scrape = this.seeded(x, y, 17) * Utils.TAU;
            ctx.moveTo(centerX + Math.cos(scrape) * size * 0.18, centerY + Math.sin(scrape) * size * 0.18);
            ctx.quadraticCurveTo(
              centerX + Math.cos(scrape + 0.9) * size * 0.34,
              centerY + Math.sin(scrape + 0.9) * size * 0.34,
              centerX + Math.cos(scrape + 1.8) * size * 0.48,
              centerY + Math.sin(scrape + 1.8) * size * 0.48
            );
            ctx.stroke();
          }

          var ownerId = terrain.owner[index];
          if (ownerId >= 0 && world.colonies[ownerId]) {
            ctx.globalAlpha = 0.075;
            ctx.fillStyle = world.colonies[ownerId].color;
            ctx.beginPath();
            ctx.arc(tunnelX, tunnelY, size * 0.72, 0, Utils.TAU);
            ctx.fill();
          }
        }
      }
    }

    ctx.globalAlpha = 1;
    this.drawSurfaceRim(ctx, world, soilY);
    this.drawRoots(ctx, world, soilY);
    this.drawMineralFlecks(ctx, world, soilY);

    ctx.restore();
  };

  Renderer.prototype.drawSoilAssetOverlay = function (ctx, world, soilY) {
    if (!this.soilAssetPattern || this.settings.visualQuality === "low") {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.36;
    ctx.fillStyle = this.soilAssetPattern;
    ctx.fillRect(0, soilY, world.width, world.height - soilY);

    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.06;
    ctx.fillRect(0, soilY, world.width, world.height - soilY);
    ctx.restore();
  };

  Renderer.prototype.drawSurfaceScene = function (ctx, world, soilY) {
    ctx.save();

    var skyHeight = Math.min(28, Math.max(20, soilY * 0.42));
    var sky = ctx.createLinearGradient(0, 0, 0, skyHeight);
    sky.addColorStop(0, "rgba(57, 94, 113, 0.78)");
    sky.addColorStop(0.62, "rgba(45, 71, 75, 0.48)");
    sky.addColorStop(1, "rgba(19, 32, 29, 0.18)");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, world.width, skyHeight);

    ctx.globalAlpha = 0.58;
    ctx.fillStyle = "#22391f";
    ctx.fillRect(0, skyHeight - 5, world.width, 8);

    ctx.strokeStyle = "rgba(118, 151, 83, 0.72)";
    ctx.lineCap = "round";
    var bladeCount = Math.max(28, Math.floor(world.width / 15));
    for (var i = 0; i < bladeCount; i += 1) {
      var seed = this.seeded(i, 0, 104);
      var x = (i + seed * 0.8) * world.width / bladeCount;
      var h = 5 + this.seeded(i, 1, 105) * 13;
      var lean = (this.seeded(i, 2, 106) - 0.5) * 8;
      ctx.globalAlpha = 0.24 + this.seeded(i, 3, 107) * 0.34;
      ctx.lineWidth = 0.8 + this.seeded(i, 4, 108) * 0.9;
      ctx.beginPath();
      ctx.moveTo(x, skyHeight - 2);
      ctx.quadraticCurveTo(x + lean * 0.35, skyHeight - h * 0.6, x + lean, skyHeight - h);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.26;
    ctx.strokeStyle = "rgba(106, 134, 78, 0.54)";
    ctx.lineWidth = 1;
    for (var root = 0; root < Math.max(8, Math.floor(world.width / 120)); root += 1) {
      var rx = (root + this.seeded(root, 0, 109)) * world.width / Math.max(1, Math.floor(world.width / 120));
      ctx.beginPath();
      ctx.moveTo(rx, soilY - 2);
      ctx.quadraticCurveTo(
        rx + (this.seeded(root, 1, 110) - 0.5) * 30,
        soilY + 14,
        rx + (this.seeded(root, 2, 111) - 0.5) * 44,
        soilY + 36 + this.seeded(root, 3, 112) * 34
      );
      ctx.stroke();
    }

    ctx.restore();
  };

  Renderer.prototype.drawSoilStrata = function (ctx, world, soilY) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1;

    var bands = Math.max(6, Math.floor((world.height - soilY) / 42));
    for (var i = 0; i < bands; i += 1) {
      var y = soilY + 26 + i * (world.height - soilY) / bands;
      ctx.strokeStyle = i % 2 === 0 ? "rgba(229, 181, 106, 0.18)" : "rgba(25, 18, 14, 0.28)";
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (var x = 0; x <= world.width; x += 46) {
        ctx.lineTo(x, y + Math.sin(x * 0.014 + i * 1.7) * (4 + i * 0.18));
      }
      ctx.stroke();
    }

    ctx.restore();
  };

  Renderer.prototype.drawSurfaceRim = function (ctx, world, soilY) {
    ctx.save();

    var surface = ctx.createLinearGradient(0, soilY - 8, 0, soilY + 14);
    surface.addColorStop(0, "rgba(238, 215, 139, 0)");
    surface.addColorStop(0.42, "rgba(238, 215, 139, 0.34)");
    surface.addColorStop(1, "rgba(36, 22, 13, 0.45)");
    ctx.fillStyle = surface;
    ctx.fillRect(0, soilY - 8, world.width, 22);

    ctx.globalAlpha = 0.62;
    ctx.strokeStyle = "rgba(222, 194, 119, 0.34)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, soilY - 1);
    for (var x = 0; x <= world.width; x += 24) {
      ctx.lineTo(x, soilY - 1 + Math.sin(x * 0.05) * 1.6);
    }
    ctx.stroke();

    ctx.restore();
  };

  Renderer.prototype.drawMineralFlecks = function (ctx, world, soilY) {
    if (this.settings.visualQuality === "low" || !world.terrain) {
      return;
    }

    var terrain = world.terrain;
    var availableHeight = Math.max(1, world.height - soilY);
    var count = Utils.clamp(Math.floor(world.width * availableHeight / 24000), 18, 84);

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (var i = 0; i < count; i += 1) {
      var x = this.seeded(i, 1, 72) * world.width;
      var y = soilY + this.seeded(i, 2, 73) * availableHeight;
      var cellX = Math.floor(x / terrain.cellSize);
      var cellY = Math.floor(y / terrain.cellSize);

      if (
        cellX < 0 ||
        cellY < terrain.soilTopRow ||
        cellX >= terrain.cols ||
        cellY >= terrain.rows ||
        !terrain.solid[terrain.index(cellX, cellY)]
      ) {
        continue;
      }

      var size = 0.8 + this.seeded(i, 3, 74) * 2.8;
      var alpha = 0.08 + this.seeded(i, 4, 75) * 0.13;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.seeded(i, 5, 76) > 0.52 ? "#d7b66e" : "#9fbd9a";
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Utils.TAU);
      ctx.fill();

      if (this.seeded(i, 6, 77) > 0.78) {
        ctx.globalAlpha = alpha * 0.65;
        ctx.strokeStyle = "#f2d996";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - size * 2.2, y);
        ctx.lineTo(x + size * 2.2, y);
        ctx.moveTo(x, y - size * 2.2);
        ctx.lineTo(x, y + size * 2.2);
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  Renderer.prototype.drawRoots = function (ctx, world, soilY) {
    if (this.settings.visualQuality === "low") {
      return;
    }

    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.strokeStyle = "rgba(37, 30, 20, 0.72)";
    ctx.lineCap = "round";

    var rootCount = Math.max(10, Math.floor(world.width / 82));
    for (var i = 0; i < rootCount; i += 1) {
      var x = (i + 0.35 + this.seeded(i, 0, 22) * 0.5) * world.width / rootCount;
      var length = 34 + this.seeded(i, 2, 23) * 92;
      var sway = (this.seeded(i, 3, 24) - 0.5) * 52;
      ctx.lineWidth = 1 + this.seeded(i, 4, 25) * 1.8;
      ctx.beginPath();
      ctx.moveTo(x, soilY);
      ctx.bezierCurveTo(x + sway * 0.25, soilY + length * 0.28, x + sway, soilY + length * 0.62, x + sway * 0.45, soilY + length);
      ctx.stroke();

      if (this.seeded(i, 5, 26) > 0.46) {
        ctx.lineWidth *= 0.55;
        ctx.beginPath();
        ctx.moveTo(x + sway * 0.22, soilY + length * 0.45);
        ctx.quadraticCurveTo(x + sway * 0.55 + 18, soilY + length * 0.58, x + sway * 0.6 + 34, soilY + length * 0.7);
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  Renderer.prototype.drawChambers = function (ctx, world) {
    if (!world.settings.sideViewAntFarm) {
      return;
    }

    ctx.save();

    for (var c = 0; c < world.colonies.length; c += 1) {
      var colony = world.colonies[c];
      for (var i = 0; i < colony.chambers.length; i += 1) {
        var chamber = colony.chambers[i];
        this.drawChamber(ctx, world, colony, chamber);
      }
    }

    ctx.restore();
  };

  Renderer.prototype.drawChamber = function (ctx, world, colony, chamber) {
    var alpha = chamber.complete ? 0.78 : 0.34 + Math.sin(world.time * 5 + chamber.age) * 0.08;
    var color = colony.color;
    var radius = chamber.radius;
    var progress = chamber.complete ? 1 : Utils.clamp(chamber.progress / Math.max(1, chamber.targetProgress), 0, 1);

    ctx.save();
    ctx.translate(chamber.x, chamber.y);

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = chamber.complete ? 0.78 : 0.42;
    var floor = ctx.createRadialGradient(0, 0, radius * 0.12, 0, 0, radius * 1.22);
    floor.addColorStop(0, chamber.complete ? "rgba(24, 19, 13, 0.92)" : "rgba(32, 24, 17, 0.72)");
    floor.addColorStop(0.64, "rgba(10, 9, 8, 0.84)");
    floor.addColorStop(1, "rgba(1, 2, 2, 0)");
    ctx.fillStyle = floor;
    ctx.beginPath();
    ctx.arc(0, 0, radius * (chamber.complete ? 1.2 : 0.9 + progress * 0.3), 0, Utils.TAU);
    ctx.fill();

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * 0.24;
    ctx.fillStyle = Utils.colorWithAlpha(color, chamber.complete ? 0.42 : 0.22);
    ctx.beginPath();
    ctx.arc(0, 0, radius * (chamber.complete ? 1.35 : 0.96 + progress * 0.28), 0, Utils.TAU);
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = Utils.colorWithAlpha(color, chamber.complete ? 0.7 : 0.45);
    ctx.lineWidth = chamber.complete ? 1.7 : 1.1;
    if (!chamber.complete) {
      ctx.setLineDash([5, 4]);
    }
    ctx.beginPath();
    ctx.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + Utils.TAU * progress);
    ctx.stroke();
    ctx.setLineDash([]);

    if (chamber.complete) {
      ctx.globalAlpha = 0.24;
      ctx.strokeStyle = "rgba(223, 174, 103, 0.48)";
      ctx.lineWidth = 1;
      for (var rib = 0; rib < 7; rib += 1) {
        var angle = rib / 7 * Utils.TAU + chamber.age * 0.03;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * radius * 0.54, Math.sin(angle) * radius * 0.54);
        ctx.lineTo(Math.cos(angle) * radius * 0.92, Math.sin(angle) * radius * 0.92);
        ctx.stroke();
      }
    }

    if (!chamber.complete) {
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = "#d1a56d";
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2, radius * 0.18), 0, Utils.TAU);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (chamber.type === "nursery") {
      this.drawNurseryIcon(ctx, radius, color);
    } else if (chamber.type === "granary") {
      this.drawGranaryIcon(ctx, radius);
    } else if (chamber.type === "digStore") {
      this.drawDigStoreIcon(ctx, radius, color);
    } else if (chamber.type === "barracks") {
      this.drawBarracksIcon(ctx, radius, color);
    } else if (chamber.type === "queen") {
      ctx.globalCompositeOperation = "screen";
      var queenPulse = 0.5 + Math.sin(world.time * 2.8 + chamber.age) * 0.18;
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = Utils.colorWithAlpha(color, 0.36);
      ctx.beginPath();
      ctx.arc(0, 0, radius * (0.4 + queenPulse * 0.1), 0, Utils.TAU);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.68;
      ctx.strokeStyle = Utils.colorWithAlpha(color, 0.82);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.58, 0, Utils.TAU);
      ctx.stroke();
      ctx.fillStyle = "#f0ddaa";
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.14, radius * 0.24, Math.sin(world.time) * 0.18, 0, Utils.TAU);
      ctx.fill();
    }

    ctx.restore();
  };

  Renderer.prototype.drawNurseryIcon = function (ctx, radius, color) {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#efe6bc";
    for (var i = 0; i < 5; i += 1) {
      var angle = i / 5 * Utils.TAU;
      ctx.beginPath();
      ctx.ellipse(Math.cos(angle) * radius * 0.25, Math.sin(angle) * radius * 0.18, radius * 0.11, radius * 0.17, angle, 0, Utils.TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.42, 0, Utils.TAU);
    ctx.stroke();
  };

  Renderer.prototype.drawGranaryIcon = function (ctx, radius) {
    ctx.globalAlpha = 0.92;
    for (var i = 0; i < 7; i += 1) {
      var angle = i / 7 * Utils.TAU + 0.3;
      ctx.fillStyle = i % 2 ? "#d9c75f" : "#f0dd83";
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * radius * 0.28, Math.sin(angle) * radius * 0.22, radius * 0.085, 0, Utils.TAU);
      ctx.fill();
    }
  };

  Renderer.prototype.drawDigStoreIcon = function (ctx, radius, color) {
    ctx.globalAlpha = 0.84;
    ctx.fillStyle = Utils.colorWithAlpha(color, 0.75);
    for (var i = 0; i < 4; i += 1) {
      var angle = Math.PI / 4 + i * Math.PI / 2;
      ctx.save();
      ctx.translate(Math.cos(angle) * radius * 0.22, Math.sin(angle) * radius * 0.22);
      ctx.rotate(angle);
      ctx.fillRect(-radius * 0.08, -radius * 0.08, radius * 0.16, radius * 0.16);
      ctx.restore();
    }
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = "#d7c07c";
    ctx.beginPath();
    ctx.moveTo(-radius * 0.35, 0);
    ctx.lineTo(radius * 0.35, 0);
    ctx.moveTo(0, -radius * 0.28);
    ctx.lineTo(0, radius * 0.28);
    ctx.stroke();
  };

  Renderer.prototype.drawBarracksIcon = function (ctx, radius, color) {
    ctx.globalAlpha = 0.86;
    ctx.strokeStyle = Utils.colorWithAlpha(color, 0.85);
    ctx.lineWidth = 1.8;
    for (var i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * radius * 0.13, radius * 0.32);
      ctx.lineTo(i * radius * 0.18, -radius * 0.32);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * radius * 0.18, -radius * 0.32);
      ctx.lineTo(i * radius * 0.26, -radius * 0.18);
      ctx.lineTo(i * radius * 0.08, -radius * 0.2);
      ctx.closePath();
      ctx.fillStyle = Utils.colorWithAlpha(color, 0.7);
      ctx.fill();
    }
  };

  Renderer.prototype.drawTerritory = function (ctx, world) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (var i = 0; i < world.colonies.length; i += 1) {
      var colony = world.colonies[i];
      if (!colony.alive) {
        continue;
      }

      var radius = 135 + Math.sin(world.time * 1.2 + colony.id) * 8;
      var gradient = ctx.createRadialGradient(colony.x, colony.y, 10, colony.x, colony.y, radius);
      gradient.addColorStop(0, Utils.colorWithAlpha(colony.color, 0.19));
      gradient.addColorStop(0.52, Utils.colorWithAlpha(colony.color, 0.055));
      gradient.addColorStop(1, Utils.colorWithAlpha(colony.color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(colony.x, colony.y, radius, 0, Utils.TAU);
      ctx.fill();
    }

    ctx.restore();
  };

  Renderer.prototype.drawResources = function (ctx, world) {
    ctx.save();
    for (var i = 0; i < world.resources.length; i += 1) {
      var resource = world.resources[i];
      var amountRatio = Utils.clamp(resource.amount / resource.maxAmount, 0.12, 1);
      var pulse = Math.sin(world.time * 2 + resource.age) * 0.8;

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.beginPath();
      ctx.ellipse(resource.x, resource.y + resource.radius * 0.35, resource.radius * 0.85, resource.radius * 0.32, 0, 0, Utils.TAU);
      ctx.fill();

      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.2 * amountRatio;
      var glow = ctx.createRadialGradient(resource.x, resource.y, 2, resource.x, resource.y, resource.radius * 2.1 + pulse);
      glow.addColorStop(0, "rgba(255, 236, 128, 0.8)");
      glow.addColorStop(0.5, "rgba(209, 181, 74, 0.28)");
      glow.addColorStop(1, "rgba(209, 181, 74, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(resource.x, resource.y, resource.radius * 2 + pulse, 0, Utils.TAU);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.95;
      for (var g = 0; g < resource.grains.length; g += 1) {
        if (g / resource.grains.length > amountRatio) {
          continue;
        }
        var grain = resource.grains[g];
        var bob = Math.sin(world.time * 1.5 + grain.phase) * 0.45;
        var gx = resource.x + grain.x;
        var gy = resource.y + grain.y + bob;

        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(grain.phase);
        ctx.fillStyle = g % 3 === 0 ? "#efe08a" : "#cdb84e";
        ctx.beginPath();
        ctx.ellipse(0, 0, grain.size * (0.95 + amountRatio * 0.18), grain.size * 0.62, 0, 0, Utils.TAU);
        ctx.fill();

        ctx.globalAlpha = 0.28;
        ctx.fillStyle = "#fff4bf";
        ctx.beginPath();
        ctx.ellipse(-grain.size * 0.24, -grain.size * 0.2, grain.size * 0.28, grain.size * 0.16, 0, 0, Utils.TAU);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 0.95;
      }
    }
    ctx.restore();
  };

  Renderer.prototype.drawPheromones = function (ctx, world) {
    var field = world.pheromones;
    if (!this.settings.enablePheromones || !field || field.food.length === 0) {
      return;
    }

    var threshold = this.settings.pheromoneRenderThreshold;
    var size = field.cellSize;
    var centerOffset = size * 0.5;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (var y = 0; y < field.rows; y += 1) {
      for (var x = 0; x < field.cols; x += 1) {
        var index = y * field.cols + x;
        var px = x * size + centerOffset;
        var py = y * size + centerOffset;
        var food = field.food[index];
        var danger = field.danger[index];

        if (food > threshold) {
          ctx.globalAlpha = Math.min(0.07, Math.pow(food, 0.72) * 0.09);
          ctx.fillStyle = "#cfd46a";
          ctx.beginPath();
          ctx.arc(px, py, size * (0.48 + food * 0.55), 0, Utils.TAU);
          ctx.fill();
        }

        if (danger > threshold) {
          ctx.globalAlpha = Math.min(0.11, Math.pow(danger, 0.68) * 0.14);
          ctx.fillStyle = "#ff5a35";
          ctx.beginPath();
          ctx.arc(px, py, size * (0.58 + danger * 0.72), 0, Utils.TAU);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  };

  Renderer.prototype.drawTunnelActivity = function (ctx, world) {
    if (!world.settings.sideViewAntFarm || this.settings.visualQuality === "low") {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    var totalAnts = world.getTotalAnts();
    var routeSample = totalAnts > 180 ? 7 : totalAnts > 110 ? 5 : 3;

    for (var c = 0; c < world.colonies.length; c += 1) {
      var colony = world.colonies[c];
      for (var i = 0; i < colony.ants.length; i += 1) {
        var ant = colony.ants[i];
        if (!ant.alive) {
          continue;
        }

        if (ant.carry > 0) {
          ctx.globalAlpha = 0.13;
          ctx.strokeStyle = "#eadb77";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(ant.x, ant.y);
          ctx.lineTo(ant.x - Math.cos(ant.angle) * 18, ant.y - Math.sin(ant.angle) * 18);
          ctx.stroke();
        }

        if (!ant.route || ant.route.length === 0 || i % routeSample !== 0) {
          continue;
        }

        var waypoint = ant.route[0];
        var pulse = 0.5 + Math.sin(world.time * 4 + ant.id) * 0.5;
        ctx.globalAlpha = ant.role === "soldier" ? 0.08 + pulse * 0.05 : 0.055 + pulse * 0.035;
        ctx.strokeStyle = ant.role === "soldier" ? Utils.colorWithAlpha(colony.color, 0.8) : "rgba(218, 201, 104, 0.82)";
        ctx.lineWidth = ant.role === "soldier" ? 1.6 : 1.2;
        ctx.beginPath();
        ctx.moveTo(ant.x, ant.y);
        ctx.lineTo(waypoint.x, waypoint.y);
        ctx.stroke();

        ctx.globalAlpha *= 1.45;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(
          Utils.lerp(ant.x, waypoint.x, 0.45 + pulse * 0.28),
          Utils.lerp(ant.y, waypoint.y, 0.45 + pulse * 0.28),
          ant.role === "soldier" ? 1.8 : 1.25,
          0,
          Utils.TAU
        );
        ctx.fill();
      }
    }

    ctx.restore();
  };

  Renderer.prototype.drawTunnelWear = function (ctx, world) {
    var terrain = world.terrain;
    if (
      !world.settings.sideViewAntFarm ||
      this.settings.visualQuality === "low" ||
      !terrain ||
      !terrain.traffic ||
      terrain.traffic.length === 0
    ) {
      return;
    }

    var size = terrain.cellSize;
    var audio = this.audioValue(world, "bass");
    var conflictColor = world.colonies.length > 1
      ? Utils.mixColors(world.colonies[0].color, world.colonies[1].color, 0.5)
      : "#f2c36e";

    ctx.save();

    ctx.globalCompositeOperation = "screen";
    for (var y = terrain.soilTopRow; y < terrain.rows; y += 1) {
      for (var x = 0; x < terrain.cols; x += 1) {
        var index = terrain.index(x, y);
        if (terrain.solid[index]) {
          continue;
        }

        var wear = terrain.traffic[index];
        var conflict = terrain.trafficConflict[index];
        if (wear > 0.08) {
          var px = x * size;
          var py = y * size;
          var floorAlpha = Math.min(0.11, 0.025 + wear * 0.075);
          ctx.globalAlpha = floorAlpha;
          ctx.fillStyle = "#c99d62";
          ctx.fillRect(px + size * 0.08, py + size * 0.58, size * 0.84, Math.max(1, size * 0.18));

          if (wear > 0.34) {
            ctx.globalAlpha = Math.min(0.085, wear * 0.07);
            ctx.fillStyle = "#f1d58a";
            ctx.fillRect(px + size * 0.18, py + size * 0.72, size * 0.62, Math.max(1, size * 0.08));
          }
        }

        if (conflict > 0.035) {
          var pulse = 0.72 + Math.sin(world.time * 4.2 + x * 0.31 + y * 0.17) * 0.28;
          ctx.globalAlpha = Math.min(0.24, conflict * (0.12 + audio * 0.08) * pulse);
          ctx.fillStyle = Utils.colorWithAlpha(conflictColor, 0.9);
          ctx.beginPath();
          ctx.arc((x + 0.5) * size, (y + 0.5) * size, size * (0.55 + conflict * 0.45), 0, Utils.TAU);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  };

  Renderer.prototype.drawColonyBeacons = function (ctx, world) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (var i = 0; i < world.colonies.length; i += 1) {
      var colony = world.colonies[i];
      if (!colony.alive) {
        continue;
      }

      var intensity = Utils.clamp((colony.food + colony.digPoints) / 210, 0.25, 1);
      var pressure = colony.health < colony.maxHealth * 0.75 ? 1 - colony.health / colony.maxHealth : 0;
      var audio = this.audioValue(world, "bass");
      var radius = colony.baseRadius * (2.1 + intensity * 0.8 + pressure * 0.7 + audio * 0.22);
      var pulse = 0.72 + Math.sin(world.time * 1.5 + colony.basePulse) * 0.18 + audio * 0.18;

      var glow = ctx.createRadialGradient(colony.x, colony.y, colony.baseRadius * 0.4, colony.x, colony.y, radius);
      glow.addColorStop(0, Utils.colorWithAlpha(colony.color, (0.18 + audio * 0.08) * intensity * pulse));
      glow.addColorStop(0.58, Utils.colorWithAlpha(colony.color, 0.055 * intensity));
      glow.addColorStop(1, Utils.colorWithAlpha(colony.color, 0));
      ctx.fillStyle = glow;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(colony.x, colony.y, radius, 0, Utils.TAU);
      ctx.fill();

      if (pressure > 0) {
        ctx.strokeStyle = "rgba(255, 92, 58, " + (0.14 + pressure * 0.22) + ")";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 7]);
        ctx.beginPath();
        ctx.arc(colony.x, colony.y, colony.baseRadius * (1.9 + pressure * 0.7), world.time * 1.7, world.time * 1.7 + Utils.TAU * 0.78);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (colony.ants.length > 0) {
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = Utils.colorWithAlpha(colony.color, 0.8);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(colony.x, colony.y, colony.baseRadius * (1.45 + Math.sin(world.time * 2 + i) * 0.06), 0, Utils.TAU);
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  Renderer.prototype.drawHazards = function (ctx, world) {
    ctx.save();

    for (var i = 0; i < world.hazards.length; i += 1) {
      var hazard = world.hazards[i];
      if (hazard.type === "water") {
        this.drawWaterHazard(ctx, world, hazard);
        continue;
      }

      var alpha = hazard.alpha();
      var flicker = 1 + Math.sin(world.time * 13 + hazard.phase) * 0.055 + Math.sin(world.time * 23 + hazard.phase * 0.7) * 0.025;
      var radius = hazard.radius * flicker;

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.14 * alpha;
      ctx.fillStyle = "#1d1c19";
      for (var smoke = 0; smoke < 4; smoke += 1) {
        var smokeAngle = hazard.phase + smoke * 1.7;
        var smokeY = hazard.y - radius * (0.25 + smoke * 0.13) - Math.sin(world.time * 0.8 + smoke) * 8;
        ctx.beginPath();
        ctx.ellipse(
          hazard.x + Math.cos(smokeAngle) * radius * 0.18,
          smokeY,
          radius * (0.28 + smoke * 0.08),
          radius * (0.14 + smoke * 0.05),
          smokeAngle * 0.35,
          0,
          Utils.TAU
        );
        ctx.fill();
      }

      ctx.globalCompositeOperation = "lighter";
      var gradient = ctx.createRadialGradient(hazard.x, hazard.y, 0, hazard.x, hazard.y, radius);
      gradient.addColorStop(0, "rgba(255, 232, 122, " + (0.65 * alpha) + ")");
      gradient.addColorStop(0.28, "rgba(255, 111, 45, " + (0.44 * alpha) + ")");
      gradient.addColorStop(0.72, "rgba(164, 28, 24, " + (0.22 * alpha) + ")");
      gradient.addColorStop(1, "rgba(70, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, radius, 0, Utils.TAU);
      ctx.fill();

      for (var flame = 0; flame < 5; flame += 1) {
        var angle = flame / 5 * Utils.TAU + hazard.phase;
        var tongue = radius * (0.22 + flame * 0.035);
        var fx = hazard.x + Math.cos(angle) * radius * 0.12;
        var fy = hazard.y + Math.sin(angle) * radius * 0.1;
        ctx.fillStyle = flame % 2 ? "rgba(255, 178, 64, " + (0.34 * alpha) + ")" : "rgba(255, 244, 159, " + (0.28 * alpha) + ")";
        ctx.beginPath();
        ctx.ellipse(
          fx,
          fy - tongue * 0.25,
          tongue * 0.55,
          tongue,
          angle + Math.sin(world.time * 4 + flame) * 0.25,
          0,
          Utils.TAU
        );
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(255, 112, 54, " + (0.42 * alpha) + ")";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, radius * 0.68, 0, Utils.TAU);
      ctx.stroke();
    }

    ctx.restore();
  };

  Renderer.prototype.drawWaterHazard = function (ctx, world, hazard) {
    var alpha = hazard.alpha();
    var audio = this.audioValue(world, "treble");
    var sourceY = hazard.sourceY || (world.terrain ? world.terrain.soilTopRow * world.terrain.cellSize + 3 : hazard.y - 40);
    var sourceX = hazard.sourceX || hazard.x;
    var pulse = 0.68 + Math.sin(world.time * 3.2 + hazard.phase) * 0.18 + audio * 0.18;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    ctx.globalAlpha = 0.12 * alpha;
    ctx.strokeStyle = "#c8f6ff";
    ctx.lineWidth = 1.4 + audio * 0.9;
    ctx.beginPath();
    ctx.moveTo(sourceX, sourceY);
    var segments = 5;
    for (var i = 1; i <= segments; i += 1) {
      var t = i / segments;
      var wobble = Math.sin(world.time * 1.1 + hazard.phase + i * 1.9) * (4 + i * 0.8);
      ctx.lineTo(Utils.lerp(sourceX, hazard.x, t) + wobble, Utils.lerp(sourceY, hazard.y, t));
    }
    ctx.stroke();

    var radius = hazard.radius * (0.86 + pulse * 0.12);
    var seep = ctx.createRadialGradient(hazard.x, hazard.y, 0, hazard.x, hazard.y, radius);
    seep.addColorStop(0, "rgba(187, 245, 255, " + (0.25 * alpha) + ")");
    seep.addColorStop(0.35, "rgba(79, 174, 205, " + (0.18 * alpha) + ")");
    seep.addColorStop(1, "rgba(25, 73, 84, 0)");
    ctx.fillStyle = seep;
    ctx.beginPath();
    ctx.ellipse(hazard.x, hazard.y + radius * 0.12, radius * 0.95, radius * 0.62, Math.sin(hazard.phase) * 0.12, 0, Utils.TAU);
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.17 * alpha;
    ctx.fillStyle = "#07191d";
    ctx.beginPath();
    ctx.ellipse(hazard.x, hazard.y + radius * 0.2, radius * 0.78, radius * 0.32, 0, 0, Utils.TAU);
    ctx.fill();

    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = "rgba(164, 232, 255, " + (0.24 * alpha) + ")";
    ctx.lineWidth = 1;
    for (var ring = 0; ring < 3; ring += 1) {
      var ringPulse = (world.time * 0.42 + ring / 3 + hazard.phase) % 1;
      ctx.globalAlpha = alpha * (0.22 - ringPulse * 0.18) * (0.8 + audio * 0.35);
      ctx.beginPath();
      ctx.ellipse(
        hazard.x,
        hazard.y + radius * 0.16,
        radius * (0.2 + ringPulse * 0.72),
        radius * (0.08 + ringPulse * 0.26),
        0,
        0,
        Utils.TAU
      );
      ctx.stroke();
    }

    ctx.restore();
  };

  Renderer.prototype.drawBases = function (ctx, world) {
    ctx.save();

    for (var i = 0; i < world.colonies.length; i += 1) {
      var colony = world.colonies[i];
      var healthRatio = Utils.clamp(colony.health / colony.maxHealth, 0, 1);
      var foodRatio = Utils.clamp(colony.food / 140, 0, 1);
      var digRatio = Utils.clamp((colony.digPoints || 0) / Math.max(1, colony.maxDigPoints || world.settings.maxDigPoints), 0, 1);
      var pulse = Math.sin(world.time * 2.4 + colony.basePulse) * 2.5;
      var radius = colony.baseRadius + pulse;

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
      ctx.beginPath();
      ctx.ellipse(colony.x, colony.y + radius * 0.55, radius * 1.55, radius * 0.48, 0, 0, Utils.TAU);
      ctx.fill();

      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = colony.alive ? 0.95 : 0.28;
      var glow = ctx.createRadialGradient(colony.x, colony.y, 4, colony.x, colony.y, radius * 2.7);
      glow.addColorStop(0, Utils.colorWithAlpha(colony.color, 0.55));
      glow.addColorStop(0.55, Utils.colorWithAlpha(colony.color, 0.18));
      glow.addColorStop(1, Utils.colorWithAlpha(colony.color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(colony.x, colony.y, radius * 2.7, 0, Utils.TAU);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
      var shell = ctx.createRadialGradient(colony.x - radius * 0.26, colony.y - radius * 0.34, radius * 0.12, colony.x, colony.y, radius * 1.1);
      shell.addColorStop(0, colony.alive ? "#2c3325" : "#211513");
      shell.addColorStop(0.58, colony.alive ? "#111b14" : "#120b0b");
      shell.addColorStop(1, "#030504");
      ctx.fillStyle = shell;
      ctx.strokeStyle = colony.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(colony.x, colony.y, radius, 0, Utils.TAU);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(colony.x, colony.y, radius + 6, -Math.PI / 2, -Math.PI / 2 + Utils.TAU * healthRatio);
      ctx.stroke();

      ctx.strokeStyle = "rgba(226, 207, 98, 0.34)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(colony.x, colony.y, radius + 11, -Math.PI / 2, -Math.PI / 2 + Utils.TAU * foodRatio);
      ctx.stroke();

      ctx.strokeStyle = Utils.colorWithAlpha(colony.color, 0.46);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(colony.x, colony.y, radius + 15, Math.PI / 2, Math.PI / 2 + Utils.TAU * digRatio);
      ctx.stroke();

      ctx.globalAlpha = colony.alive ? 0.42 : 0.16;
      ctx.strokeStyle = Utils.colorWithAlpha(colony.color, 0.62);
      ctx.lineWidth = 1;
      for (var spoke = 0; spoke < 10; spoke += 1) {
        var angle = spoke / 10 * Utils.TAU + world.time * 0.22 * (colony.id ? -1 : 1);
        ctx.beginPath();
        ctx.moveTo(colony.x + Math.cos(angle) * radius * 0.52, colony.y + Math.sin(angle) * radius * 0.52);
        ctx.lineTo(colony.x + Math.cos(angle) * radius * 0.88, colony.y + Math.sin(angle) * radius * 0.88);
        ctx.stroke();
      }

      ctx.fillStyle = colony.color;
      ctx.globalAlpha = colony.alive ? 0.9 : 0.34;
      ctx.beginPath();
      ctx.arc(colony.x, colony.y, Math.max(5, radius * 0.35), 0, Utils.TAU);
      ctx.fill();

      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = colony.alive ? 0.52 : 0.16;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(colony.x - radius * 0.12, colony.y - radius * 0.16, Math.max(2, radius * 0.12), 0, Utils.TAU);
      ctx.fill();
    }

    ctx.restore();
  };

  Renderer.prototype.drawAnts = function (ctx, world) {
    ctx.save();

    for (var c = 0; c < world.colonies.length; c += 1) {
      var colony = world.colonies[c];
      for (var i = 0; i < colony.ants.length; i += 1) {
        var ant = colony.ants[i];
        if (!ant.alive) {
          continue;
        }

        var color = ant.flash > 0 ? "#ffe1be" : colony.color;
        ctx.save();

        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
        ctx.beginPath();
        ctx.ellipse(ant.x, ant.y + ant.radius * 0.8, ant.radius * 2.15, ant.radius * 0.72, ant.angle, 0, Utils.TAU);
        ctx.fill();

        ctx.translate(ant.x, ant.y);
        ctx.rotate(ant.angle);
        ctx.globalAlpha = colony.alive ? 0.94 : 0.42;

        var gait = Math.sin(world.time * (ant.role === "soldier" ? 8.5 : 11.5) + ant.id * 0.7);
        var legColor = ant.role === "soldier" ? Utils.colorWithAlpha(color, 0.72) : Utils.colorWithAlpha("#15120e", 0.66);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = legColor;
        ctx.lineWidth = ant.role === "soldier" ? 1.15 : 0.9;
        ctx.lineCap = "round";
        for (var leg = -1; leg <= 1; leg += 1) {
          var lx = leg * ant.radius * 0.72;
          var phase = leg === 0 ? -gait : gait;
          var reach = ant.radius * (1.65 + Math.abs(leg) * 0.22);
          ctx.beginPath();
          ctx.moveTo(lx, -ant.radius * 0.42);
          ctx.lineTo(lx - ant.radius * 0.25, -ant.radius * 1.0);
          ctx.lineTo(lx - ant.radius * 0.72 + phase * ant.radius * 0.28, -reach);
          ctx.moveTo(lx, ant.radius * 0.42);
          ctx.lineTo(lx - ant.radius * 0.25, ant.radius * 1.0);
          ctx.lineTo(lx - ant.radius * 0.72 - phase * ant.radius * 0.28, reach);
          ctx.stroke();
        }

        ctx.strokeStyle = Utils.colorWithAlpha(color, ant.role === "soldier" ? 0.84 : 0.64);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(ant.radius * 1.42, -ant.radius * 0.25);
        ctx.quadraticCurveTo(ant.radius * 2.2, -ant.radius * 0.9, ant.radius * 2.72, -ant.radius * 1.3);
        ctx.moveTo(ant.radius * 1.42, ant.radius * 0.25);
        ctx.quadraticCurveTo(ant.radius * 2.2, ant.radius * 0.9, ant.radius * 2.72, ant.radius * 1.3);
        ctx.stroke();

        if (ant.role === "soldier") {
          ctx.shadowColor = colony.color;
          ctx.shadowBlur = 7;
          ctx.fillStyle = "#070a08";
          ctx.strokeStyle = Utils.colorWithAlpha(color, 0.92);
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.ellipse(-ant.radius * 0.82, 0, ant.radius * 1.05, ant.radius * 0.92, 0, 0, Utils.TAU);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#0d120e";
          ctx.beginPath();
          ctx.ellipse(0.25, 0, ant.radius * 1.38, ant.radius * 1.08, 0, 0, Utils.TAU);
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(ant.radius * 1.4, 0, ant.radius * 0.82, 0, Utils.TAU);
          ctx.fillStyle = color;
          ctx.fill();

          ctx.globalAlpha *= 0.55;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(ant.radius * 1.58, -ant.radius * 0.18, ant.radius * 0.18, 0, Utils.TAU);
          ctx.fill();
        } else {
          ctx.shadowColor = colony.color;
          ctx.shadowBlur = 4;

          ctx.fillStyle = Utils.colorWithAlpha(color, 0.88);
          ctx.beginPath();
          ctx.ellipse(-ant.radius * 0.9, 0, ant.radius * 0.9, ant.radius * 0.82, 0, 0, Utils.TAU);
          ctx.fill();

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.ellipse(0.1, 0, ant.radius * 1.12, ant.radius * 0.92, 0, 0, Utils.TAU);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(ant.radius * 1.25, 0, ant.radius * 0.68, 0, Utils.TAU);
          ctx.fill();

          ctx.globalAlpha *= 0.38;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(ant.radius * 1.42, -ant.radius * 0.14, ant.radius * 0.13, 0, Utils.TAU);
          ctx.fill();
        }

        ctx.globalAlpha = colony.alive ? 0.94 : 0.42;
        this.drawAntCargo(ctx, world, ant, colony);

        ctx.restore();
      }
    }

    ctx.restore();
  };

  Renderer.prototype.drawAntCargo = function (ctx, world, ant, colony) {
    var hasFood = ant.carry > 0;
    var hasDirt = ant.dirtCarry > 0;
    if (!hasFood && !hasDirt) {
      return;
    }

    var bob = Math.sin(world.time * 8 + ant.cargoPhase) * ant.radius * 0.12;
    ctx.save();
    ctx.translate(ant.radius * 2.05, bob);

    if (hasDirt && !hasFood) {
      ctx.shadowBlur = 3;
      ctx.shadowColor = "#c08b55";
      ctx.fillStyle = "#8a6140";
      ctx.strokeStyle = "#d2a06a";
      ctx.lineWidth = 0.65;
      ctx.globalAlpha = Math.min(0.9, 0.38 + ant.dirtCarry * 0.44);
      ctx.beginPath();
      ctx.moveTo(-1.8, -1.2);
      ctx.lineTo(1.9, -1.6);
      ctx.lineTo(2.5, 0.8);
      ctx.lineTo(0.2, 2.1);
      ctx.lineTo(-2.2, 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (hasFood) {
      ctx.shadowBlur = 5;
      ctx.shadowColor = "#f5dd6b";
      for (var i = 0; i < 3; i += 1) {
        var angle = ant.cargoPhase + i * 2.1;
        var x = Math.cos(angle) * ant.radius * 0.34;
        var y = Math.sin(angle) * ant.radius * 0.28;
        ctx.globalAlpha = 0.82;
        ctx.fillStyle = i === 1 ? "#fff0a5" : "#efd96d";
        ctx.beginPath();
        ctx.ellipse(x, y, 1.55, 1.05, angle, 0, Utils.TAU);
        ctx.fill();
      }
    }

    if (hasDirt) {
      ctx.globalAlpha = Math.min(0.45, ant.dirtCarry * 0.22);
      ctx.fillStyle = "#9b714a";
      ctx.beginPath();
      ctx.arc(-ant.radius * 0.9, ant.radius * 0.52, 1.35, 0, Utils.TAU);
      ctx.fill();
    }

    ctx.restore();
  };

  Renderer.prototype.drawParticles = function (ctx, world) {
    if (!this.settings.showParticles) {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (var i = 0; i < world.particles.particles.length; i += 1) {
      var p = world.particles.particles[i];
      var alpha = Utils.clamp(p.life / p.maxLife, 0, 1);
      var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);

      if (speed > 8) {
        ctx.globalAlpha = alpha * 0.26;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.6, p.size * 0.42);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045);
        ctx.stroke();
      }

      ctx.globalAlpha = alpha;
      ctx.shadowBlur = p.glow || 0;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.55 + alpha * 0.55), 0, Utils.TAU);
      ctx.fill();
    }

    ctx.restore();
  };

  Renderer.prototype.drawGlassOverlay = function (ctx, world) {
    ctx.save();

    this.drawAmbientMotes(ctx, world);
    this.drawGlassPolish(ctx, world);
    var audio = this.audioValue(world, "level");

    var vignette = ctx.createRadialGradient(
      world.width * 0.5,
      world.height * 0.5,
      Math.min(world.width, world.height) * 0.22,
      world.width * 0.5,
      world.height * 0.5,
      Math.max(world.width, world.height) * 0.78
    );
    vignette.addColorStop(0, "rgba(255, 255, 255, 0)");
    vignette.addColorStop(0.72, "rgba(0, 0, 0, 0.08)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.42)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, world.width, world.height);

    ctx.globalCompositeOperation = "screen";
    var sweep = (world.time * 18) % (world.width + 220) - 110;
    var glare = ctx.createLinearGradient(sweep - 90, 0, sweep + 90, 0);
    glare.addColorStop(0, "rgba(255,255,255,0)");
    glare.addColorStop(0.48, "rgba(220,245,255," + (0.055 + audio * 0.035) + ")");
    glare.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glare;
    ctx.fillRect(0, 0, world.width, world.height);

    var sideGlare = ctx.createLinearGradient(0, 0, world.width, 0);
    sideGlare.addColorStop(0, "rgba(210, 246, 243, 0.11)");
    sideGlare.addColorStop(0.08, "rgba(210, 246, 243, 0.015)");
    sideGlare.addColorStop(0.5, "rgba(255, 255, 255, 0)");
    sideGlare.addColorStop(0.92, "rgba(210, 246, 243, 0.015)");
    sideGlare.addColorStop(1, "rgba(210, 246, 243, 0.1)");
    ctx.fillStyle = sideGlare;
    ctx.fillRect(0, 0, world.width, world.height);

    ctx.globalCompositeOperation = "source-over";
    for (var i = 0; i < this.glassScratches.length; i += 1) {
      var scratch = this.glassScratches[i];
      ctx.save();
      ctx.translate(scratch.x, scratch.y);
      ctx.rotate(scratch.angle);
      ctx.globalAlpha = scratch.alpha;
      ctx.strokeStyle = "#d8fffb";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-scratch.length * 0.5, 0);
      ctx.lineTo(scratch.length * 0.5, Math.sin(world.time * 0.25 + i) * 1.5);
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(179, 224, 220, 0.26)";
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, world.width - 16, world.height - 16);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, world.width - 32, world.height - 32);

    ctx.restore();
  };

  Renderer.prototype.drawGlassPolish = function (ctx, world) {
    if (!this.settings.glassPolish || this.settings.visualQuality === "low") {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (var i = 0; i < this.glassStreaks.length; i += 1) {
      var streak = this.glassStreaks[i];
      var y = (streak.y + world.time * streak.speed) % (world.height + streak.length + 40) - streak.length;
      var bend = Math.sin(world.time * 0.24 + streak.phase) * 3.5;
      var gradient = ctx.createLinearGradient(streak.x, y, streak.x + bend, y + streak.length);
      gradient.addColorStop(0, "rgba(219, 251, 255, 0)");
      gradient.addColorStop(0.18, "rgba(219, 251, 255, " + streak.alpha + ")");
      gradient.addColorStop(0.72, "rgba(167, 221, 224, " + (streak.alpha * 0.62) + ")");
      gradient.addColorStop(1, "rgba(219, 251, 255, 0)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = streak.width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(streak.x, y);
      ctx.bezierCurveTo(streak.x + bend, y + streak.length * 0.24, streak.x - bend * 0.6, y + streak.length * 0.68, streak.x + bend * 0.35, y + streak.length);
      ctx.stroke();
    }

    for (var d = 0; d < this.condensationDrops.length; d += 1) {
      var drop = this.condensationDrops[d];
      var pulse = 0.75 + Math.sin(world.time * 0.7 + drop.phase) * 0.25;
      ctx.globalAlpha = drop.alpha * pulse;
      ctx.fillStyle = "#dffcff";
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.radius, 0, Utils.TAU);
      ctx.fill();

      ctx.globalAlpha = drop.alpha * 0.7;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(drop.x - drop.radius * 0.22, drop.y - drop.radius * 0.22, drop.radius * 0.45, 0, Utils.TAU);
      ctx.stroke();
    }

    var edgeMist = ctx.createLinearGradient(0, 0, world.width, 0);
    edgeMist.addColorStop(0, "rgba(219, 252, 249, 0.08)");
    edgeMist.addColorStop(0.045, "rgba(219, 252, 249, 0.018)");
    edgeMist.addColorStop(0.5, "rgba(219, 252, 249, 0)");
    edgeMist.addColorStop(0.955, "rgba(219, 252, 249, 0.018)");
    edgeMist.addColorStop(1, "rgba(219, 252, 249, 0.08)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = edgeMist;
    ctx.fillRect(0, 0, world.width, world.height);

    ctx.restore();
  };

  window.AntFarm.Renderer = Renderer;
}());

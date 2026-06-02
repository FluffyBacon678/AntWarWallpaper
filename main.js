(function () {
  "use strict";

  var AntFarm = window.AntFarm;
  var Settings = AntFarm.Settings;
  var Utils = AntFarm.Utils;

  var audioState = {
    targetBass: 0,
    targetMid: 0,
    targetTreble: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    level: 0,
    beat: 0
  };

  var rgbState = {
    ledPlugin: false,
    accumulator: 0,
    canvas: null,
    ctx: null
  };

  var canvas = document.getElementById("antFarmCanvas");
  var ctx = canvas.getContext("2d", { alpha: false });

  var ui = new AntFarm.UIOverlay(Settings);
  var world = new AntFarm.World(Settings, ui);
  world.audio = audioState;
  var renderer = new AntFarm.Renderer(canvas, ctx, Settings);
  var input = new AntFarm.InputManager(canvas, world, ui, Settings);

  window.antFarmRuntime = {
    settings: Settings,
    world: world,
    renderer: renderer,
    input: input,
    ui: ui,
    audio: audioState
  };

  var lastTime = performance.now();
  var dpr = 1;
  var stoppedByError = false;
  var debugAccumulator = 0;
  var resizeTimer = null;

  function resize() {
    var width = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 320);
    var height = Math.max(240, window.innerHeight || document.documentElement.clientHeight || 240);
    var qualityCap = Settings.visualQuality === "low" ? 1 : 2;

    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, qualityCap));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    world.resize(width, height);
    renderer.resize(width, height, dpr);
  }

  function updateDebugAttributes(force) {
    if (!force && debugAccumulator < 0.45) {
      return;
    }
    debugAccumulator = 0;

    var antCount = 0;
    var routedAnts = 0;
    var highStuckAnts = 0;
    var lowStuckAnts = 0;
    var routedSoldiers = 0;
    var highStuckSoldiers = 0;
    var lowStuckSoldiers = 0;
    var unreachableSoldiers = 0;

    for (var c = 0; c < world.colonies.length; c += 1) {
      for (var a = 0; a < world.colonies[c].ants.length; a += 1) {
        var ant = world.colonies[c].ants[a];
        antCount += 1;

        if (ant.route && ant.route.length > 0) {
          routedAnts += 1;
        }
        if (ant.stuckScore > 3.5) {
          highStuckAnts += 1;
        }
        if (ant.stuckScore > 2) {
          lowStuckAnts += 1;
        }

        if (ant.role === "soldier") {
          if (ant.route && ant.route.length > 0) {
            routedSoldiers += 1;
          }
          if (ant.stuckScore > 3.5) {
            highStuckSoldiers += 1;
          }
          if (ant.stuckScore > 2) {
            lowStuckSoldiers += 1;
          }
          if (ant.unreachableAntTimer > 0 || ant.unreachableBaseTimer > 0) {
            unreachableSoldiers += 1;
          }
        }
      }
    }

    canvas.dataset.ants = String(antCount);
    canvas.dataset.maxAnts = String(Settings.maxAnts);
    canvas.dataset.routedAnts = String(routedAnts);
    canvas.dataset.highStuckAnts = String(highStuckAnts);
    canvas.dataset.lowStuckAnts = String(lowStuckAnts);
    canvas.dataset.routedSoldiers = String(routedSoldiers);
    canvas.dataset.highStuckSoldiers = String(highStuckSoldiers);
    canvas.dataset.lowStuckSoldiers = String(lowStuckSoldiers);
    canvas.dataset.unreachableSoldiers = String(unreachableSoldiers);
    canvas.dataset.resources = String(world.resources.length);
    canvas.dataset.hazards = String(world.hazards.length);
    canvas.dataset.audioLevel = String(Math.round(audioState.level * 100) / 100);
    canvas.dataset.particles = String(world.particles.particles.length);
    canvas.dataset.pheromones = JSON.stringify(world.pheromones.activeCounts());
    canvas.dataset.terrain = JSON.stringify(world.terrain.stats());
    canvas.dataset.chambers = JSON.stringify(world.colonies.map(function (colony) {
      return {
        name: colony.name,
        complete: colony.countChambers(),
        pending: colony.pendingChamber() ? colony.pendingChamber().type : null
      };
    }));
    canvas.dataset.colonies = world.colonies.map(function (colony) {
      return [
        colony.name,
        colony.alive ? "alive" : "collapsed",
        colony.ants.length,
        Math.round(colony.food),
        Math.round(colony.digPoints || 0),
        Math.round(colony.health)
      ].join(":");
    }).join("|");
  }

  function averageAudioRange(audioArray, start, end) {
    var total = 0;
    var count = 0;

    for (var i = start; i <= end; i += 1) {
      total += Math.min(Number(audioArray[i]) || 0, 1);
      total += Math.min(Number(audioArray[i + 64]) || 0, 1);
      count += 2;
    }

    return count > 0 ? total / count : 0;
  }

  function handleWallpaperAudio(audioArray) {
    if (!audioArray || audioArray.length < 128) {
      return;
    }

    audioState.targetBass = averageAudioRange(audioArray, 0, 7);
    audioState.targetMid = averageAudioRange(audioArray, 12, 30);
    audioState.targetTreble = averageAudioRange(audioArray, 38, 63);
  }

  function updateAudioState(dt) {
    var smoothing = Utils.clamp(dt * 8, 0, 1);
    var previousBass = audioState.bass;

    audioState.bass = Utils.lerp(audioState.bass, audioState.targetBass, smoothing);
    audioState.mid = Utils.lerp(audioState.mid, audioState.targetMid, smoothing);
    audioState.treble = Utils.lerp(audioState.treble, audioState.targetTreble, smoothing);
    audioState.level = Utils.clamp(audioState.bass * 0.48 + audioState.mid * 0.32 + audioState.treble * 0.2, 0, 1);

    if (audioState.bass > 0.18 && audioState.bass - previousBass > 0.045) {
      audioState.beat = 1;
    } else {
      audioState.beat = Math.max(0, audioState.beat - dt * 2.8);
    }
  }

  function ensureRgbCanvas() {
    if (rgbState.canvas) {
      return;
    }

    rgbState.canvas = document.createElement("canvas");
    rgbState.canvas.width = 96;
    rgbState.canvas.height = 18;
    rgbState.ctx = rgbState.canvas.getContext("2d");
  }

  function encodedRgbCanvas(canvas) {
    var imageData = rgbState.ctx.getImageData(0, 0, canvas.width, canvas.height);
    var colorArray = [];

    for (var d = 0; d < imageData.data.length; d += 4) {
      var write = d / 4 * 3;
      colorArray[write] = imageData.data[d];
      colorArray[write + 1] = imageData.data[d + 1];
      colorArray[write + 2] = imageData.data[d + 2];
    }

    return String.fromCharCode.apply(null, colorArray);
  }

  function drawRgbSyncFrame() {
    ensureRgbCanvas();

    var rgbCanvas = rgbState.canvas;
    var rgbCtx = rgbState.ctx;
    var left = world.colonies[0] ? world.colonies[0].color : Settings.team1Color;
    var right = world.colonies[1] ? world.colonies[1].color : Settings.team2Color;
    var glow = Utils.clamp(0.34 + audioState.level * 0.65 + audioState.beat * 0.18, 0.2, 1.2);
    var gradient = rgbCtx.createLinearGradient(0, 0, rgbCanvas.width, 0);

    gradient.addColorStop(0, Utils.mixColors("#050807", left, glow));
    gradient.addColorStop(0.47, Utils.mixColors(left, right, 0.5));
    gradient.addColorStop(1, Utils.mixColors("#050807", right, glow));
    rgbCtx.fillStyle = "#020303";
    rgbCtx.fillRect(0, 0, rgbCanvas.width, rgbCanvas.height);
    rgbCtx.globalAlpha = Utils.clamp(0.55 + audioState.level * 0.45, 0.55, 1);
    rgbCtx.fillStyle = gradient;
    rgbCtx.fillRect(0, 0, rgbCanvas.width, rgbCanvas.height);

    rgbCtx.globalAlpha = 0.24 + audioState.bass * 0.36;
    rgbCtx.fillStyle = "#ffffff";
    var centerWidth = 4 + audioState.bass * 18;
    rgbCtx.fillRect((rgbCanvas.width - centerWidth) * 0.5, 0, centerWidth, rgbCanvas.height);
    rgbCtx.globalAlpha = 1;
  }

  function updateRgbSync(dt) {
    if (!Settings.enableRgbSync || !rgbState.ledPlugin) {
      return;
    }

    if (!window.wpPlugins || !window.wpPlugins.led || typeof window.wpPlugins.led.setAllDevicesByImageData !== "function") {
      return;
    }

    rgbState.accumulator += dt;
    if (rgbState.accumulator < 0.1) {
      return;
    }
    rgbState.accumulator = 0;

    drawRgbSyncFrame();

    try {
      window.wpPlugins.led.setAllDevicesByImageData(encodedRgbCanvas(rgbState.canvas), rgbState.canvas.width, rgbState.canvas.height);
    } catch (error) {
      rgbState.ledPlugin = false;
      console.warn("RGB sync disabled:", error);
    }
  }

  function frame(now) {
    if (stoppedByError) {
      return;
    }

    var rawDt = (now - lastTime) / 1000;
    lastTime = now;

    // Wallpaper Engine may pause or throttle the page; cap time so the colony
    // does not fast-forward violently when rendering resumes.
    var dt = Math.min(rawDt, 0.05);

    try {
      updateAudioState(dt);
      world.update(dt);
      debugAccumulator += dt;
      updateDebugAttributes(false);
      renderer.render(world, ui);
      updateRgbSync(dt);
    } catch (error) {
      stoppedByError = true;
      console.error(error);
      ui.push("Simulation error: " + error.message, "#ff8f6b");
      renderer.render(world, ui);
    }

    requestAnimationFrame(frame);
  }

  function scheduleResize() {
    if (resizeTimer !== null) {
      window.clearTimeout(resizeTimer);
    }
    resizeTimer = window.setTimeout(function () {
      resizeTimer = null;
      resize();
      updateDebugAttributes(true);
    }, 80);
  }

  window.addEventListener("resize", scheduleResize);
  resize();
  updateDebugAttributes(true);
  ui.push("Food bloom detected", "#d7c56a");
  if (typeof window.wallpaperRegisterAudioListener === "function") {
    window.wallpaperRegisterAudioListener(handleWallpaperAudio);
  }
  window.wallpaperAudioListener = handleWallpaperAudio;
  window.wallpaperPluginListener = {
    onPluginLoaded: function (name) {
      if (name === "led") {
        rgbState.ledPlugin = true;
      }
    }
  };
  requestAnimationFrame(frame);

  window.wallpaperPropertyListener = {
    applyUserProperties: function (properties) {
      AntFarm.applyWallpaperProperties(properties, function (changedKeys) {
        var colorChange = hasChanged(changedKeys, [
          "team1Color",
          "team2Color",
          "team3Color",
          "team4Color",
          "team5Color",
          "colonyColorMode"
        ]);
        var terrainChange = hasChanged(changedKeys, [
          "terrainCellSize",
          "soilTopFraction",
          "sideViewAntFarm"
        ]);
        var pheromoneChange = hasChanged(changedKeys, [
          "pheromoneCellSize",
          "visualQuality",
          "sideViewAntFarm"
        ]);
        var visualQualityChange = hasChanged(changedKeys, ["visualQuality"]);

        input.applySettings();

        if (visualQualityChange) {
          world.applySettings({
            rebuildTerrain: false,
            resizePheromones: false
          });
          resize();
        } else {
          world.applySettings({
            rebuildTerrain: terrainChange,
            resizePheromones: pheromoneChange
          });

          if (terrainChange || colorChange) {
            renderer.invalidateTerrain();
          }
        }

        updateDebugAttributes(true);
      });
    }
  };

  function hasChanged(changedKeys, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      if (changedKeys.indexOf(keys[i]) !== -1) {
        return true;
      }
    }

    return false;
  }
}());

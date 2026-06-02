(function () {
  "use strict";

  window.AntFarm = window.AntFarm || {};

  var Settings = {
    maxAnts: 280,
    colonyCount: 2,
    simulationSpeed: 1,
    disasterFrequency: 0.7,
    visualQuality: "high",
    showUI: true,
    showParticles: true,
    enableInteraction: true,
    enableFire: true,
    enableRainSeep: true,
    enableCombat: true,
    enablePheromones: true,
    enableAudioReactive: true,
    enableRgbSync: false,
    audioSensitivity: 0.9,
    colonyColorMode: "manual",
    sideViewAntFarm: true,
    team1Color: "#ff5f57",
    team2Color: "#57a9ff",
    team3Color: "#65d46e",
    team4Color: "#d57cff",
    team5Color: "#ffb84c",
    foodSpawnRate: 0.085,

    terrainCellSize: 10,
    soilTopFraction: 0.1,
    caveDigRadius: 7,
    chamberDigRadius: 20,
    workerDigSpeed: 1,
    buildExpansionRate: 0.13,
    initialDigPoints: 75,
    maxDigPoints: 165,
    digPointRegenRate: 1.55,
    foodToDigPointRate: 0.42,
    digPointCostPerCell: 0.82,
    digPointLowThreshold: 4,
    chamberPlanCooldown: 7,
    chamberCompletionPadding: 7,
    nurserySpawnBoost: 0.18,
    granaryDigConversionBoost: 0.28,
    digStoreCapacityBonus: 55,
    digStoreRegenBoost: 0.22,
    barracksDamageBoost: 0.12,
    barracksSoldierRatioBoost: 0.16,
    routeRefreshInterval: 0.75,
    routeMaxVisitedCells: 900,
    stuckCheckInterval: 0.9,
    stuckDistanceThreshold: 5.5,
    soldierUnreachableRetry: 4.5,

    spatialCellSize: 96,
    maxFoodNodes: 34,
    foodAmountMin: 18,
    foodAmountMax: 44,
    userFoodAmount: 54,

    initialWorkers: 16,
    initialSoldiers: 7,
    perColonyCap: 130,
    workerSpawnCost: 6,
    soldierSpawnCost: 9,

    baseHealth: 190,
    baseRadius: 24,
    baseRepairFoodThreshold: 32,

    workerHealth: 18,
    soldierHealth: 34,
    workerSpeed: 39,
    soldierSpeed: 47,
    workerCarryAmount: 4,
    foodSenseRadius: 138,
    workerEnemyFearRadius: 76,

    soldierSenseRadius: 150,
    soldierAttackRange: 10,
    soldierDamage: 6.5,
    baseAttackSense: 250,
    baseAttackDamageScale: 0.72,

    fireRadius: 64,
    fireLifetime: 7.5,
    fireDamagePerSecond: 22,
    rainSeepFrequency: 0.035,
    rainSeepRadius: 42,
    rainSeepLifetime: 18,
    rainSeepDamagePerSecond: 4.5,
    hazardAvoidRadius: 108,

    pheromoneCellSize: 22,
    foodPheromoneDecay: 0.23,
    dangerPheromoneDecay: 0.55,
    pheromoneDiffusion: 0.18,
    foodSourcePheromone: 0.28,
    foodTrailDeposit: 0.38,
    dangerSourcePheromone: 0.8,
    workerPheromoneAttraction: 1.85,
    dangerPheromoneRepel: 4.4,
    pheromoneRenderThreshold: 0.05,

    particleCap: 900,
    showStats: true
  };

  var propertyMap = {
    maxants: ["maxAnts", "number"],
    colonycount: ["colonyCount", "number"],
    simulationspeed: ["simulationSpeed", "number"],
    disasterfrequency: ["disasterFrequency", "number"],
    visualquality: ["visualQuality", "string"],
    showui: ["showUI", "boolean"],
    showparticles: ["showParticles", "boolean"],
    enableinteraction: ["enableInteraction", "boolean"],
    enablefire: ["enableFire", "boolean"],
    enablerainseep: ["enableRainSeep", "boolean"],
    enablecombat: ["enableCombat", "boolean"],
    enablepheromones: ["enablePheromones", "boolean"],
    enableaudioreactive: ["enableAudioReactive", "boolean"],
    audioreactive: ["enableAudioReactive", "boolean"],
    enablergbsync: ["enableRgbSync", "boolean"],
    rgbsync: ["enableRgbSync", "boolean"],
    audiosensitivity: ["audioSensitivity", "number"],
    colonycolormode: ["colonyColorMode", "string"],
    sideviewantfarm: ["sideViewAntFarm", "boolean"],
    showstats: ["showStats", "boolean"],
    team1color: ["team1Color", "color"],
    team2color: ["team2Color", "color"],
    team3color: ["team3Color", "color"],
    team4color: ["team4Color", "color"],
    team5color: ["team5Color", "color"],
    redcolor: ["team1Color", "color"],
    bluecolor: ["team2Color", "color"],
    foodspawnrate: ["foodSpawnRate", "number"],
    maxfoodnodes: ["maxFoodNodes", "number"],
    userfoodamount: ["userFoodAmount", "number"],
    terraincellsize: ["terrainCellSize", "number"],
    soiltopfraction: ["soilTopFraction", "number"],
    cavedigradius: ["caveDigRadius", "number"],
    chamberdigradius: ["chamberDigRadius", "number"],
    buildexpansionrate: ["buildExpansionRate", "number"],
    initialworkers: ["initialWorkers", "number"],
    initialsoldiers: ["initialSoldiers", "number"],
    percolonycap: ["perColonyCap", "number"],
    digpointregenrate: ["digPointRegenRate", "number"],
    foodtodigpointrate: ["foodToDigPointRate", "number"],
    digpointcostpercell: ["digPointCostPerCell", "number"],
    rainseepfrequency: ["rainSeepFrequency", "number"],
    particlecap: ["particleCap", "number"],
    workerspeed: ["workerSpeed", "number"],
    soldierspeed: ["soldierSpeed", "number"]
  };

  function readPropertyValue(property) {
    if (!property || typeof property !== "object") {
      return property;
    }

    if (Object.prototype.hasOwnProperty.call(property, "value")) {
      return property.value;
    }

    return property;
  }

  function coerce(value, type) {
    if (type === "number") {
      var numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : null;
    }

    if (type === "boolean") {
      return value === true || value === 1 || value === "1" || value === "true";
    }

    if (type === "string") {
      return String(value);
    }

    if (type === "color") {
      return normalizeColor(value);
    }

    return value;
  }

  function componentToHex(value) {
    var rounded = Math.max(0, Math.min(255, Math.round(value)));
    return (rounded < 16 ? "0" : "") + rounded.toString(16);
  }

  function normalizeColor(value) {
    if (typeof value !== "string") {
      return null;
    }

    var trimmed = value.trim();
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
      return trimmed.toLowerCase();
    }

    if (/^[0-9a-f]{6}$/i.test(trimmed)) {
      return "#" + trimmed.toLowerCase();
    }

    var parts = trimmed.split(/\s+/).map(Number).filter(function (part) {
      return Number.isFinite(part);
    });

    if (parts.length >= 3) {
      return "#" +
        componentToHex(parts[0] * 255) +
        componentToHex(parts[1] * 255) +
        componentToHex(parts[2] * 255);
    }

    return null;
  }

  function clampSettings() {
    Settings.maxAnts = Math.max(40, Math.min(600, Math.round(Settings.maxAnts)));
    Settings.colonyCount = Math.max(1, Math.min(5, Math.round(Settings.colonyCount)));
    Settings.simulationSpeed = Math.max(0.2, Math.min(3, Settings.simulationSpeed));
    Settings.disasterFrequency = Math.max(0, Math.min(3, Settings.disasterFrequency));
    Settings.audioSensitivity = Math.max(0, Math.min(2.5, Settings.audioSensitivity));
    if (["manual", "rgb", "audio"].indexOf(Settings.colonyColorMode) === -1) {
      Settings.colonyColorMode = "manual";
    }
    Settings.foodSpawnRate = Math.max(0.015, Math.min(0.45, Settings.foodSpawnRate));
    Settings.maxFoodNodes = Math.max(6, Math.min(80, Math.round(Settings.maxFoodNodes)));
    Settings.userFoodAmount = Math.max(8, Math.min(160, Settings.userFoodAmount));
    Settings.pheromoneCellSize = Math.max(16, Math.min(44, Math.round(Settings.pheromoneCellSize)));
    Settings.terrainCellSize = Math.max(8, Math.min(32, Math.round(Settings.terrainCellSize)));
    Settings.soilTopFraction = Math.max(0.04, Math.min(0.28, Settings.soilTopFraction));
    Settings.caveDigRadius = Math.max(4, Math.min(16, Settings.caveDigRadius));
    Settings.chamberDigRadius = Math.max(12, Math.min(38, Settings.chamberDigRadius));
    Settings.buildExpansionRate = Math.max(0.02, Math.min(0.5, Settings.buildExpansionRate));
    Settings.initialWorkers = Math.max(4, Math.min(60, Math.round(Settings.initialWorkers)));
    Settings.initialSoldiers = Math.max(0, Math.min(36, Math.round(Settings.initialSoldiers)));
    Settings.perColonyCap = Math.max(20, Math.min(320, Math.round(Settings.perColonyCap)));
    Settings.digPointRegenRate = Math.max(0.2, Math.min(8, Settings.digPointRegenRate));
    Settings.foodToDigPointRate = Math.max(0.05, Math.min(2, Settings.foodToDigPointRate));
    Settings.digPointCostPerCell = Math.max(0.08, Math.min(3, Settings.digPointCostPerCell));
    Settings.rainSeepFrequency = Math.max(0, Math.min(0.16, Settings.rainSeepFrequency));
    Settings.rainSeepRadius = Math.max(18, Math.min(86, Settings.rainSeepRadius));
    Settings.rainSeepLifetime = Math.max(4, Math.min(42, Settings.rainSeepLifetime));
    Settings.rainSeepDamagePerSecond = Math.max(0, Math.min(18, Settings.rainSeepDamagePerSecond));
    Settings.particleCap = Math.max(100, Math.min(2400, Math.round(Settings.particleCap)));
    Settings.workerSpeed = Math.max(12, Math.min(95, Settings.workerSpeed));
    Settings.soldierSpeed = Math.max(14, Math.min(110, Settings.soldierSpeed));
    Settings.visualQuality = Settings.visualQuality === "low" ? "low" : "high";
    Settings.team1Color = normalizeColor(Settings.team1Color) || "#ff5f57";
    Settings.team2Color = normalizeColor(Settings.team2Color) || "#57a9ff";
    Settings.team3Color = normalizeColor(Settings.team3Color) || "#65d46e";
    Settings.team4Color = normalizeColor(Settings.team4Color) || "#d57cff";
    Settings.team5Color = normalizeColor(Settings.team5Color) || "#ffb84c";
  }

  function applyWallpaperProperties(properties, onChange) {
    var changed = false;
    var changedKeys = [];

    Object.keys(properties || {}).forEach(function (propertyName) {
      var normalized = propertyName.toLowerCase().replace(/[^a-z0-9]/g, "");
      var mapping = propertyMap[normalized];

      if (!mapping) {
        return;
      }

      var key = mapping[0];
      var type = mapping[1];
      var value = coerce(readPropertyValue(properties[propertyName]), type);

      if (value !== null && Settings[key] !== value) {
        Settings[key] = value;
        changed = true;
        changedKeys.push(key);
      }
    });

    if (changed) {
      clampSettings();
      if (typeof onChange === "function") {
        onChange(changedKeys);
      }
    }

    return changedKeys;
  }

  clampSettings();

  window.AntFarm.Settings = Settings;
  window.AntFarm.applyWallpaperProperties = applyWallpaperProperties;
}());

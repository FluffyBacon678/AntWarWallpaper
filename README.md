# Side-View Ant Colony War Aquarium

A complete Wallpaper Engine web wallpaper: a fullscreen Canvas 2D side-view ant-farm aquarium where two colored colonies dig, build, gather food, avoid hazards, fight in tunnels, and compete underground.

The project uses plain HTML, CSS, and JavaScript with no build step and no external libraries. It can run directly in a browser or be imported as a Wallpaper Engine web wallpaper.

## Run locally

Open `index.html` in a browser.

The scripts are classic browser scripts instead of ES modules, so the wallpaper can be opened from disk and imported easily into Wallpaper Engine.

## Wallpaper Engine import

1. Open Wallpaper Engine.
2. Choose to create or import a Web Wallpaper.
3. Select this project folder or the `index.html` file.
4. Test it in the editor.
5. Adjust the exposed properties to match your desktop and performance preference.

The folder includes `project.json`, so Wallpaper Engine exposes the custom property panel automatically when imported as a web wallpaper.

## Controls

- Left click: drop a food pile.
- Right click: create a temporary fire hazard.

## Features

- Fullscreen Canvas 2D renderer with resize handling and device-pixel-ratio scaling.
- Higher-resolution side-view soil wall with a generated dirt texture asset, glass framing, tunnels, caves, food pockets, and base chambers.
- Thin sky and grass surface strip, subtle parallax darkness over the soil wall, ambient motes, glass glare, scratches, and mineral flecks.
- Two default colonies with colored queen/base nodes, health, food storage, workers, soldiers, and collapse state.
- Colonies start far apart on opposite sides of the ant farm.
- Bases generate dig points over time, and delivered food adds extra dig points.
- Workers spend colony dig points to carve dirt, open tunnels, and expand chambers.
- Workers visibly carry food crumbs and briefly carry dirt chunks after digging.
- Frequently used tunnels develop worn floor highlights, while shared enemy traffic creates a soft contested glow.
- Functional chamber construction:
  - Nurseries speed colony growth.
  - Dig stores increase dig capacity and dig-point generation.
  - Granaries improve food-to-dig conversion.
  - Barracks increase soldier pressure and damage.
- Workers wander, dig through soil, open tunnels/chambers, find food, collect it, carry it home, deposit it, follow food pheromone, avoid danger pheromone, avoid fire/rain hazards, and flee nearby enemy soldiers.
- Soldiers patrol central contested caves, raid through tunnels, detect enemies, fight ants, defend bases, and damage enemy bases after breaches.
- Random food spawns over time with a capped food node count.
- User-dropped food piles.
- User-created fire zones that damage ants and fade out.
- Watchable rainwater seep hazards that drip down from the surface and encourage ants to avoid wet tunnel areas.
- Wallpaper Engine editor controls for visual quality, UI/stats, interaction, team colors, optional RGB/music color modes, ant caps, simulation speed, food, fire/rain hazards, combat, pheromones, dirt resolution, dig economy, ant speed, and particle cap.
- Wallpaper Engine audio input can softly pulse colony lights, glass glare, contested tunnel glow, and rain ripples.
- Optional RGB hardware sync mirrors the two colony colors when Wallpaper Engine's LED plugin is available.
- Combat, ant death, base damage, and colony collapse.
- Event messages for food blooms, colony growth, queen attacks, collapses, fire outbreaks, and rainwater seeps.
- Lightweight particles for food, hits, death, digging, fire, water, and base collapse.
- Spatial grid lookup for nearby ants, food, hazards, and bases.
- Diggable terrain grid for side-view caves, bases, tunnel wear, and contested traffic memory.
- Low-resolution food and danger pheromone field with decay, diffusion, worker trail laying, source emission, steering, and subtle rendering.
- Global ant cap, per-colony cap, food cap, hazard cap, particle cap, and capped simulation delta time.

## Wallpaper Engine Properties

- Visual quality.
- Event text and stats overlays.
- Particles and mouse interaction.
- Team colors.
- Colony color mode: manual, slow RGB, or music pulse.
- Music-reactive lighting and sensitivity.
- RGB hardware sync.
- Ant caps and simulation speed.
- Food spawn behavior.
- Combat and hazard controls.
- Pheromone glow.
- Dirt cell size, tunnel dig radius, chamber size, and dig economy.
- Worker and soldier speed.
- Particle cap.

## Runtime Notes

- Music reactivity is active in Wallpaper Engine when audio processing is enabled; in a normal browser it stays idle.
- RGB hardware sync depends on Wallpaper Engine's LED plugin and supported hardware.
- High visual quality uses additional canvas glow, particle, pheromone, and tunnel-wear layers. Use the Low CPU/GPU setting for laptops, battery use, or very high-resolution displays.
- Terrain and heavier quality changes intentionally rebuild terrain or rendering caches so the wallpaper remains visually coherent.

## Project Structure

- `index.html` - browser entry point.
- `style.css` - fullscreen wallpaper page styling.
- `assets/soil-texture.png` - generated earthy material texture blended into the cached terrain layer.
- `main.js` - bootstraps canvas, world, renderer, input, loop, resize, audio, RGB sync, and Wallpaper Engine property hook.
- `src/Settings.js` - central settings and user-property mapping.
- `src/World.js` - owns simulation state, spawning, updates, cleanup, events, and spatial-grid rebuilds.
- `src/Colony.js` - colony food, health, spawning, base damage, chambers, and collapse.
- `src/Ant.js` - worker and soldier state-machine behavior, movement, health, pathing, cargo, and combat.
- `src/Terrain.js` - side-view diggable soil, caves, tunnels, chamber generation, traffic wear, and contested traffic memory.
- `src/Resource.js` - food node data and collection.
- `src/Hazard.js` - fire and rainwater seep hazard lifetime and damage data.
- `src/ParticleSystem.js` - capped lightweight particles.
- `src/SpatialGrid.js` - nearby lookup optimization.
- `src/PheromoneField.js` - low-resolution food and danger pheromone simulation.
- `src/InputManager.js` - mouse controls.
- `src/Renderer.js` - Canvas drawing in the required layer order.
- `src/UIOverlay.js` - fading event messages and small stats overlay.

## Verification

The release pass checks:

- JavaScript syntax with `node --check`.
- `project.json` JSON parsing.
- Local server delivery of `index.html` and `assets/soil-texture.png`.
- Browser screenshot smoke tests for visual regressions.

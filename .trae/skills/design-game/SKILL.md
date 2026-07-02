---
name: "design-game"
description: "Audit and improve the visual design, polish, and player experience of an existing browser game. Invoke when user says 'make my game look better', 'improve the design', 'add polish', 'add juice', 'add particles', 'fix the UI', or 'make it more visually appealing'."
---

# Design Game

Run a UI/UX design pass on an existing game to improve visuals, atmosphere, and game feel.

## Instructions

First, load the game-designer skill to get the full design vocabulary and patterns.

### Step 1: Audit

- Read all source files to understand current visuals
- Identify the color palette, drawing patterns, particle system, HUD/UI
- Score each area 1-5: Background & Atmosphere, Color Palette, Animations, Particle Effects, Screen Transitions, Typography, Game Feel / Juice, Game Over

### Step 2: Design Report

Present scores and then list the top improvements ranked by visual impact.

### Step 3: Implement

Improve visuals without altering gameplay. Follow patterns:
- Don't alter gameplay (physics, scoring, controls, spawn timing)
- Prefer procedural graphics
- Add: background layers, particle effects, screen shake, smooth transitions

### Step 4: Verify

- Confirm no errors
- Summarize all changes
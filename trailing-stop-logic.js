// ════════════════════════════════════════════════════════════════[...]
//  TRAILING STOP LOGIC — 3-Stage Dynamic Stop Management
//  
//  Stage 1: Trigger at 50% of TP1 distance
//  Stage 2: Move to Breakeven (entry price)
//  Stage 3: Trail price at 40% distance behind current price
//
//  Example: Entry @4300, TP1 @4380.10, SL @4280
//  - TP1 Distance = 80.10 points
//  - Trigger = 4340.05 (50% of distance)
//  - At 4340.05 → SL moves to 4300 (breakeven)
//  - At 4350 → SL = 4318 (40% = 32.04 points behind)
//  - At 4380.10 → SL = 4348.06
// ════════════════════════════════════════════════════════════════[...]

/**
 * Initialize trailing stop state for a new trade
 * @param {number} entry - Entry price
 * @param {number} tp1 - First take profit level
 * @param {string} dir - Trade direction ("BUY" or "SELL")
 * @returns {object} Trailing stop state object
 */
function initTrailingStop(entry, tp1, dir) {
  const tp1Distance = Math.abs(tp1 - entry);
  const triggerLevel = dir === "BUY" 
    ? entry + (tp1Distance * 0.50)
    : entry - (tp1Distance * 0.50);
  
  return {
    entry,
    tp1,
    tp1Distance,
    dir,
    triggerLevel,
    activated: false,
    currentTrail: null,
    maxPriceReached: entry
  };
}

/**
 * Update trailing stop based on current market price
 * @param {object} trailingState - Trailing stop state from initTrailingStop
 * @param {number} currentPrice - Current market price
 * @returns {object} Updated trailing stop state + new SL price
 */
function updateTrailingStop(trailingState, currentPrice) {
  const { entry, tp1, tp1Distance, dir, triggerLevel } = trailingState;
  let { activated, currentTrail, maxPriceReached } = trailingState;
  
  // Track the highest/lowest price reached
  if (dir === "BUY") {
    maxPriceReached = Math.max(maxPriceReached, currentPrice);
  } else {
    maxPriceReached = Math.min(maxPriceReached, currentPrice);
  }
  
  // ─── STAGE 1: Check if we've hit the trigger level ────────────
  let shouldActivate = false;
  if (dir === "BUY" && currentPrice >= triggerLevel && !activated) {
    shouldActivate = true;
  } else if (dir === "SELL" && currentPrice <= triggerLevel && !activated) {
    shouldActivate = true;
  }
  
  if (shouldActivate) {
    activated = true;
    // ─── STAGE 2: Move stop to breakeven ────────────────────
    currentTrail = entry;
  }
  
  // ─── STAGE 3: Trail at 40% distance as price moves ────────────
  if (activated && currentPrice !== entry) {
    // 40% of TP1 distance = the trail distance
    const trailDistance = tp1Distance * 0.40;
    
    if (dir === "BUY") {
      // For BUY: trail is below current price
      const newTrail = currentPrice - trailDistance;
      // Trail only goes up, never down (lock in gains)
      currentTrail = Math.max(currentTrail, newTrail);
    } else {
      // For SELL: trail is above current price
      const newTrail = currentPrice + trailDistance;
      // Trail only goes down, never up (lock in gains)
      currentTrail = Math.min(currentTrail, newTrail);
    }
  }
  
  // Return updated state and the current SL price
  return {
    ...trailingState,
    activated,
    currentTrail,
    maxPriceReached,
    currentSL: activated ? +(currentTrail).toFixed(2) : entry,
    stage: !activated ? 1 : (currentTrail === entry ? 2 : 3)
  };
}

/**
 * Check if stop loss has been hit
 * @param {object} trailingState - Current trailing stop state
 * @param {number} currentPrice - Current market price
 * @returns {boolean} True if stop loss is hit
 */
function isStopLossHit(trailingState, currentPrice) {
  const { dir, currentTrail, entry } = trailingState;
  const sl = trailingState.currentSL || entry;
  
  if (dir === "BUY") {
    return currentPrice <= sl;
  } else {
    return currentPrice >= sl;
  }
}

/**
 * Format trailing stop info for display
 * @param {object} trailingState - Current trailing stop state
 * @returns {string} Formatted display string
 */
function formatTrailingStopInfo(trailingState) {
  const { entry, tp1, tp1Distance, activated, currentTrail, stage, dir } = trailingState;
  const trailDist = tp1Distance * 0.40;
  
  if (!activated) {
    const triggerLevel = dir === "BUY"
      ? entry + (tp1Distance * 0.50)
      : entry - (tp1Distance * 0.50);
    return `TRAIL: OFF | Trigger @ ${triggerLevel.toFixed(2)} | Trail Distance: ${trailDist.toFixed(2)} pips`;
  }
  
  const stageNames = ["", "WAITING", "BREAKEVEN", "TRAILING"];
  return `TRAIL: ${stageNames[stage]} | SL @ ${currentTrail.toFixed(2)} | Distance: ${trailDist.toFixed(2)} pips`;
}

/**
 * Get complete trade summary with trailing stop
 * @param {object} trailingState - Current trailing stop state
 * @param {number} currentPrice - Current market price
 * @returns {object} Complete trade info
 */
function getTradeInfo(trailingState, currentPrice) {
  const updated = updateTrailingStop(trailingState, currentPrice);
  const { entry, tp1, tp1Distance, dir, activated, stage, currentTrail } = updated;
  
  return {
    direction: dir,
    entryPrice: entry,
    tp1Price: tp1,
    tp1Distance: +tp1Distance.toFixed(2),
    currentPrice: currentPrice,
    trailingActive: activated,
    currentStage: ["OFF", "WAITING", "BREAKEVEN", "TRAILING"][stage],
    currentSL: +(currentTrail || entry).toFixed(2),
    stopped: isStopLossHit(updated, currentPrice),
    info: formatTrailingStopInfo(updated)
  };
}

// ════════════════════════════════════════════════════════════════[...]
// EXAMPLE USAGE:
// ════════════════════════════════════════════════════════════════[...]
/*
// Initialize a BUY trade
const trail = initTrailingStop(4300, 4380.10, "BUY");

// Simulate price movement
const prices = [4320, 4335, 4340.05, 4350, 4365, 4380.10, 4390, 4400];

prices.forEach(price => {
  const info = getTradeInfo(trail, price);
  console.log(`Price: ${price} | ${info.info} | SL: ${info.currentSL}`);
  
  if (info.stopped) {
    console.log("🛑 STOPPED OUT!");
  }
});
*/

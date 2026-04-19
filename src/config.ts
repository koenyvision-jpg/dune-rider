export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540

// Physics
export const GRAVITY = 800
export const HOLD_LIFT = -1100
export const DRAG_COEFFICIENT = 0.92
export const TERMINAL_VELOCITY = 600
export const MAX_UPWARD_VELOCITY = -380
export const GROUND_Y = 486   // 10% buffer from bottom (540 * 0.9)
export const CEILING_Y = 54   // 10% buffer from top    (540 * 0.1)

// Energy
export const MAX_ENERGY = 100
export const DRAIN_RATE = 10
export const RECHARGE_RATE = 6
export const RECHARGE_THRESHOLD = 10

// Wind
export const WIND_CHANGE_SPEED = 0.0003
export const MIN_WIND = -300
export const MAX_WIND = 300
export const WIND_LIFT_MULTIPLIER = 1.0

// Scroll / speed — purely input-driven, no time progression
export const CRUISE_SPEED = 200   // speed when releasing (full speed)
export const HOLD_SPEED   = 90    // speed when holding spacebar (decelerated)

// Hero sprite scale (1032×1675 source → ~88×142px on screen)
export const HERO_SCALE = 0.085
// Obstacle base scale so Cat1 matches hero visible height (~142px / 64px frame)
export const PLAYER_SCALE = 2.22

// Obstacles
export const OBSTACLE_BASE_INTERVAL = 4000
export const OBSTACLE_MIN_INTERVAL  = 1200
export const OBSTACLE_POOL_SIZE     = 15  // 5 per category

// Category speed multipliers (applied to currentSpeed)
// Cat1 moves with the environment, Cat2 slower, Cat3 faster
export const OBS_CAT1_SPEED = 1.0
export const OBS_CAT2_SPEED = 0.65
export const OBS_CAT3_SPEED = 1.55

// Scoring
export const SCORE_SCALE = 0.05
export const SCORE_MILESTONES = [500, 1000, 2500, 5000, 10000, 25000]

// Ground danger timer (ms)
export const GROUND_DANGER_MS = 3000

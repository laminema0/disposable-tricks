// Light maths. Pure functions, no game engine, so they can be unit tested.

export interface LightSource {
  x: number;
  y: number;
  /** Distance at which this light has faded to nothing. */
  radius: number;
  /** Brightness right at the source, 0 to 1. */
  strength: number;
}

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** How much of a light is left at a distance: 1 at the source, 0 at the radius and beyond. */
export function lightFalloff(distance: number, radius: number): number {
  if (radius <= 0) return 0;
  const t = Math.abs(distance) / radius;
  if (t >= 1) return 0;
  const k = 1 - t * t;
  return k * k;
}

/**
 * Light level at a point, 0 (black) to 1 (fully lit).
 * Every light adds its share on top of the ambient level.
 */
export function lightLevelAt(
  x: number,
  y: number,
  lights: readonly LightSource[],
  ambient = 0,
): number {
  let level = ambient;
  for (const light of lights) {
    const distance = Math.hypot(x - light.x, y - light.y);
    level += light.strength * lightFalloff(distance, light.radius);
  }
  return clamp01(level);
}

/** Blend two 0xRRGGBB colours. t = 0 gives `from`, t = 1 gives `to`. */
export function mixColour(from: number, to: number, t: number): number {
  const k = clamp01(t);
  const channel = (shift: number) => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * k);
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

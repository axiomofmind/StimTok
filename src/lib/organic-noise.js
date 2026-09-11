// Gradient noise for liquid surfaces. Rotating each octave prevents aligned
// lattice directions from accumulating into rectangular highlights.
export const ORGANIC_NOISE = `
vec2 organicGradient(vec2 cell) {
  float angle = hash21(cell) * 6.28318530718;
  return vec2(cos(angle), sin(angle));
}
float organicNoise(vec2 p) {
  vec2 cell = floor(p), f = fract(p);
  vec2 blend = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(organicGradient(cell), f);
  float b = dot(organicGradient(cell + vec2(1, 0)), f - vec2(1, 0));
  float c = dot(organicGradient(cell + vec2(0, 1)), f - vec2(0, 1));
  float d = dot(organicGradient(cell + vec2(1, 1)), f - vec2(1, 1));
  return mix(mix(a, b, blend.x), mix(c, d, blend.x), blend.y);
}
float organicFbm(vec2 p) {
  float value = 0.0, amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * organicNoise(p);
    p = mat2(0.8, -0.6, 0.6, 0.8) * p * 2.03 + vec2(17.3, 9.1);
    amplitude *= 0.5;
  }
  return 0.5 + value * 0.7;
}
`

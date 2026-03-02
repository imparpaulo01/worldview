import crtShader from "./crt-scanlines.glsl?raw";
import nvgShader from "./night-vision.glsl?raw";
import flirShader from "./flir-thermal.glsl?raw";
import celShader from "./cel-shading.glsl?raw";
import type { FilterMode } from "@/lib/constants";

export const SHADERS: Record<Exclude<FilterMode, "none">, string> = {
  crt: crtShader,
  nvg: nvgShader,
  flir: flirShader,
  cel: celShader,
};

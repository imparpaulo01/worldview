/// <reference types="vite/client" />

declare module "*.glsl?raw" {
  const shader: string;
  export default shader;
}

declare module "resium" {
  export * from "resium";
}

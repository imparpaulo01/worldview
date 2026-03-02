uniform sampler2D colorTexture;
uniform float czm_frameNumber;
in vec2 v_textureCoordinates;

// Pseudo-random noise
float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = v_textureCoordinates;
    vec4 color = texture(colorTexture, uv);

    // Convert to luminance
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Amplify
    lum = pow(lum, 0.7) * 1.5;
    lum = clamp(lum, 0.0, 1.0);

    // Green channel mapping
    vec3 nvg = vec3(lum * 0.1, lum * 1.0, lum * 0.15);

    // Film grain noise
    float noise = rand(uv + fract(czm_frameNumber * 0.01)) * 0.12;
    nvg += noise * vec3(0.05, 0.1, 0.05);

    // Circular vignette (tube effect)
    vec2 center = uv - 0.5;
    float dist = length(center);
    float vignetteRadius = 0.45;
    float vignetteSoftness = 0.15;
    float vignette = 1.0 - smoothstep(vignetteRadius, vignetteRadius + vignetteSoftness, dist);

    nvg *= vignette;

    out_FragColor = vec4(nvg, 1.0);
}

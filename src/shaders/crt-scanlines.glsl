uniform sampler2D colorTexture;
uniform float czm_frameNumber;
in vec2 v_textureCoordinates;

void main() {
    vec2 uv = v_textureCoordinates;
    vec4 color = texture(colorTexture, uv);

    // Chromatic aberration
    float aberration = 0.002;
    float r = texture(colorTexture, uv + vec2(aberration, 0.0)).r;
    float g = color.g;
    float b = texture(colorTexture, uv - vec2(aberration, 0.0)).b;

    // Scanlines
    float scanline = sin(uv.y * 800.0) * 0.08;

    // Vignette
    vec2 center = uv - 0.5;
    float vignette = 1.0 - dot(center, center) * 1.5;

    // Green phosphor tint
    vec3 tinted = vec3(r, g, b) * vec3(0.8, 1.0, 0.8);

    // Combine
    vec3 result = (tinted - scanline) * vignette;

    // Slight flicker
    float flicker = 0.97 + 0.03 * sin(czm_frameNumber * 0.1);
    result *= flicker;

    out_FragColor = vec4(result, 1.0);
}

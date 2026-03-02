uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;

void main() {
    vec2 uv = v_textureCoordinates;
    vec4 color = texture(colorTexture, uv);

    // Color quantization (posterize)
    float levels = 6.0;
    vec3 quantized = floor(color.rgb * levels + 0.5) / levels;

    // Sobel edge detection
    vec2 texelSize = vec2(1.0 / 1920.0, 1.0 / 1080.0);

    float tl = dot(texture(colorTexture, uv + vec2(-1, -1) * texelSize).rgb, vec3(0.333));
    float tc = dot(texture(colorTexture, uv + vec2( 0, -1) * texelSize).rgb, vec3(0.333));
    float tr = dot(texture(colorTexture, uv + vec2( 1, -1) * texelSize).rgb, vec3(0.333));
    float ml = dot(texture(colorTexture, uv + vec2(-1,  0) * texelSize).rgb, vec3(0.333));
    float mr = dot(texture(colorTexture, uv + vec2( 1,  0) * texelSize).rgb, vec3(0.333));
    float bl = dot(texture(colorTexture, uv + vec2(-1,  1) * texelSize).rgb, vec3(0.333));
    float bc = dot(texture(colorTexture, uv + vec2( 0,  1) * texelSize).rgb, vec3(0.333));
    float br = dot(texture(colorTexture, uv + vec2( 1,  1) * texelSize).rgb, vec3(0.333));

    float gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
    float gy = -tl - 2.0*tc - tr + bl + 2.0*bc + br;
    float edge = sqrt(gx*gx + gy*gy);

    // Threshold edge
    float edgeLine = step(0.15, edge);

    // Combine: quantized color with dark edge outlines
    vec3 result = quantized * (1.0 - edgeLine * 0.8);

    out_FragColor = vec4(result, 1.0);
}

uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;

// Iron bow false-color palette
vec3 ironBow(float t) {
    // Black → Purple → Red → Orange → Yellow → White
    vec3 c;
    if (t < 0.2) {
        c = mix(vec3(0.0), vec3(0.2, 0.0, 0.4), t / 0.2);
    } else if (t < 0.4) {
        c = mix(vec3(0.2, 0.0, 0.4), vec3(0.8, 0.0, 0.0), (t - 0.2) / 0.2);
    } else if (t < 0.6) {
        c = mix(vec3(0.8, 0.0, 0.0), vec3(1.0, 0.5, 0.0), (t - 0.4) / 0.2);
    } else if (t < 0.8) {
        c = mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 1.0, 0.0), (t - 0.6) / 0.2);
    } else {
        c = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0), (t - 0.8) / 0.2);
    }
    return c;
}

void main() {
    vec2 uv = v_textureCoordinates;
    vec4 color = texture(colorTexture, uv);

    // Convert to luminance
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Slight contrast boost
    lum = clamp(pow(lum, 0.9) * 1.1, 0.0, 1.0);

    // Apply iron bow palette
    vec3 thermal = ironBow(lum);

    // Subtle vignette
    vec2 center = uv - 0.5;
    float vignette = 1.0 - dot(center, center) * 0.8;
    thermal *= vignette;

    out_FragColor = vec4(thermal, 1.0);
}

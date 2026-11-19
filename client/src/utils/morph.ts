/* global WebGLRenderingContext, WebGLShader, WebGLTexture, WebGLUniformLocation */
/**
 * Flow morph between two finished slides, drawn with WebGL.
 *
 * A true morph needs matching points in both pictures, which cannot be found for
 * arbitrary photos. Instead each picture is pulled along the edges and brightness of
 * the other while the two blend: a liquid melt that works for any pair of images.
 */

export interface MorphOptions {
  /** Milliseconds */
  duration: number;
  /** How far the pictures are pulled, about 0.2 (subtle) to 1.6 (strong) */
  strength: number;
  /** Extra blur at the midpoint, 0 or 1 */
  soft: number;
  onDone: () => void;
}

const VERTEX = `
attribute vec2 p;
varying vec2 uv;
void main() {
  uv = p * .5 + .5;
  uv.y = 1.0 - uv.y;
  gl_Position = vec4(p, 0., 1.);
}`;

const FRAGMENT = `
precision highp float;
varying vec2 uv;
uniform sampler2D A, B;
uniform float t, k, soft;
uniform vec2 px;

float luma(vec4 c) { return dot(c.rgb, vec3(.299, .587, .114)); }

vec2 grad(sampler2D s, vec2 u) {
  float r = 6.0;
  float l = luma(texture2D(s, u - vec2(px.x * r, 0.)));
  float rr = luma(texture2D(s, u + vec2(px.x * r, 0.)));
  float d = luma(texture2D(s, u - vec2(0., px.y * r)));
  float uu = luma(texture2D(s, u + vec2(0., px.y * r)));
  return vec2(rr - l, uu - d);
}

vec4 smp(sampler2D s, vec2 u, float blur) {
  vec4 c = texture2D(s, u);
  if (blur > 0.0) {
    vec2 o = px * blur;
    c = c * .28 + .18 * (texture2D(s, u + vec2(o.x, 0.)) + texture2D(s, u - vec2(o.x, 0.))
                       + texture2D(s, u + vec2(0., o.y)) + texture2D(s, u - vec2(0., o.y)));
  }
  return c;
}

void main() {
  float e = t * t * (3.0 - 2.0 * t);
  vec2 gA = grad(A, uv), gB = grad(B, uv);
  float dl = luma(texture2D(B, uv)) - luma(texture2D(A, uv));
  vec2 flow = (gA + gB) * 3.0 + vec2(dl, -dl) * .3;
  // Sharp edges (text) give huge offsets and smear into streaks, so cap how far a pixel is pulled
  flow *= min(1.0, .12 / max(length(flow), .0001));
  vec2 uA = uv - flow * e * k * .35;
  vec2 uB = uv + flow * (1.0 - e) * k * .35;
  float bl = soft * 14.0 * sin(3.14159 * e);
  vec4 a = smp(A, clamp(uA, 0., 1.), bl);
  vec4 b = smp(B, clamp(uB, 0., 1.), bl);
  gl_FragColor = mix(a, b, smoothstep(.25, .75, e));
}`;

let supported: boolean | null = null;

/** Whether this browser can run the morph (WebGL available) */
export const isMorphSupported = (): boolean => {
  if (supported === null) {
    try {
      supported = Boolean(document.createElement('canvas').getContext('webgl'));
    } catch {
      supported = false;
    }
  }
  return supported;
};

const compile = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Could not create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader error');
  return shader;
};

const makeTexture = (gl: WebGLRenderingContext, source: HTMLCanvasElement): WebGLTexture => {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Could not create texture');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
};

/**
 * Plays the morph on `canvas` (its size sets the render size).
 * Returns a function that stops it, or null if WebGL failed; the caller should then cross-fade.
 * The last frame is exactly `to`.
 */
export const runMorph = (
  canvas: HTMLCanvasElement,
  from: HTMLCanvasElement,
  to: HTMLCanvasElement,
  { duration, strength, soft, onDone }: MorphOptions
): (() => void) | null => {
  let gl: WebGLRenderingContext | null = null;
  let texA: WebGLTexture;
  let texB: WebGLTexture;
  let uniforms: Record<'A' | 'B' | 't' | 'k' | 'soft' | 'px', WebGLUniformLocation | null>;

  try {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    if (!gl) return null;

    const program = gl.createProgram();
    if (!program) return null;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    texA = makeTexture(gl, from);
    gl.activeTexture(gl.TEXTURE1);
    texB = makeTexture(gl, to);

    uniforms = {
      A: gl.getUniformLocation(program, 'A'),
      B: gl.getUniformLocation(program, 'B'),
      t: gl.getUniformLocation(program, 't'),
      k: gl.getUniformLocation(program, 'k'),
      soft: gl.getUniformLocation(program, 'soft'),
      px: gl.getUniformLocation(program, 'px'),
    };
    gl.viewport(0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }

  const context = gl;
  let frameId = 0;
  let stopped = false;
  const start = window.performance.now();

  const draw = (t: number) => {
    context.activeTexture(context.TEXTURE0);
    context.bindTexture(context.TEXTURE_2D, texA);
    context.uniform1i(uniforms.A, 0);
    context.activeTexture(context.TEXTURE1);
    context.bindTexture(context.TEXTURE_2D, texB);
    context.uniform1i(uniforms.B, 1);
    context.uniform1f(uniforms.t, t);
    context.uniform1f(uniforms.k, strength);
    context.uniform1f(uniforms.soft, soft);
    context.uniform2f(uniforms.px, 1 / canvas.width, 1 / canvas.height);
    context.drawArrays(context.TRIANGLE_STRIP, 0, 4);
  };

  const cleanup = () => {
    context.deleteTexture(texA);
    context.deleteTexture(texB);
    context.getExtension('WEBGL_lose_context')?.loseContext();
  };

  const frame = (now: number) => {
    if (stopped) return;
    const t = Math.min(1, (now - start) / duration);
    draw(t);
    if (t < 1) frameId = window.requestAnimationFrame(frame);
    else onDone(); // the last frame stays on screen until the caller stops the morph
  };
  draw(0);
  frameId = window.requestAnimationFrame(frame);

  return () => {
    stopped = true;
    window.cancelAnimationFrame(frameId);
    cleanup();
  };
};

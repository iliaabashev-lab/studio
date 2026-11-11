// Карточка работ с переходом как у adamperlis.com: при смене кадр выгибается, смазывается
// и расслаивается по цветам (красный/голубой/фиолетовый по краям), потом встаёт следующий.
// Чистый WebGL, один полноэкранный шейдер — лёгкий, без библиотек.
const VS = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
const FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA, uB;
uniform float uT, uDir, uAspect, uR;
// изгиб: кадр «гнётся» по вертикали, сильнее к краям, и сжимается к центру
vec2 bend(vec2 uv, float k) {
  vec2 c = uv - .5;
  c.y *= 1. + k * .32 * (c.x * c.x * 4.);
  c.x *= 1. + k * .18;
  c.x += uDir * k * .14 * (1. - c.y * c.y * 3.);
  return c + .5;
}
float box(vec2 uv) { // скруглённые углы
  vec2 q = abs(uv - .5) * vec2(uAspect, 1.);
  vec2 h = vec2(.5 * uAspect, .5) - uR;
  return 1. - smoothstep(0., .004, length(max(q - h, 0.)) - uR);
}
vec4 tap(sampler2D t, vec2 uv) { return (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) ? vec4(0.) : texture2D(t, uv); }
void main() {
  float k = sin(3.14159 * uT);                 // сила эффекта: 0 → 1 → 0
  vec2 uv = bend(vUv, k);
  vec2 off = vec2(uDir * .045 * k, .006 * k);   // цветное расслоение по направлению движения
  vec4 a, b; vec3 col = vec3(0.); float al = 0.;
  for (int i = 0; i < 6; i++) {                  // смаз по ходу
    float s = float(i) / 5. - .5;
    vec2 u = uv + vec2(uDir * s * .05 * k, 0.);
    vec2 ua = u + vec2(-uDir * uT * .25, 0.);
    vec2 ub = u + vec2(uDir * (1. - uT) * .25, 0.);
    float m = smoothstep(.35, .65, uT);
    vec3 ca = vec3(tap(uA, ua + off).r, tap(uA, ua).g, tap(uA, ua - off).b);
    vec3 cb = vec3(tap(uB, ub + off).r, tap(uB, ub).g, tap(uB, ub - off).b);
    col += mix(ca, cb, m);
    al += mix(tap(uA, ua).a, tap(uB, ub).a, m);
  }
  col /= 6.; al /= 6.;
  // радужная кромка на краях во время перехода
  float edge = smoothstep(.0, .06, min(min(uv.x, 1. - uv.x), min(uv.y, 1. - uv.y)));
  vec3 rainbow = .5 + .5 * cos(6.2831 * (uv.y * .8 + uT + vec3(0., .33, .67)));
  col = mix(col, rainbow, (1. - edge) * k * .4);
  float mask = box(uv);
  gl_FragColor = vec4(col * mask, mask * max(al, .0));
}`;

export function mountDial(root, slides, { reduced, onChange } = {}) {
  const cv = root.querySelector('canvas');
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: true, alpha: true });
  const fallback = () => { root.classList.add('is-static'); };
  if (!gl) { fallback(); return { go: () => {} }; }
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { fallback(); return { go: () => {} }; }
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(pr, n);
  const uA = U('uA'), uB = U('uB'), uT = U('uT'), uDir = U('uDir'), uAspect = U('uAspect'), uR = U('uR');
  gl.uniform1i(uA, 0); gl.uniform1i(uB, 1);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const tex = slides.map(() => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([230, 233, 236, 255])); return t; });
  slides.forEach((s, i) => {
    const img = new Image(); img.decoding = 'async'; img.src = s.img;
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex[i]);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      draw();
    };
  });

  let cur = 0, from = 0, to = 0, t = 1, dir = 1, anim = null;
  const size = () => {
    const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.uniform1f(uAspect, r.width / r.height); gl.uniform1f(uR, 18 / r.height);
    draw();
  };
  function draw() {
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[from]);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[to]);
    gl.uniform1f(uT, t); gl.uniform1f(uDir, dir);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function go(i, d) {
    i = (i + slides.length) % slides.length;
    if (i === cur) return;
    from = cur; to = i; cur = i; dir = d ?? (i > from ? 1 : -1);
    onChange?.(i);
    if (reduced) { from = to; t = 1; draw(); return; }
    cancelAnimationFrame(anim);
    const start = performance.now(), D = 900;
    const step = (now) => {
      const x = Math.min(1, (now - start) / D);
      t = x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; // плавный разгон и торможение
      draw();
      if (x < 1) anim = requestAnimationFrame(step); else { from = to; t = 1; draw(); }
    };
    anim = requestAnimationFrame(step);
  }
  from = to = 0; t = 1;
  size(); addEventListener('resize', size);
  // перетаскивание и свайп
  let sx = null;
  cv.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  addEventListener('pointerup', (e) => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); });
  return { go, get index() { return cur; } };
}

/* Small shared math library. No runtime dependencies; also usable in Node tests. */
(function (root) {
  'use strict';
  const A = root.Apex = root.Apex || {};
  A.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  A.lerp = (a, b, t) => a + (b - a) * t;
  A.mod = (v, n) => ((v % n) + n) % n;
  A.angle = v => A.mod(v + Math.PI, Math.PI * 2) - Math.PI;
  A.damp = (a, b, rate, dt) => A.lerp(a, b, 1 - Math.exp(-rate * dt));
  A.color = hex => {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  };
  A.random = (seed = 1977) => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  A.formatTime = seconds => {
    if (!Number.isFinite(seconds)) return '—';
    const ms = Math.max(0, Math.floor(seconds * 1000));
    return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
  };
  A.vec = {
    sub: (a, b) => a.map((v, i) => v - b[i]),
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    normalize: a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); }
  };
  A.mat = {
    identity: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    multiply(a, b) {
      const out = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
      }
      return out;
    },
    perspective(fov, aspect, near, far) {
      const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
      return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
    },
    lookAt(eye, target) {
      const z = A.vec.normalize(A.vec.sub(eye, target));
      const x = A.vec.normalize(A.vec.cross([0, 1, 0], z));
      const y = A.vec.cross(z, x);
      return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -A.vec.dot(x, eye), -A.vec.dot(y, eye), -A.vec.dot(z, eye), 1]);
    },
    model(x, y, z, heading = 0, roll = 0, scale = 1) {
      const c = Math.cos(heading), s = Math.sin(heading), cr = Math.cos(roll), sr = Math.sin(roll);
      return new Float32Array([c * cr * scale, sr * scale, -s * cr * scale, 0, -c * sr * scale, cr * scale, s * sr * scale, 0, s * scale, 0, c * scale, 0, x, y, z, 1]);
    }
  };
})(globalThis);

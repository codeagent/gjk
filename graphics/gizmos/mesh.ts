import { Mesh } from '../renderer';

const WHITE = [1.0, 1.0, 1.0];
const RED = [1.0, 0.0, 0.0];
const BLACK = [0.0, 0.0, 0.0];
const GREEN = [0.0, 1.0, 0.0];
const BLUE = [0.0, 0.0, 1.0];
const PRIMARY = [0.5, 0.5, 0.5];
const SECONDARY = [0.25, 0.25, 0.25];

export const createGrid = (): Mesh => {
  const STEP = 5.0;
  const UINT = 1.0;
  const EXPANSION = 10;

  let u = 0;
  let vertices = [];
  let indices = [];

  for (let e = 0.0; e <= EXPANSION; e += UINT) {
    if (u == 0) {
      indices.push(indices.length);
      vertices.push(-EXPANSION, 0.0, 0.0, ...PRIMARY);

      indices.push(indices.length);
      vertices.push(EXPANSION, 0.0, 0.0, ...PRIMARY);

      indices.push(indices.length);
      vertices.push(0.0, 0.0, -EXPANSION, ...PRIMARY);

      indices.push(indices.length);
      vertices.push(0.0, 0.0, EXPANSION, ...PRIMARY);
    } else {
      const color = u % STEP == 0 ? PRIMARY : SECONDARY;
      indices.push(indices.length);
      vertices.push(-EXPANSION, 0.0, e, ...color);
      indices.push(indices.length);
      vertices.push(EXPANSION, 0.0, e, ...color);
      indices.push(indices.length);
      vertices.push(-EXPANSION, 0.0, -e, ...color);
      indices.push(indices.length);
      vertices.push(EXPANSION, 0.0, -e, ...color);

      indices.push(indices.length);
      vertices.push(e, 0.0, -EXPANSION, ...color);
      indices.push(indices.length);
      vertices.push(e, 0.0, EXPANSION, ...color);
      indices.push(indices.length);
      vertices.push(-e, 0.0, -EXPANSION, ...color);
      indices.push(indices.length);
      vertices.push(-e, 0.0, EXPANSION, ...color);
    }
    u++;
  }

  return {
    vertexFormat: [
      {
        semantics: 'position',
        size: 3,
        type: WebGL2RenderingContext.FLOAT,
        slot: 0,
        offset: 0,
        stride: 24
      },
      {
        semantics: 'color',
        size: 3,
        type: WebGL2RenderingContext.FLOAT,
        slot: 1,
        offset: 12,
        stride: 24
      }
    ],
    vertexData: Float32Array.from(vertices),
    indexData: Uint16Array.from(indices)
  };
};

export const createXYRect = (size: number, wired = false): Mesh => ({
  vertexFormat: [
    {
      semantics: 'position',
      size: 3,
      type: WebGL2RenderingContext.FLOAT,
      slot: 0,
      offset: 0,
      stride: 24
    },
    {
      semantics: 'color',
      size: 3,
      type: WebGL2RenderingContext.FLOAT,
      slot: 1,
      offset: 12,
      stride: 24
    }
  ],
  vertexData: new Float32Array(
    wired
      ? [
          size,
          0.0,
          0.0,
          ...GREEN,

          size,
          size,
          0.0,
          ...GREEN,

          size,
          size,
          0.0,
          ...RED,

          0.0,
          size,
          0.0,
          ...RED
        ]
      : [
          0.0,
          0.0,
          0.0,
          ...BLACK,

          0.0,
          size,
          0.0,
          ...BLACK,

          size,
          size,
          0.0,
          ...BLACK,

          size,
          0.0,
          0.0,
          ...BLACK
        ]
  ),
  indexData: Uint16Array.from(wired ? [0, 1, 2, 3] : [0, 1, 2, 2, 3, 0])
});

export const createXZRect = (size: number, wired = false): Mesh => ({
  vertexFormat: [
    {
      semantics: 'position',
      size: 3,
      type: WebGL2RenderingContext.FLOAT,
      slot: 0,
      offset: 0,
      stride: 24
    },
    {
      semantics: 'color',
      size: 3,
      type: WebGL2RenderingContext.FLOAT,
      slot: 1,
      offset: 12,
      stride: 24
    }
  ],
  vertexData: new Float32Array(
    wired
      ? [
          size,
          0.0,
          0.0,
          ...BLUE,

          size,
          0.0,
          -size,
          ...BLUE,

          size,
          0.0,
          -size,
          ...RED,

          0.0,
          0.0,
          -size,
          ...RED
        ]
      : [
          0.0,
          0.0,
          0.0,
          ...BLACK,

          size,
          0.0,
          0.0,
          ...BLACK,

          size,
          0.0,
          -size,
          ...BLACK,

          0.0,
          0.0,
          -size,
          ...BLACK
        ]
  ),
  indexData: Uint16Array.from(wired ? [0, 1, 2, 3] : [0, 1, 2, 2, 3, 0])
});

export const createYZRect = (size: number, wired = false): Mesh => ({
  vertexFormat: [
    {
      semantics: 'position',
      size: 3,
      type: WebGL2RenderingContext.FLOAT,
      slot: 0,
      offset: 0,
      stride: 24
    },
    {
      semantics: 'color',
      size: 3,
      type: WebGL2RenderingContext.FLOAT,
      slot: 1,
      offset: 12,
      stride: 24
    }
  ],
  vertexData: new Float32Array(
    wired
      ? [
          0.0,
          size,
          0.0,
          ...BLUE,

          0.0,
          size,
          -size,
          ...BLUE,

          0.0,
          size,
          -size,
          ...GREEN,

          0.0,
          0.0,
          -size,
          ...GREEN
        ]
      : [
          0.0,
          0.0,
          0.0,
          ...BLACK,

          0.0,
          0.0,
          -size,
          ...BLACK,

          0.0,
          size,
          -size,
          ...BLACK,

          0.0,
          size,
          0.0,
          ...BLACK
        ]
  ),
  indexData: Uint16Array.from(wired ? [0, 1, 2, 3] : [0, 1, 2, 2, 3, 0])
});

export const createXYCircle = (radius: number, wired = false): Mesh => {
  const SDVNS = 64;
  const RWIDTH = 0.1;
  const vertices: number[] = [];
  const indices: number[] = [];

  if (wired) {
    const dPhi = (2.0 * Math.PI) / SDVNS;
    let phi = 0.0;
    let i = 0;
    for (i = 0; i < SDVNS; i++, phi += dPhi) {
      const x = radius * Math.cos(phi);
      const y = radius * Math.sin(phi);
      vertices.push(x, y, 0.0, ...BLUE);
      indices.push(i);
      indices.push((i + 1) % SDVNS);
    }
    vertices.push(
      0.0,
      0.0,
      0.0,
      ...BLUE,

      0,
      0,
      -radius * 0.5,
      ...BLUE
    );

    indices.push(i);
    indices.push(i + 1);
  } else {
    const dPhi = (2.0 * Math.PI) / SDVNS;

    const outer = radius * (1.0 + RWIDTH * 0.5);
    const inner = radius * (1.0 - RWIDTH * 0.5);

    for (let i = 0; i < SDVNS; i++) {
      const x0 = Math.cos(i * dPhi);
      const y0 = Math.sin(i * dPhi);
      const x1 = Math.cos(((i + 1) % SDVNS) * dPhi);
      const y1 = Math.sin(((i + 1) % SDVNS) * dPhi);

      vertices.push(outer * x0, outer * y0, 0.0, ...BLACK);
      vertices.push(outer * x1, outer * y1, 0.0, ...BLACK);
      vertices.push(inner * x1, inner * y1, 0.0, ...BLACK);
      vertices.push(inner * x0, inner * y0, 0.0, ...BLACK);

      indices.push(i * 4);
      indices.push(i * 4 + 1);
      indices.push(i * 4 + 3);

      indices.push(i * 4 + 1);
      indices.push(i * 4 + 2);
      indices.push(i * 4 + 3);
    }
  }

  return {
    vertexFormat: [
      {
        semantics: 'position',
        size: 3,
        type: WebGL2RenderingContext.FLOAT,
        slot: 0,
        offset: 0,
        stride: 24
      },
      {
        semantics: 'color',
        size: 3,
        type: WebGL2RenderingContext.FLOAT,
        slot: 1,
        offset: 12,
        stride: 24
      }
    ],
    vertexData: Float32Array.from(vertices),
    indexData: Uint16Array.from(indices)
  };
};

export const createXZCircle = (radius: number, wired = false): Mesh => {
  const SDVNS = 64;
  const RWIDTH = 0.1;
  const vertices: number[] = [];
  const indices: number[] = [];

  if (wired) {
    const dPhi = (2.0 * Math.PI) / SDVNS;
    let phi = 0.0;
    let i;
    for (i = 0; i < SDVNS; i++, phi += dPhi) {
      const x = radius * Math.cos(phi);
      const y = radius * Math.sin(phi);
      vertices.push(x, 0.0, y, ...GREEN);
      indices.push(i);
      indices.push((i + 1) % SDVNS);
    }
    vertices.push(
      0.0,
      0.0,
      0.0,
      ...GREEN,

      0,
      radius * 0.5,
      0,
      ...GREEN
    );

    indices.push(i);
    indices.push(i + 1);
  } else {
    const dPhi = (2.0 * Math.PI) / SDVNS;

    const outer = radius * (1.0 + RWIDTH * 0.5);
    const inner = radius * (1.0 - RWIDTH * 0.5);

    for (let i = 0; i < SDVNS; i++) {
      const x0 = Math.cos(i * dPhi);
      const y0 = Math.sin(i * dPhi);
      const x1 = Math.cos(((i + 1) % SDVNS) * dPhi);
      const y1 = Math.sin(((i + 1) % SDVNS) * dPhi);

      vertices.push(outer * x0, 0.0, outer * y0, ...BLACK);
      vertices.push(outer * x1, 0.0, outer * y1, ...BLACK);
      vertices.push(inner * x1, 0.0, inner * y1, ...BLACK);
      vertices.push(inner * x0, 0.0, inner * y0, ...BLACK);

      indices.push(i * 4);
      indices.push(i * 4 + 1);
      indices.push(i * 4 + 3);

      indices.push(i * 4 + 1);
      indices.push(i * 4 + 2);
      indices.push(i * 4 + 3);
    }
  }

  return {
    vertexFormat: [
      {
        semantics: 'position',
        size: 3,
        type: WebGL2RenderingContext.FLOAT,
        slot: 0,
        offset: 0,
        stride: 24
      },
      {
        semantics: 'color',
        size: 3,
        type: WebGL2RenderingContext.FLOAT,
        slot: 1,
        offset: 12,
        stride: 24
      }
    ],
    vertexData: Float32Array.from(vertices),
    indexData: Uint16Array.from(indices)
  };
};

export const createYZCircle = (radius: number, wired = false): Mesh => {
  const SDVNS = 64;
  const RWIDTH = 0.1;
  const vertices: number[] = [];
  const indices: number[] = [];

  if (wired) {
    const dPhi = (2.0 * Math.PI) / SDVNS;
    let phi = 0.0;
    let i;
    for (i = 0; i < SDVNS; i++, phi += dPhi) {
      const x = radius * Math.cos(phi);
      const y = radius * Math.sin(phi);
      vertices.push(0.0, x, y, ...RED);
      indices.push(i);
      indices.push((i + 1) % SDVNS);
    }

    vertices.push(
      0.0,
      0.0,
      0.0,
      ...RED,

      radius * 0.5,
      0,
      0,
      ...RED
    );
    indices.push(i);
    indices.push(i + 1);
  } else {
    const dPhi = (2.0 * Math.PI) / SDVNS;

    const outer = radius * (1.0 + RWIDTH * 0.5);
    const inner = radius * (1.0 - RWIDTH * 0.5);

    for (let i = 0; i < SDVNS; i++) {
      const x0 = Math.cos(i * dPhi);
      const y0 = Math.sin(i * dPhi);
      const x1 = Math.cos(((i + 1) % SDVNS) * dPhi);
      const y1 = Math.sin(((i + 1) % SDVNS) * dPhi);

      vertices.push(0.0, outer * x0, outer * y0, ...BLACK);
      vertices.push(0.0, outer * x1, outer * y1, ...BLACK);
      vertices.push(0.0, inner * x1, inner * y1, ...BLACK);
      vertices.push(0.0, inner * x0, inner * y0, ...BLACK);

      indices.push(i * 4);
      indices.push(i * 4 + 1);
      indices.push(i * 4 + 3);

      indices.push(i * 4 + 1);
      indices.push(i * 4 + 2);
      indices.push(i * 4 + 3);
    }
  }

  return {
    vertexFormat: [
      {
        semantics: 'position',
        size: 3,
        type: WebGL2RenderingContext.FLOAT,
        slot: 0,
        offset: 0,
        stride: 24
      },
      {
        semantics: 'color',
        size: 3,
        type: WebGL2RenderingContext.FLOAT,
        slot: 1,
        offset: 12,
        stride: 24
      }
    ],
    vertexData: Float32Array.from(vertices),
    indexData: Uint16Array.from(indices)
  };
};

export const createAxes = (size: number): Mesh => ({
  vertexFormat: [
    {
      semantics: 'position',
      size: 3,
      type: WebGL2RenderingContext.FLOAT,
      slot: 0,
      offset: 0,
      stride: 24
    },
    {
      semantics: 'color',
      size: 3,
      type: WebGL2RenderingContext.FLOAT,
      slot: 1,
      offset: 12,
      stride: 24
    }
  ],
  vertexData: new Float32Array([
    0.0,
    0.0,
    0.0,
    ...GREEN,

    0.0,
    size,
    0.0,
    ...GREEN,

    0.0,
    0.0,
    0.0,
    ...RED,

    size,
    0.0,
    0.0,
    ...RED,

    0.0,
    0.0,
    0.0,
    ...BLUE,

    0.0,
    0.0,
    -size,
    ...BLUE
  ]),
  indexData: Uint16Array.from([0, 1, 2, 3, 4, 5, 6, 7])
});

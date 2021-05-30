import { vec3, glMatrix } from 'gl-matrix';
import { epa } from './epa2';
import { Mesh } from './graphics';

Object.assign(glMatrix, { EPSILON: 1.0e-2 });

const SECONDARY = [0.25, 0.25, 0.25];
const WHITE = [1.0, 1.0, 1.0];

export const createTetra = (p0: vec3, p1: vec3, p2: vec3, p3: vec3): Mesh => ({
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
    ...p0,
    ...SECONDARY,
    ...p1,
    ...SECONDARY,

    ...p0,
    ...SECONDARY,
    ...p2,
    ...SECONDARY,

    ...p0,
    ...SECONDARY,
    ...p3,
    ...SECONDARY,

    ...p1,
    ...SECONDARY,
    ...p2,
    ...SECONDARY,

    ...p2,
    ...SECONDARY,
    ...p3,
    ...SECONDARY,

    ...p1,
    ...SECONDARY,
    ...p3,
    ...SECONDARY
  ]),
  indexData: Uint16Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
});

export const createTriangle = (p0: vec3, p1: vec3, p2: vec3): Mesh => ({
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
    ...p0,
    ...SECONDARY,
    ...p1,
    ...SECONDARY,

    ...p1,
    ...SECONDARY,
    ...p2,
    ...SECONDARY,

    ...p2,
    ...SECONDARY,
    ...p0,
    ...SECONDARY
  ]),
  indexData: Uint16Array.from([0, 1, 2, 3, 4, 5])
});

export const createSegment = (p0: vec3, p1: vec3): Mesh => ({
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
  vertexData: new Float32Array([...p0, ...SECONDARY, ...p1, ...SECONDARY]),
  indexData: Uint16Array.from([0, 1])
});

export const getPositions = (mesh: Mesh): vec3[] => {
  const sem = mesh.vertexFormat.find(f => f.semantics === 'position');
  const points: vec3[] = [];

  for (let i of Array.from(mesh.indexData)) {
    const offset = sem.offset / Float32Array.BYTES_PER_ELEMENT;
    const stride = sem.stride / Float32Array.BYTES_PER_ELEMENT;
    const v = vec3.fromValues(
      mesh.vertexData[offset + stride * i],
      mesh.vertexData[offset + stride * i + 1],
      mesh.vertexData[offset + stride * i + 2]
    );

    if (points.some(e => vec3.equals(e, v))) {
      continue;
    }

    points.push(v);
  }

  return points;
};

export const createMeshFromPolytop = (
  polytop: epa.Polytop,
  wired = true
): Mesh => {
  const vertexData = [];
  const indexData = [];

  if (wired) {
    for (let face of polytop) {
      for (let i = 0; i < 3; i++) {
        indexData.push(vertexData.length / 6);
        vertexData.push(...face.vertices[i], ...WHITE);

        indexData.push(vertexData.length / 6);
        vertexData.push(...face.vertices[(i + 1) % 3], ...WHITE);
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
      vertexData: Float32Array.from(vertexData),
      indexData: Uint16Array.from(indexData)
    };
  } else {
    for (let face of polytop) {
      const normal = vec3.create();
      const e0 = vec3.create();
      const e1 = vec3.create();
      vec3.subtract(e0, face.vertices[1], face.vertices[0]);
      vec3.subtract(e1, face.vertices[2], face.vertices[0]);
      vec3.cross(normal, e0, e1);
      vec3.normalize(normal, normal);

      for (let i = 0; i < 3; i++) {
        indexData.push(vertexData.length / 6);
        vertexData.push(...face.vertices[i], ...normal);
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
          semantics: 'normal',
          size: 3,
          type: WebGL2RenderingContext.FLOAT,
          slot: 1,
          offset: 12,
          stride: 24
        }
      ],
      vertexData: Float32Array.from(vertexData),
      indexData: Uint16Array.from(indexData)
    };
  }
};

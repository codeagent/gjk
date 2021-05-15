import { vec3 } from 'gl-matrix';
import { Mesh } from './graphics';

const SECONDARY = [0.25, 0.25, 0.25];

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
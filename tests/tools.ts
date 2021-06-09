import { quat, vec3 } from 'gl-matrix';

import { Mesh, MeshCollection, Transform } from '../graphics';
import { Polytop, Box, Cone, Cylinder, Polyhedra, Sphere } from '../src';

export const toEuler = (q: quat): vec3 => {
  const R2D = 180.0 / Math.PI;

  // roll (x-axis rotation)
  const sinr_cosp = 2.0 * (q[3] * q[0] + q[1] * q[2]);
  const cosr_cosp = 1.0 - 2.0 * (q[0] * q[0] + q[1] * q[1]);
  const roll = Math.atan2(sinr_cosp, cosr_cosp);

  // pitch (y-axis rotation)
  const sinp = 2.0 * (q[3] * q[1] - q[2] * q[0]);
  let pitch = 0.0;
  if (Math.abs(sinp) >= 1) {
    pitch = (Math.PI / 2.0) * Math.sign(sinp); // use 90 degrees if out of range
  } else {
    pitch = Math.asin(sinp);
  }

  // yaw (z-axis rotation)
  const siny_cosp = 2 * (q[3] * q[2] + q[0] * q[1]);
  const cosy_cosp = 1 - 2 * (q[1] * q[1] + q[2] * q[2]);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);

  return vec3.fromValues(roll * R2D, pitch * R2D, yaw * R2D);
};

export const createShape = (
  type: string,
  transform: Transform,
  meshes: MeshCollection
) => {
  if (type === 'hull1') {
    return new Polyhedra(getPositions(meshes['hull1']), transform);
  } else if (type === 'hull2') {
    return new Polyhedra(getPositions(meshes['hull2']), transform);
  } else if (type === 'box') {
    return new Box(vec3.fromValues(0.5, 0.5, 0.5), transform);
  } else if (type === 'cylinder') {
    return new Cylinder(2.0, 1.0, transform);
  } else if (type === 'cone') {
    return new Cone(2.0, 1.0, transform);
  } else {
    return new Sphere(1.0, transform);
  }
};

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

export const createMeshFromPolytop = (polytop: Polytop, wired = true): Mesh => {
  const vertexData = [];
  const indexData = [];

  if (wired) {
    for (let face of Array.from(polytop)) {
      for (let i = 0; i < 3; i++) {
        indexData.push(vertexData.length / 6);
        vertexData.push(...face.vertices[i].diff, ...WHITE);

        indexData.push(vertexData.length / 6);
        vertexData.push(...face.vertices[(i + 1) % 3].diff, ...WHITE);
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
    for (let face of Array.from(polytop)) {
      const normal = vec3.create();
      const e0 = vec3.create();
      const e1 = vec3.create();
      vec3.subtract(e0, face.vertices[1].diff, face.vertices[0].diff);
      vec3.subtract(e1, face.vertices[2].diff, face.vertices[0].diff);
      vec3.cross(normal, e0, e1);
      vec3.normalize(normal, normal);

      for (let i = 0; i < 3; i++) {
        indexData.push(vertexData.length / 6);
        vertexData.push(...face.vertices[i].diff, ...normal);
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

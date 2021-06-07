import { quat, vec3 } from 'gl-matrix';
import { MeshCollection, Transform } from '../graphics';
import { getPositions } from '../mesh';
import { Box, Cone, Cylinder, Polyhedra, Sphere } from '../shape';

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

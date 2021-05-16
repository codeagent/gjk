import { mat3, mat4, vec3 } from 'gl-matrix';
import { Transform } from './graphics';

interface ISupportMappable {
  support(transform: mat4, dir: vec3): vec3;
}

export class Polyhedra implements ISupportMappable {
  constructor(public readonly hull: vec3[]) {}

  support(transform: mat4, dir: vec3): vec3 {
    const t = mat3.fromMat4(mat3.create(), transform);
    mat3.transpose(t, t);
    const v = vec3.transformMat3(vec3.create(), dir, t);

    let maxDot = Number.NEGATIVE_INFINITY;
    const s = vec3.create();

    for (const point of this.hull) {
      const dot = vec3.dot(v, point);
      if (dot > maxDot) {
        maxDot = dot;
        vec3.copy(s, point);
      }
    }

    return vec3.transformMat4(s, s, transform);
  }
}

export class Sphere implements ISupportMappable {
  constructor(public readonly radius: number) {}

  support(transform: mat4, dir: vec3): vec3 {
    const t = mat3.fromMat4(mat3.create(), transform);
    mat3.transpose(t, t);
    const v = vec3.transformMat3(vec3.create(), dir, t);
    vec3.normalize(v, v);
    vec3.scale(v, v, this.radius);
    return vec3.transformMat4(v, v, transform);
  }
}

export class Box implements ISupportMappable {
  constructor(public readonly extents: vec3) {}

  support(transform: mat4, dir: vec3): vec3 {
    const t = mat3.fromMat4(mat3.create(), transform);
    mat3.transpose(t, t);
    const v = vec3.transformMat3(vec3.create(), dir, t);

    const s = vec3.fromValues(
      Math.sign(v[0]) * this.extents[0],
      Math.sign(v[1]) * this.extents[1],
      Math.sign(v[2]) * this.extents[2]
    );

    return vec3.transformMat4(s, s, transform);
  }
}

export class Cone implements ISupportMappable {
  constructor(public readonly extents: vec3) {}

  support(transform: mat4, dir: vec3): vec3 {
    // @todo:
    return vec3.create();
  }
}

export class Cylinder implements ISupportMappable {
  constructor(public readonly extents: vec3) {}

  support(transform: mat4, dir: vec3): vec3 {
    // @todo:
    return vec3.create();
  }
}

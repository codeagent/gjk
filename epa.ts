import { vec2, vec3 } from 'gl-matrix';
import { gjk } from './gjk';

export namespace epa {
  interface Face<T> {
    vertices: [T, T, T];
    siblings: [Face<T>, Face<T>, Face<T>];
    distance: number;
  }

  interface Polytop<T = vec3> {
    vertices: T[];
    faces: Set<Face<T>>;
    queue: Face<T>[];
  }

  const calcFaceDistance = (face: Face<vec3>): number => {
    const O = vec3.create();
    const a = vec3.create();
    const x = vec3.create();
    vec3.subtract(a, face.vertices[1], face.vertices[0]);
    vec3.subtract(x, face.vertices[1], face.vertices[0]);
    vec3.cross(x, a, x);
    const length = vec3.length(x);
    return vec3.dot(O, x) / length;
  };

  const pushFaceBack = (face: Face<vec3>, queue: Face<vec3>[]): number => {
    if (!face.distance) {
      calcFaceDistance(face);
    }

    queue.push(face);

    let i;
    for (
      i = queue.length - 1;
      i > 0 && queue[i - 1].distance > queue[i].distance;
      i--
    ) {
      const tmp = queue[i - 1];
      queue[i - 1] = queue[i];
      queue[i] = tmp;
    }

    return i;
  };

  const pushFaceForward = (face: Face<vec3>, queue: Face<vec3>[]): number => {
    if (!face.distance) {
      calcFaceDistance(face);
    }

    queue.unshift(face);

    let i;
    for (
      i = 0;
      i < queue.length - 1 && queue[i + 1].distance < queue[i].distance;
      i++
    ) {
      const tmp = queue[i + 1];
      queue[i + 1] = queue[i];
      queue[i] = tmp;
    }

    return i;
  };

  export const polytopFromSimplex = (simplex: gjk.Simplex<vec3>): Polytop => {
    const vertices = Array.from(simplex);

    const w1w0 = vec3.create();
    const w2w0 = vec3.create();
    vec3.subtract(w1w0, vertices[1], vertices[0]);
    vec3.subtract(w2w0, vertices[2], vertices[0]);

    const x = vec3.create();
    vec3.cross(x, w2w0, w1w0);

    const w3w0 = vec3.create();
    vec3.subtract(w3w0, vertices[3], vertices[0]);

    // preserve ccw orientation: swap w1 and w2
    if (vec3.dot(w3w0, x) > 0.0) {
      const tmp = vertices[2];
      vertices[2] = vertices[1];
      vertices[1] = tmp;
    }

    const face0: Face<vec3> = {
      vertices: [vertices[0], vertices[1], vertices[3]],
      siblings: null,
      distance: 0.0
    };

    const face1: Face<vec3> = {
      vertices: [vertices[1], vertices[2], vertices[3]],
      siblings: null,
      distance: 0.0
    };

    const face2: Face<vec3> = {
      vertices: [vertices[2], vertices[0], vertices[3]],
      siblings: null,
      distance: 0.0
    };

    const face3: Face<vec3> = {
      vertices: [vertices[1], vertices[0], vertices[2]],
      siblings: null,
      distance: 0.0
    };

    face0.siblings = [face3, face1, face2];
    face1.siblings = [face3, face2, face0];
    face2.siblings = [face3, face0, face1];
    face3.siblings = [face0, face2, face1];

    const faces = new Set<Face<vec3>>([face0, face1, face2, face3]);
    const queue: Face<vec3>[] = [];

    for (let face of faces) {
      pushFaceBack(face, queue);
    }

    return { vertices, faces, queue };
  };

  export const subdivide = (polytop: Polytop, shape: gjk.ShapeInterface) => {
    const O = vec3.create();
    const face = polytop.queue.shift();
    polytop.faces.delete(face);

    // Closest to face
    const b3 = vec3.create();
    gjk.closestPointToTriangle(
      b3,
      face.vertices[0],
      face.vertices[1],
      face.vertices[2],
      O
    );

    const w4 = vec3.create();
    gjk.fromBarycentric(
      w4,
      [face.vertices[0], face.vertices[1], face.vertices[2]],
      b3
    );
    shape.support(w4, w4);

    // w0-w1
    const b2 = vec2.create();
    gjk.closestPointToLineSegment(b2, face.vertices[0], face.vertices[1], O);
    const w0h = vec3.create();
    gjk.fromBarycentric(w0h, [face.vertices[0], face.vertices[1]], b2);
    shape.support(w0h, w0h);

    // w1-w2
    gjk.closestPointToLineSegment(b2, face.vertices[1], face.vertices[2], O);
    const w1h = vec3.create();
    gjk.fromBarycentric(w1h, [face.vertices[1], face.vertices[2]], b2);
    shape.support(w1h, w1h);

    // w2-w0
    gjk.closestPointToLineSegment(b2, face.vertices[2], face.vertices[0], O);
    const w2h = vec3.create();
    gjk.fromBarycentric(w2h, [face.vertices[2], face.vertices[0]], b2);
    shape.support(w2h, w2h);

    // split current face
    const f00 = {
      vertices: [face.vertices[0], w0h, w4],
      distance: 0.0
    };

    face.siblings[0].
  };

  export const contactNormal = (
    shape0: gjk.ShapeInterface,
    shape1: gjk.ShapeInterface,
    simplex: gjk.Simplex<gjk.SupportPoint>
  ): vec3 => {
    return vec3.fromValues(0.0, 0.0, 0.0);
  };
}

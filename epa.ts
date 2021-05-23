import { vec2, vec3 } from 'gl-matrix';
import { gjk } from './gjk';
import { PriorityQueue } from './priority-queue';

export namespace epa {
  interface Face<T> {
    vertices: [T, T, T];
    siblings: [Face<T>, Face<T>, Face<T>];
    distance: number;
  }

  type Polytop<T = vec3> = PriorityQueue<Face<T>>;

  const calcFaceDistance = (face: Face<vec3>): number => {
    const O = vec3.create();
    const a = vec3.create();
    const x = vec3.create();
    vec3.subtract(a, face.vertices[1], face.vertices[0]);
    vec3.subtract(x, face.vertices[1], face.vertices[0]);
    vec3.cross(x, a, x);
    const length = vec3.length(x);
    return Math.abs(vec3.dot(O, x)) / length;
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
    // @todo:??
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

    const queue = new PriorityQueue<Face<vec3>>(
      (a: Face<vec3>, b: Face<vec3>) => a.distance - b.distance
    );

    for (let face of [face0, face1, face2, face3]) {
      calcFaceDistance(face);
      queue.enqueue(face);
    }

    return queue;
  };

  export const subdivide = (polytop: Polytop, shape: gjk.ShapeInterface) => {
    const O = vec3.create();
    const face = polytop.dequeue();

    const w0 = face.vertices[0];
    const w1 = face.vertices[1];
    const w2 = face.vertices[2];

    // Closest to face
    const b3 = vec3.create();
    gjk.closestPointToTriangle(b3, w0, w1, w2, O);

    const w4 = vec3.create();
    gjk.fromBarycentric(
      w4,
      [face.vertices[0], face.vertices[1], face.vertices[2]],
      b3
    );
    shape.support(w4, w4);

    // w0-w1
    const b2 = vec2.create();
    gjk.closestPointToLineSegment(b2, w0, w1, O);
    const w0h = vec3.create();
    gjk.fromBarycentric(w0h, [w0, w1], b2);
    shape.support(w0h, w0h);

    // w1-w2
    gjk.closestPointToLineSegment(b2, w1, w2, O);
    const w1h = vec3.create();
    gjk.fromBarycentric(w1h, [w1, w2], b2);
    shape.support(w1h, w1h);

    // w2-w0
    gjk.closestPointToLineSegment(b2, w2, w0, O);
    const w2h = vec3.create();
    gjk.fromBarycentric(w2h, [w2, w0], b2);
    shape.support(w2h, w2h);

    // split current face
    const f0 = {
      vertices: [w0, w4, w2h],
      siblings: null,
      distance: 0.0
    };
    const f1 = {
      vertices: [w0, w0h, w4],
      siblings: null,
      distance: 0.0
    };

    const f2 = {
      vertices: [w1, w4, w0h],
      siblings: null,
      distance: 0.0
    };
    const f3 = {
      vertices: [w1, w1h, w4],
      siblings: null,
      distance: 0.0
    };

    const f4 = {
      vertices: [w2, w4, w1h],
      siblings: null,
      distance: 0.0
    };
    const f5 = {
      vertices: [w2, w2h, w4],
      siblings: null,
      distance: 0.0
    };

    // split sibling0
    const ws0Index =
      face.siblings[0].vertices[0] !== w0 && face.siblings[0].vertices[0] !== w1
        ? 0
        : face.siblings[0].vertices[1] !== w0 &&
          face.siblings[0].vertices[1] !== w1
        ? 1
        : 2;

    const ws0 = face.siblings[0].vertices[ws0Index];
    const s0s = face.siblings[(ws0Index + 2) % 3];
    const s1s = face.siblings[ws0Index];

    const s0 = {
      vertices: [ws0, w0h, w0],
      siblings: null,
      distance: 0.0
    };
    const s1 = {
      vertices: [ws0, w1, w0h],
      siblings: null,
      distance: 0.0
    };

    // split sibling1
    const ws1Index =
      face.siblings[1].vertices[0] !== w0 && face.siblings[1].vertices[0] !== w1
        ? 0
        : face.siblings[1].vertices[1] !== w0 &&
          face.siblings[1].vertices[1] !== w1
        ? 1
        : 2;

    const ws1 = face.siblings[1].vertices[ws1Index];
    const s2s = face.siblings[(ws1Index + 2) % 3];
    const s3s = face.siblings[ws1Index];
    const s2 = {
      vertices: [ws1, w1h, w1],
      siblings: null,
      distance: 0.0
    };
    const s3 = {
      vertices: [ws1, w2, w1h],
      siblings: null,
      distance: 0.0
    };

    // split sibling2
    const ws2Index =
      face.siblings[2].vertices[0] !== w0 && face.siblings[2].vertices[0] !== w1
        ? 0
        : face.siblings[2].vertices[1] !== w0 &&
          face.siblings[2].vertices[1] !== w1
        ? 1
        : 2;
    const ws2 = face.siblings[2].vertices[ws2Index];
    const s4s = face.siblings[(ws2Index + 2) % 3];
    const s5s = face.siblings[ws2Index];
    const s4 = {
      vertices: [ws2, w2h, w2],
      siblings: null,
      distance: 0.0
    };
    const s5 = {
      vertices: [ws2, w0, w2h],
      siblings: null,
      distance: 0.0
    };

    // assignning to neighbours
    f0.siblings = [f1, f5, s5];
    f1.siblings = [s0, f2, f0];
    f2.siblings = [f3, f1, s1];
    f3.siblings = [s2, f4, f2];
    f4.siblings = [f5, f3, s3];
    f5.siblings = [s4, f0, f4];

    // s0.siblings = [s1, f1, s0s];
    // s0s
  };

  export const contactNormal = (
    shape0: gjk.ShapeInterface,
    shape1: gjk.ShapeInterface,
    simplex: gjk.Simplex<gjk.SupportPoint>
  ): vec3 => {
    return vec3.fromValues(0.0, 0.0, 0.0);
  };
}

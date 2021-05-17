import { glMatrix, vec2, vec3, vec4 } from 'gl-matrix';

import { gjk } from './gjk';

declare global {
  namespace jasmine {
    interface Matchers<T> {
      toBeCloseToPoint(point: vec3): boolean;
      toBeCloseToPoint(point: vec4): boolean;
    }
  }
}

describe('gjk', () => {
  beforeEach(function() {
    Object.assign(glMatrix, { EPSILON: 1.0e-2 });

    jasmine.addMatchers({
      toBeCloseToPoint: () => ({
        compare: <T extends Float32Array>(actual: T, expected: T) => ({
          pass:
            actual.length === 3
              ? vec3.equals(actual, expected)
              : vec4.equals(actual, expected)
        })
      })
    });
  });

  describe('closestPointToTetrahedron', () => {
    const createCombinations = (points: vec3[]) => {
      const combinations = new Array<vec3[]>();

      for (let i = 0; i < points.length - 1; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const combination = Array.from(points);
          combination[i] = points[j];
          combination[j] = points[i];
          combinations.push(combination);
        }
      }

      return combinations.concat();
    };

    const barycentric = vec4.create();

    describe('should get closest points to all vertices', () => {
      it('vertex 0', () => {
        // Arrange
        let point = vec3.fromValues(0.26, 2.12, -0.3);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(0.0, 1.0, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(-2.0, 0.25, 2)
        ]);

        // Act
        const closests = [];
        for (let tetra of combinations) {
          gjk.closestPointToTetrahedron(
            barycentric,
            tetra[0],
            tetra[1],
            tetra[2],
            tetra[3],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tetra, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(0.0, 1.0, 0.0);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });

      it('vertex 1', () => {
        // Arrange
        let point = vec3.fromValues(3.26, 1.0, 1.14);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(0.0, 1.0, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(-2.0, 0.25, 2)
        ]);

        // Act
        const closests = [];
        for (let tetra of combinations) {
          gjk.closestPointToTetrahedron(
            barycentric,
            tetra[0],
            tetra[1],
            tetra[2],
            tetra[3],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tetra, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(2.0, -0.25, 0.0);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });

      it('vertex 2', () => {
        // Arrange
        let point = vec3.fromValues(-3.52, -0.86, 2.55);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(0.0, 1.0, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(-2.0, 0.25, 2)
        ]);

        // Act
        const closests = [];
        for (let tetra of combinations) {
          gjk.closestPointToTetrahedron(
            barycentric,
            tetra[0],
            tetra[1],
            tetra[2],
            tetra[3],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tetra, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(-2.0, 0.25, 2.0);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });

      it('vertex 3', () => {
        // Arrange
        let point = vec3.fromValues(-1.68, 1.0, -2.96);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(0.0, 1.0, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(-2.0, 0.25, 2)
        ]);

        // Act
        const closests = [];
        for (let tetra of combinations) {
          gjk.closestPointToTetrahedron(
            barycentric,
            tetra[0],
            tetra[1],
            tetra[2],
            tetra[3],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tetra, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(-1.99, -0.14, -1.99);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });
    });

    describe('should get closest points to all edges', () => {
      it('edge 0', () => {
        // Arrange
        let point = vec3.fromValues(1.27, 1.0, 4.05);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(0.0, 1.0, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(-2.0, 0.25, 2)
        ]);

        // Act
        const closests = [];
        for (let tetra of combinations) {
          gjk.closestPointToTetrahedron(
            barycentric,
            tetra[0],
            tetra[1],
            tetra[2],
            tetra[3],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tetra, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(-0.3, 0.04, 1.15);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });

      it('edge 1', () => {
        // Arrange
        let point = vec3.fromValues(-3.92, -0.89, -1.28);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(0.0, 1.0, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(-2.0, 0.25, 2)
        ]);

        // Act
        const closests = [];
        for (let tetra of combinations) {
          gjk.closestPointToTetrahedron(
            barycentric,
            tetra[0],
            tetra[1],
            tetra[2],
            tetra[3],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tetra, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(-2.0, -0.09, -1.36);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });

      it('edge 2', () => {
        // Arrange
        let point = vec3.fromValues(1.93, 2.52, -6.12);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(0.0, 1.0, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(-2.0, 0.25, 2)
        ]);

        // Act
        const closests = [];
        for (let tetra of combinations) {
          gjk.closestPointToTetrahedron(
            barycentric,
            tetra[0],
            tetra[1],
            tetra[2],
            tetra[3],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tetra, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(-0.56, -0.19, -1.28);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });

      it('edge 3', () => {
        // Arrange
        let point = vec3.fromValues(-1.09, 5.52, 1.35);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(0.0, 1.0, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(-2.0, 0.25, 2)
        ]);

        // Act
        const closests = [];
        for (let tetra of combinations) {
          gjk.closestPointToTetrahedron(
            barycentric,
            tetra[0],
            tetra[1],
            tetra[2],
            tetra[3],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tetra, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(-0.34, 0.87, 0.34);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });

      it('edge 4', () => {
        // Arrange
        let point = vec3.fromValues(-0.73, 1.49, -3.39);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(0.0, 1.0, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(-2.0, 0.25, 2)
        ]);

        // Act
        const closests = [];
        for (let tetra of combinations) {
          gjk.closestPointToTetrahedron(
            barycentric,
            tetra[0],
            tetra[1],
            tetra[2],
            tetra[3],
            point
          );

          closests.push(gjk.fromBarycentric(vec3.create(), tetra, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(-1.64, 0.04, -1.65);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });

      it('edge 5', () => {
        // Arrange
        let point = vec3.fromValues(2.2, 2.05, -1.02);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(0.0, 1.0, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(-2.0, 0.25, 2)
        ]);

        // Act
        const closests = [];
        for (let tetra of combinations) {
          gjk.closestPointToTetrahedron(
            barycentric,
            tetra[0],
            tetra[1],
            tetra[2],
            tetra[3],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tetra, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(1.11, 0.3, 0.0);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });
    });

    describe('should get closest points to all faces', () => {
      it('face 0', () => {
        // Arrange
        let point = vec3.fromValues(0.45, 2.5, 3.11);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(0.0, 1.0, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(-2.0, 0.25, 2)
        ]);

        // Act
        const closests = [];
        for (let tetra of combinations) {
          gjk.closestPointToTetrahedron(
            barycentric,
            tetra[0],
            tetra[1],
            tetra[2],
            tetra[3],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tetra, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(-0.83, 0.45, 1.07);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });

      it('face 1', () => {
        // Arrange
        let point = vec3.fromValues(-2.94, 3.13, -1.34);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(0.0, 1.0, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(-2.0, 0.25, 2)
        ]);

        // Act
        const closests = [];
        for (let tetra of combinations) {
          gjk.closestPointToTetrahedron(
            barycentric,
            tetra[0],
            tetra[1],
            tetra[2],
            tetra[3],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tetra, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(-1.53, 0.17, -1.04);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });

      it('face 2', () => {
        // Arrange
        let point = vec3.fromValues(2.66, 3.07, -3.86);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(0.0, 1.0, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(-2.0, 0.25, 2)
        ]);

        // Act
        const closests = [];
        for (let tetra of combinations) {
          gjk.closestPointToTetrahedron(
            barycentric,
            tetra[0],
            tetra[1],
            tetra[2],
            tetra[3],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tetra, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(0.81, 0.12, -0.31);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });

      it('face 3', () => {
        // Arrange
        let point = vec3.fromValues(-1.48, -1.78, -1.15);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(0.0, 1.0, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(-2.0, 0.25, 2)
        ]);

        // Act
        const closests = [];
        for (let tetra of combinations) {
          gjk.closestPointToTetrahedron(
            barycentric,
            tetra[0],
            tetra[1],
            tetra[2],
            tetra[3],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tetra, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(-1.35, -0.13, -1.31);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });
    });

    it('should get closest point inside of tetra', () => {
      // Arrange
      let point = vec3.fromValues(-0.62, 0.15, 0.4);
      let combinations = createCombinations([
        vec3.fromValues(2.0, -0.25, 0.0),
        vec3.fromValues(0.0, 1.0, 0.0),
        vec3.fromValues(-2.0, -0.15, -2),
        vec3.fromValues(-2.0, 0.25, 2)
      ]);

      // Act
      const barycentric = [];
      for (let tetra of combinations) {
        const b = vec4.create();
        gjk.closestPointToTetrahedron(
          b,
          tetra[0],
          tetra[1],
          tetra[2],
          tetra[3],
          point
        );
        barycentric.push(b);
      }

      // Assert
      const expected = vec4.fromValues(-1.0, -1.0, -1.0, -1.0);
      for (let bary of barycentric) {
        expect(bary).toBeCloseToPoint(expected);
      }
    });
  });

  describe('closestPointToTriangle', () => {
    const createCombinations = (points: vec3[]) => {
      const combinations = new Array<vec3[]>();

      for (let i = 0; i < points.length - 1; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const combination = Array.from(points);
          combination[i] = points[j];
          combination[j] = points[i];
          combinations.push(combination);
        }
      }

      return combinations.concat();
    };

    const barycentric = vec3.create();

    describe('should get closest points to all vertices', () => {
      it('vertex 0', () => {
        // Arrange
        let point = vec3.fromValues(-3.89, 1.0, -1.45);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(0.0, 1.0, 0.0)
        ]);

        // Act
        const closests = [];
        for (let tri of combinations) {
          gjk.closestPointToTriangle(
            barycentric,
            tri[0],
            tri[1],
            tri[2],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tri, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(-2.0, -0.15, -2.0);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });

      it('vertex 1', () => {
        // Arrange
        let point = vec3.fromValues(3.2, -3.99, -0.95);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(0.0, 1.0, 0.0)
        ]);

        // Act
        const closests = [];
        for (let tri of combinations) {
          gjk.closestPointToTriangle(
            barycentric,
            tri[0],
            tri[1],
            tri[2],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tri, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(2.0, -0.25, 0.0);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });

      it('vertex 2', () => {
        // Arrange
        let point = vec3.fromValues(-2.83, 0.81, 7.15);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(0.0, 1.0, 0.0)
        ]);

        // Act
        const closests = [];
        for (let tri of combinations) {
          gjk.closestPointToTriangle(
            barycentric,
            tri[0],
            tri[1],
            tri[2],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tri, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(0.0, 1.0, 0.0);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });
    });

    describe('should get closest points to all edges', () => {
      it('edge 0', () => {
        // Arrange
        let point = vec3.fromValues(-4.09, 0.81, 1.75);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(0.0, 1.0, 0.0)
        ]);

        // Act
        const closests = [];
        for (let tri of combinations) {
          gjk.closestPointToTriangle(
            barycentric,
            tri[0],
            tri[1],
            tri[2],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tri, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(-1.05, 0.4, -1.05);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });

      it('edge 1', () => {
        // Arrange
        let point = vec3.fromValues(2.17, -4.37, -0.98);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(0.0, 1.0, 0.0)
        ]);

        // Act
        const closests = [];
        for (let tri of combinations) {
          gjk.closestPointToTriangle(
            barycentric,
            tri[0],
            tri[1],
            tri[2],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tri, barycentric));
        }
        // Assert
        const expected = vec3.fromValues(1.82, -0.25, -0.09);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });

      it('edge 2', () => {
        // Arrange
        let point = vec3.fromValues(-0.5, -2.12, 5.88);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(0.0, 1.0, 0.0)
        ]);

        // Act
        const closests = [];
        for (let tri of combinations) {
          gjk.closestPointToTriangle(
            barycentric,
            tri[0],
            tri[1],
            tri[2],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tri, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(1.04, 0.35, 0.0);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });
    });

    describe('should get closest points to face', () => {
      it('face 0', () => {
        // Arrange
        let point = vec3.fromValues(0.6, 1.74, -2.6);
        let combinations = createCombinations([
          vec3.fromValues(2.0, -0.25, 0.0),
          vec3.fromValues(-2.0, -0.15, -2),
          vec3.fromValues(0.0, 1.0, 0.0)
        ]);

        // Act
        const closests = [];
        for (let tri of combinations) {
          gjk.closestPointToTriangle(
            barycentric,
            tri[0],
            tri[1],
            tri[2],
            point
          );
          closests.push(gjk.fromBarycentric(vec3.create(), tri, barycentric));
        }

        // Assert
        const expected = vec3.fromValues(-0.33, 0.24, -0.8);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });
    });
  });

  describe('closestPointToLineSegment', () => {
    const createCombinations = (points: vec3[]) => {
      const combinations = new Array<vec3[]>();

      for (let i = 0; i < points.length - 1; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const combination = Array.from(points);
          combination[i] = points[j];
          combination[j] = points[i];
          combinations.push(combination);
        }
      }

      return combinations.concat();
    };

    const barycentric = vec2.create();

    it('should get closest point at begin', () => {
      // Arrange
      let point = vec3.fromValues(2.53, 1.8, 2.66);
      let combinations = createCombinations([
        vec3.fromValues(2.0, -0.25, 0.0),
        vec3.fromValues(-2.0, -0.15, -2)
      ]);

      const closests = [];
      for (let seg of combinations) {
        gjk.closestPointToLineSegment(barycentric, seg[0], seg[1], point);
        closests.push(gjk.fromBarycentric(vec3.create(), seg, barycentric));
      }

      // Assert
      const expected = vec3.fromValues(2.0, -0.25, 0.0);
      for (let closest of closests) {
        expect(closest).toBeCloseToPoint(expected);
      }
    });

    it('should get closest point at end', () => {
      // Arrange
      let point = vec3.fromValues(-2.65, -0.89, -4.79);
      let combinations = createCombinations([
        vec3.fromValues(2.0, -0.25, 0.0),
        vec3.fromValues(-2.0, -0.15, -2)
      ]);

      // Act
      const closests = [];
      for (let seg of combinations) {
        gjk.closestPointToLineSegment(barycentric, seg[0], seg[1], point);
        closests.push(gjk.fromBarycentric(vec3.create(), seg, barycentric));
      }

      // Assert
      const expected = vec3.fromValues(-2.0, -0.15, -2);
      for (let closest of closests) {
        expect(closest).toBeCloseToPoint(expected);
      }
    });

    it('should get closest point in betwen', () => {
      // Arrange
      let point = vec3.fromValues(-1.0, 1.81, -2.01);
      let combinations = createCombinations([
        vec3.fromValues(2.0, -0.25, 0.0),
        vec3.fromValues(-2.0, -0.15, -2)
      ]);

      // Act
      const closests = [];
      for (let seg of combinations) {
        gjk.closestPointToLineSegment(barycentric, seg[0], seg[1], point);
        closests.push(gjk.fromBarycentric(vec3.create(), seg, barycentric));
      }

      // Assert
      const expected = vec3.fromValues(-1.25, -0.17, -1.62);
      for (let closest of closests) {
        expect(closest).toBeCloseToPoint(expected);
      }
    });
  });
});

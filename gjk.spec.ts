import { glMatrix, vec3 } from 'gl-matrix';
import { closestPointToTetrahedron } from './gjk';

declare namespace jasmine {
  interface FunctionMatchers {
    toBeCloseToPoint(point: vec3): boolean;
  }
}

describe('gjk', () => {
  beforeEach(function() {
    Object.assign(glMatrix, { EPSILON: 1.0e-2 });

    jasmine.addMatchers({
      toBeCloseToPoint: () => ({
        compare: (actual: vec3, expected: vec3) => {
          return {
            pass: vec3.equals(actual, expected)
          };
        }
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
          closests.push(
            closestPointToTetrahedron(
              tetra[0],
              tetra[1],
              tetra[2],
              tetra[3],
              point
            )
          );
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
          closests.push(
            closestPointToTetrahedron(
              tetra[0],
              tetra[1],
              tetra[2],
              tetra[3],
              point
            )
          );
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

        console.log(combinations);
        // Act
        const closests = [];
        for (let tetra of combinations) {
          closests.push(
            closestPointToTetrahedron(
              tetra[0],
              tetra[1],
              tetra[2],
              tetra[3],
              point
            )
          );
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

        console.log(combinations);
        // Act
        const closests = [];
        for (let tetra of combinations) {
          closests.push(
            closestPointToTetrahedron(
              tetra[0],
              tetra[1],
              tetra[2],
              tetra[3],
              point
            )
          );
        }

        // Assert
        const expected = vec3.fromValues(-1.99, -0.14, -1.99);
        for (let closest of closests) {
          expect(closest).toBeCloseToPoint(expected);
        }
      });
    });

    describe('should get closest points to all edges', () => {
      it('edge 0', () => {});
    });
  });
});

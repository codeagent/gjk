import { vec3, vec4 } from 'gl-matrix';

import { Transform } from '../graphics';
import { closestPoints } from '../src';
import TestViewportBase from './test-viewport-base.class';

export class ClosestsView extends TestViewportBase {
  private closestPoints: [vec3, vec3] = [vec3.create(), vec3.create()];


  protected test() {
    this.simplex.clear();

    const dir = vec3.create();
    vec3.subtract(
      dir,
      this.axes1.targetTransform.position,
      this.axes2.targetTransform.position
    );

    const distance = closestPoints(
      this.simplex,
      this.closestPoints,
      this.shape1,
      this.shape2,
      dir,
      this.gjkPanel.state.epsilon,
      this.gjkPanel.state.maxIterations,
      this.debug
    );

    if (distance) {
      this.drawables[3].transform.position = this.closestPoints[0];
      this.drawables[4].transform.position = this.closestPoints[1];
    } else {
      this.drawables[3].transform.position = this.drawables[4].transform.position = vec3.create();
    }
  }

  protected boostrap(canvas: HTMLCanvasElement) {
    super.boostrap(canvas);
    this.drawables.push(
      {
        material: {
          shader: this.phongShader,
          uniforms: {
            albedo: vec4.fromValues(1.0, 0.2, 1.0, 1.0)
          },
          state: { cullFace: false }
        },
        geometry: this.geometries.get('sphere'),
        transform: new Transform(
          vec3.fromValues(0.0, 0.0, 0.0),
          vec3.fromValues(0.1, 0.1, 0.1)
        )
      },
      {
        material: {
          shader: this.phongShader,
          uniforms: {
            albedo: vec4.fromValues(1.0, 0.2, 1.0, 1.0)
          },
          state: { cullFace: false }
        },
        geometry: this.geometries.get('sphere'),
        transform: new Transform(
          vec3.fromValues(0.0, 0.0, 0.0),
          vec3.fromValues(0.1, 0.1, 0.1)
        )
      }
    );
  }
}

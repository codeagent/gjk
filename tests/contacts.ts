import { vec3, vec4 } from 'gl-matrix';
import { Transform } from '../graphics';

import { areIntersect, contactPoints } from '../src';
import TestViewportBase from './test-viewport-base.class';

export class ContactsView extends TestViewportBase {
  private contactPoints: [vec3, vec3] = [vec3.create(), vec3.create()];

  protected test() {
    this.simplex.clear();

    const dir = vec3.create();
    vec3.subtract(
      dir,
      this.axes1.targetTransform.position,
      this.axes2.targetTransform.position
    );
    const hasIntersection = areIntersect(
      this.simplex,
      this.shape1,
      this.shape2,
      dir,
      this.gjkPanel.state.epsilon,
      this.gjkPanel.state.maxIterations
    );

    let distance = 0.0;
    if (
      hasIntersection &&
      (distance = contactPoints(
        this.contactPoints,
        this.shape1,
        this.shape2,
        this.simplex,
        this.gjkPanel.state.epsilon,
        this.gjkPanel.state.maxIterations
      )) > this.gjkPanel.state.epsilon
    ) {
      this.drawables[3].transform.position = this.contactPoints[0];
      this.drawables[4].transform.position = this.contactPoints[1];
    } else {
      this.drawables[3].transform.position = this.drawables[4].transform.position = vec3.create();
    }
  }

  protected draw() {
    this.renderer.setRenderTarget(null);
    this.renderer.clear();

    for (const drawable of [
      this.drawables[0],
      this.drawables[1],
      this.drawables[2]
    ]) {
      this.renderer.drawGeometry(this.cameraController.camera, drawable);
    }

    this.renderer.clear(WebGL2RenderingContext.DEPTH_BUFFER_BIT);
    for (const drawable of [this.drawables[3], this.drawables[4]]) {
      this.renderer.drawGeometry(this.cameraController.camera, drawable);
    }

    this.renderer.clear(WebGL2RenderingContext.DEPTH_BUFFER_BIT);
    this.axes1.draw('viewport');
    this.axes2.draw('viewport');

    this.renderer.setRenderTarget(this.idFrameBuffer);
    this.renderer.clear();
    this.axes1.draw('id');
    this.axes2.draw('id');
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

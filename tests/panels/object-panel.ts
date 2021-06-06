import { vec3 } from 'gl-matrix';
import { BehaviorSubject, fromEvent, merge, Subject } from 'rxjs';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';

export interface ObjectPanelOptions {
  objectType: 'sphere' | 'box' | 'cylinder' | 'cone' | 'hull1' | 'hull2';
  position: vec3;
  orientation: vec3;
}

export class ObjectPanel {
  private readonly state$ = new BehaviorSubject<ObjectPanelOptions>(null);
  private readonly release$ = new Subject<void>();

  private type: HTMLSelectElement;
  private x: HTMLInputElement;
  private y: HTMLInputElement;
  private z: HTMLInputElement;
  private rx: HTMLInputElement;
  private ry: HTMLInputElement;
  private rz: HTMLInputElement;

  constructor(
    readonly element: HTMLElement,
    readonly options: ObjectPanelOptions
  ) {
    this.state$.next(options);

    this.attachListeners(element);
    this.write(options);
  }

  private attachListeners(element: HTMLElement) {
    this.type = element.querySelector('select');
    this.x = element.querySelector<HTMLInputElement>('input.x');
    this.y = element.querySelector<HTMLInputElement>('input.y');
    this.z = element.querySelector<HTMLInputElement>('input.z');
    this.rx = element.querySelector<HTMLInputElement>('input.rx');
    this.ry = element.querySelector<HTMLInputElement>('input.ry');
    this.rz = element.querySelector<HTMLInputElement>('input.rz');

    merge(
      fromEvent(this.type, 'change').pipe(
        map(() => ({ ...this.state$.value, objectType: this.type.value }))
      ),

      merge(
        fromEvent(this.x, 'input'),
        fromEvent(this.y, 'input'),
        fromEvent(this.z, 'input')
      ).pipe(
        map(() => ({
          ...this.state$.value,
          position: vec3.fromValues(+this.x.value, +this.y.value, +this.z.value)
        }))
      ),

      merge(
        fromEvent(this.rx, 'input'),
        fromEvent(this.ry, 'input'),
        fromEvent(this.rz, 'input')
      ).pipe(
        map(() => ({
          ...this.state$.value,
          orientation: vec3.fromValues(
            +this.rx.value,
            +this.ry.value,
            +this.rz.value
          )
        }))
      )
    )
      .pipe(takeUntil(this.release$))
      .subscribe((options: ObjectPanelOptions) => this.state$.next(options));
  }

  write(options: ObjectPanelOptions) {
    this.type.value = options.objectType;
    this.x.value = `${options.position[0]}`;
    this.y.value = `${options.position[1]}`;
    this.z.value = `${options.position[2]}`;
    this.rx.value = `${options.orientation[0]}`;
    this.ry.value = `${options.orientation[1]}`;
    this.rz.value = `${options.orientation[2]}`;
  }

  onChanges() {
    return this.state$.asObservable();
  }

  release() {
    this.release$.next();
  }
}

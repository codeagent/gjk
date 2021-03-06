import { vec3 } from 'gl-matrix';
import { BehaviorSubject, fromEvent, merge, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

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

  get state(): ObjectPanelOptions {
    return this.state$.value;
  }

  constructor(
    private readonly element: HTMLElement,
    readonly options: ObjectPanelOptions
  ) {
    this.state$.next(options);
    this.activate(element);
    this.attachListeners(element);
    this.write(options);
  }

  private activate(element: HTMLElement) {
    element.style.display = 'block';
  }

  private deactivate(element: HTMLElement) {
    element.style.display = 'none';
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
      fromEvent(this.type, 'change'),
      fromEvent(this.x, 'input'),
      fromEvent(this.y, 'input'),
      fromEvent(this.z, 'input'),
      fromEvent(this.rx, 'input'),
      fromEvent(this.ry, 'input'),
      fromEvent(this.rz, 'input')
    )
      .pipe(
        takeUntil(this.release$),
        map(() => ({
          objectType: this.type.value,
          orientation: vec3.fromValues(
            round(+this.rx.value),
            round(+this.ry.value),
            round(+this.rz.value)
          ),
          position: vec3.fromValues(
            round(+this.x.value),
            round(+this.y.value),
            round(+this.z.value)
          )
        }))
      )
      .subscribe((options: ObjectPanelOptions) => this.state$.next(options));
  }

  write(options: ObjectPanelOptions) {
    this.type.value = options.objectType;
    this.x.value = options.position[0].toFixed(2);
    this.y.value = options.position[1].toFixed(2);
    this.z.value = options.position[2].toFixed(2);
    this.rx.value = options.orientation[0].toFixed(2);
    this.ry.value = options.orientation[1].toFixed(2);
    this.rz.value = options.orientation[2].toFixed(2);
  }

  onChanges() {
    return this.state$.asObservable();
  }

  release() {
    this.release$.next();
    this.deactivate(this.element);
  }
}

const round = (v: number, p = 2) => +v.toPrecision(p);

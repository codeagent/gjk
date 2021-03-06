import { BehaviorSubject, fromEvent, merge, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

export interface GjkPanelOptions {
  time: number;
  simplexSize: number;
  maxIterations: number;
  epsilon: number;
}

export class GjkPanel {
  private readonly state$ = new BehaviorSubject<GjkPanelOptions>(null);
  private readonly release$ = new Subject<void>();

  private time: HTMLDivElement;
  private size: HTMLDivElement;
  private iterations: HTMLInputElement;
  private epsilon: HTMLInputElement;

  get state(): GjkPanelOptions {
    return this.state$.value;
  }

  constructor(
    private readonly element: HTMLElement,
    readonly options: GjkPanelOptions
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
    this.time = element.querySelector<HTMLDivElement>('.t');
    this.size = element.querySelector<HTMLDivElement>('.s');
    this.iterations = element.querySelector<HTMLInputElement>('input.i');
    this.epsilon = element.querySelector<HTMLInputElement>('input.e');

    merge(fromEvent(this.iterations, 'input'), fromEvent(this.epsilon, 'input'))
      .pipe(
        takeUntil(this.release$),
        map(() => ({
          epsilon: +this.epsilon.value,
          maxIterations: +this.iterations.value
        }))
      )

      .subscribe((options: GjkPanelOptions) => this.state$.next(options));
  }

  write(options: GjkPanelOptions) {
    this.time.innerText = `${options.time.toPrecision(2)} s`;
    this.size.innerText = `${options.simplexSize}`;
    this.iterations.setAttribute('value', `${options.maxIterations}`);
    this.epsilon.setAttribute('value', `${options.epsilon}`);
  }

  onChanges() {
    return this.state$.asObservable();
  }

  release() {
    this.release$.next();
    this.deactivate(this.element);
  }
}

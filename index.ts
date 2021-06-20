
import 'uikit/dist/css/uikit.css';
import 'uikit/dist/js/uikit.js';
import './style.css';
import { fromEvent, merge, of } from 'rxjs';

import {  filter, mapTo } from 'rxjs/operators';

import { ViewportInterface, IntersectionView, ClosestsView,  ContactsView, SimplexView } from './tests';
// import './jasmine';

const objectsCanvas = document.getElementById('objects') as HTMLCanvasElement;
const simplexCanvas = document.getElementById('simpex') as HTMLCanvasElement;

const intersectionView = new IntersectionView();
const closestsView = new ClosestsView();

const contactsView = new ContactsView();

const intersectionSimplexView = new SimplexView(intersectionView);
const closestsSimplexView = new SimplexView(closestsView);
const contactsSimplexView = new SimplexView(contactsView);

let active:ViewportInterface[] = [];

merge(
  fromEvent(document.querySelector('[href="#/intersection"]'), 'click').pipe(
    mapTo([intersectionView, intersectionSimplexView])
  ),

  fromEvent(document.querySelector('[href="#/closests"]'), 'click').pipe(
    mapTo([closestsView, closestsSimplexView])
  ),

   fromEvent(document.querySelector('[href="#/contacts"]'), 'click').pipe(
    mapTo([contactsView, contactsSimplexView])
  ),
  of([intersectionView, intersectionSimplexView])
)
  .pipe(
    filter(c => !!c)
  )
  .subscribe((viewports: ViewportInterface[]) => {
    if (active.length) {
      active.forEach(a => a.disconnect());
    }
    viewports[0].connect(objectsCanvas);
    if(viewports[1]) {
      viewports[1].connect(simplexCanvas);
    }
    active = viewports;
  });

const frame = () => {
  active.forEach(a => a?.frame());
  requestAnimationFrame(frame);
};

setTimeout(() => frame(), 1000)

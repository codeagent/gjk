
import 'uikit/dist/css/uikit.css';
import 'uikit/dist/js/uikit.js';
import './style.css';
import { fromEvent, merge, of } from 'rxjs';
import {  filter, mapTo } from 'rxjs/operators';

import { IntersectionTest, ClosestsTest, SubdivisionsTest, ContactsTest, SimplexView } from './tests';
import { ViewportInterface } from './tests/viewport.interface';
// import './jasmine';

// import './tests/closests';
// import './tests/subdivision';
// import './tests/depth';

const objectsCanvas = document.getElementById('objects') as HTMLCanvasElement;
const simplexCanvas = document.getElementById('simpex') as HTMLCanvasElement;

// let active: ViewportInterface = null;
const intersectionTest = new IntersectionTest();
const closestsTest = new ClosestsTest();
const subdivisionTest = new SubdivisionsTest();
const contactsTest = new ContactsTest();

const intersectionTestSimpelexView = new SimplexView(intersectionTest.simplex);
const closestsTestSimpelexView = new SimplexView(closestsTest.simplex);
const contactsTestSimplexView = new SimplexView(contactsTest.simplex);

let active:ViewportInterface[] = [];

merge(
  fromEvent(document.querySelector('[href="#/intersection"]'), 'click').pipe(
    mapTo([intersectionTest, intersectionTestSimpelexView])
  ),

  fromEvent(document.querySelector('[href="#/closests"]'), 'click').pipe(
    mapTo([closestsTest, closestsTestSimpelexView])
  ),

  fromEvent(document.querySelector('[href="#/subdivisions"]'), 'click').pipe(
    mapTo([subdivisionTest])
  ),

   fromEvent(document.querySelector('[href="#/contacts"]'), 'click').pipe(
    mapTo([contactsTest, contactsTestSimplexView])
  ),
  of([intersectionTest, intersectionTestSimpelexView])
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



// // const board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED";
// const board =[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE";
// // const board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB";
// // const board = [["a","a","a","a"],["a","a","a","a"],["a","a","a","a"]], word = 'aaaaaaaaaaaaa';
// // const board = [["A"]], word = "A";

// function exist(board: string[][], word: string): boolean { 
//   for(let y = 0; y < board.length; y++) {
//     for(let x = 0; x < board[0].length; x++) {
//       if(seekWord(board, x, y, 0, 0, word, new Set())) {
//         return true;
//       }
//     }
//   }
//   return false;
  
// };

// const seekWord = (board: string[][], x: number, y: number, dx: number, dy: number, word: string, visited: Set<string>) => {
//   if(word.length === 0) {
//     return true;
//   }

//   if(visited.has(`${x}-${y}`)) {
//     return false;
//   }

//   visited.add(`${x}-${y}`)

//   if(board[y][x] !== word.charAt(0)) { 
//     return false;
//   }

//   if(word.length === 1) {
//     return true;
//   }

//   const w = board[0].length;
//   const h = board.length;

//   // came not from from left
//   if(dx !== 1 && x > 0 && seekWord(board, x - 1, y, -1, 0, word.substr(1), visited)) {
//     return true;
//   }

//   // came not from right
//   if(dx !== -1 && x < w - 1 && seekWord(board, x + 1, y, 1, 0, word.substr(1), visited)) {
//     return true;
//   }

//   // came not from top
//   if(dy !== 1 && y > 0 && seekWord(board, x, y - 1, 0, -1, word.substr(1), visited)) {
//     return true;
//   }

//   // came not from bottom
//   if(dy !== -1 && y < h - 1 && seekWord(board, x, y + 1, 0, 1, word.substr(1), visited)) {
//     return true;
//   }

//   return false;
// }

// console.log(exist(board, word));

// // const seed = (board: string[][], word: string) => {

// //   const queue = [];

// //   while()

// // }
/*
for viewport creation algorithm https://mathoverflow.net/questions/206166/
breaking-a-rectangle-into-smaller-rectangles-with-small-diagonals/206254#206254
*/

import {config} from './config.js';

export const createViewports = ({quantity}) => {
  const viewports = [];
  for (let _ = 0; _ < quantity; _++) {
    const viewport = document.createElement('div');
    viewport.style.position = 'absolute';
    viewport.style.overflow = 'hidden';
    document.querySelector('.main-viewport').appendChild(viewport);
    viewports.push(viewport);
  }
  let landscape = window.innerWidth >= window.innerHeight;
  placeViewports({viewports, landscape});
  const resizeListener = () => {
    if (!viewports.length || !viewports[0].parentNode) {
      window.removeEventListener('resize', resizeListener);
    }
    if (landscape !== window.innerWidth >= window.innerHeight) {
      landscape = !landscape;
      placeViewports({viewports, landscape});
    }
  };
  window.addEventListener('resize', resizeListener);
  return viewports;
};

const placeViewports = ({viewports, landscape}) => {
  const n = viewports.length;
  let rows = Math.floor(Math.sqrt(n));
  let columns = Math.floor(Math.sqrt(n));
  if (!Number.isInteger(Math.sqrt(n))) columns++;
  if (rows * columns < n) rows++;
  const deficientRows = rows * columns - n;
  const rowH = 1 / rows;
  let i = 0;
  for (let row = 0; row < rows; row++) {
    const nColumns = row < deficientRows ? columns - 1 : columns;
    for (let column = 0; column < nColumns; column++) {
      const colW = row < deficientRows ? 1 / (columns - 1) : 1 / columns;
      if (landscape) {
        placeViewport({
          viewport: viewports[i],
          x: column * colW,
          y: row * rowH,
          width: colW,
          height: rowH,
        });
      } else {
        placeViewport({
          viewport: viewports[i],
          x: row * rowH,
          y: column * colW,
          width: rowH,
          height: colW
        });
      }
      i += 1;
    }
  }
};

const placeViewport = ({viewport, x, y, width, height}) => {
  viewport.style.left = `${x * 100}%`;
  viewport.style.right = `${(1 - (x + width)) * 100}%`;
  viewport.style.top = `${y * 100}%`;
  viewport.style.bottom = `${(1 - (y + height)) * 100}%`;
};

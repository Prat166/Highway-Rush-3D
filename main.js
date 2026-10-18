import { Game } from './game.js';

let game = null;
try {
  game = new Game(document.getElementById('game-root'));
} catch (err) {
  console.error('Could not start the game:', err);
  document.getElementById('screen-menu').classList.add('hidden');
  document.getElementById('webgl-error').classList.remove('hidden');
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => { if (game) game.dispose(); });
}

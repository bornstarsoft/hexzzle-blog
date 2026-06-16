import Phaser from 'phaser';

import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { ResultPanel } from './ui/ResultPanel.js';
import { shareResult } from './core/ShareService.js';

const container = document.querySelector('#hexzzle-game');

if (container) {
  startHexzzle(container);
}

async function startHexzzle(parent) {
  const config = await loadGameConfig();
  globalThis.__HEXZZLE_CONFIG__ = config;

  const resultPanel = new ResultPanel(document);
  const scoreNode = document.querySelector('[data-hexzzle-score]');
  const bestNode = document.querySelector('[data-hexzzle-best]');
  const bloomsNode = document.querySelector('[data-hexzzle-blooms]');
  const statusNode = document.querySelector('[data-hexzzle-status]');
  const undoButton = document.querySelector('[data-hexzzle-undo]');
  const restartButton = document.querySelector('[data-hexzzle-restart]');
  const soundButton = document.querySelector('[data-hexzzle-sound]');
  const shareButtons = document.querySelectorAll('[data-hexzzle-share], [data-hexzzle-share-top]');
  const playAgainButton = document.querySelector('[data-hexzzle-play-again]');
  const topShareButton = document.querySelector('[data-hexzzle-share-top]');
  const shareStatusNode = document.querySelector('[data-hexzzle-share-status]');
  let lastResult = null;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#f7fbf8',
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth,
      height: parent.clientHeight
    },
    render: {
      antialias: true,
      pixelArt: false
    },
    scene: [BootScene, GameScene]
  });

  const getScene = () => game.scene.getScene('GameScene');

  restartButton?.addEventListener('click', () => {
    getScene()?.restartGame();
    resultPanel.hide();
    topShareButton.hidden = true;
    lastResult = null;
  });

  playAgainButton?.addEventListener('click', () => {
    getScene()?.restartGame();
    resultPanel.hide();
    topShareButton.hidden = true;
    lastResult = null;
    parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  undoButton?.addEventListener('click', () => {
    getScene()?.undoMove();
  });

  soundButton?.addEventListener('click', () => {
    const enabled = getScene()?.toggleSound();
    updateSoundButton(soundButton, enabled);
  });

  shareButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      if (!lastResult) {
        return;
      }

      try {
        const url = new URL('/play/', window.location.origin).href;
        const result = await shareResult({ ...lastResult, url });
        shareStatusNode.textContent = result.method === 'clipboard' ? 'Copied!' : 'Shared.';
      } catch (error) {
        shareStatusNode.textContent = 'Share was canceled.';
      }
    });
  });

  window.addEventListener('hexzzle:stats', (event) => {
    const stats = event.detail;
    scoreNode.textContent = formatNumber(stats.score);
    bestNode.textContent = formatNumber(stats.bestScore);
    bloomsNode.textContent = String(stats.totalBlooms);
    undoButton.disabled = !stats.canUndo;
    updateSoundButton(soundButton, stats.soundEnabled);
  });

  window.addEventListener('hexzzle:status', (event) => {
    statusNode.textContent = event.detail.message;
  });

  window.addEventListener('hexzzle:game-over', (event) => {
    lastResult = event.detail;
    resultPanel.show(lastResult);
    topShareButton.hidden = false;
    shareStatusNode.textContent = '';
  });

  window.addEventListener('resize', () => {
    const scene = getScene();
    if (scene?.redraw) {
      scene.redraw();
    }
  });
}

async function loadGameConfig() {
  try {
    const response = await fetch('/game/hexzzle/data/config.json', { cache: 'no-cache' });
    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    return {};
  }

  return {};
}

function formatNumber(value) {
  return Number(value).toLocaleString('en-US');
}

function updateSoundButton(button, enabled) {
  if (!button) {
    return;
  }

  button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  button.setAttribute('aria-label', enabled ? 'Sound on' : 'Sound off');
}

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.scene.start('GameScene', {
      config: globalThis.__HEXZZLE_CONFIG__ ?? {}
    });
  }
}

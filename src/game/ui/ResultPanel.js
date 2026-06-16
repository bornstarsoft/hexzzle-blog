export class ResultPanel {
  constructor(documentRef) {
    this.document = documentRef;
    this.panel = documentRef.querySelector('[data-hexzzle-result]');
    this.scoreNode = documentRef.querySelector('[data-result-score]');
    this.bestNode = documentRef.querySelector('[data-result-best]');
    this.bloomsNode = documentRef.querySelector('[data-result-blooms]');
    this.chainNode = documentRef.querySelector('[data-result-chain]');
    this.groupNode = documentRef.querySelector('[data-result-group]');
  }

  show(stats) {
    if (!this.panel) {
      return;
    }

    this.scoreNode.textContent = formatNumber(stats.score);
    this.bestNode.textContent = formatNumber(stats.bestScore);
    this.bloomsNode.textContent = String(stats.totalBlooms);
    this.chainNode.textContent = `x${stats.bestChain}`;
    this.groupNode.textContent = String(stats.longestGroup);
    this.panel.hidden = false;
  }

  hide() {
    if (this.panel) {
      this.panel.hidden = true;
    }
  }
}

function formatNumber(value) {
  return Number(value).toLocaleString('en-US');
}

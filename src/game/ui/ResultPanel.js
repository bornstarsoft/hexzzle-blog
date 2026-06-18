export class ResultPanel {
  constructor(documentRef) {
    this.document = documentRef;
    this.panel = documentRef.querySelector('[data-hexzzle-result]');
    this.scoreNode = documentRef.querySelector('[data-result-score]');
    this.bestNode = documentRef.querySelector('[data-result-best]');
    this.bloomsNode = documentRef.querySelector('[data-result-blooms]');
    this.stackNode = documentRef.querySelector('[data-result-stack]');
    this.overbloomsNode = documentRef.querySelector('[data-result-overblooms]');
    this.piecesNode = documentRef.querySelector('[data-result-pieces]');
    this.newBestNode = documentRef.querySelector('[data-result-new-best]');
    this.recordsSectionNode = documentRef.querySelector('[data-result-records-section]');
    this.recordsListNode = documentRef.querySelector('[data-result-records-list]');
    this.recordsEmptyNode = documentRef.querySelector('[data-result-records-empty]');
    this.recordRankNode = documentRef.querySelector('[data-result-record-rank]');
    this.recordsButton = documentRef.querySelector('[data-hexzzle-records]');
    this.latestStats = null;
    this.showAllRecords = false;
  }

  show(stats) {
    if (!this.panel) {
      return;
    }

    this.latestStats = stats;
    this.showAllRecords = false;
    this.scoreNode.textContent = formatNumber(stats.score);
    this.bestNode.textContent = formatNumber(stats.bestScore);
    this.bloomsNode.textContent = String(stats.totalBlooms);
    this.stackNode.textContent = String(stats.bestStack ?? stats.longestGroup ?? 0);
    this.overbloomsNode.textContent = String(stats.overblooms ?? 0);
    this.piecesNode.textContent = String(stats.piecesPlaced ?? 0);
    this.newBestNode.hidden = !stats.isNewBest;
    this.renderRecords(stats);
    this.panel.hidden = false;
  }

  hide() {
    if (this.panel) {
      this.panel.hidden = true;
    }
    if (this.recordsSectionNode) {
      this.recordsSectionNode.hidden = true;
    }
    this.latestStats = null;
    this.showAllRecords = false;
    this.updateRecordsButton();
  }

  toggleRecords() {
    if (!this.latestStats) {
      return;
    }

    this.showAllRecords = !this.showAllRecords;
    this.renderRecords(this.latestStats);
  }

  renderRecords(stats) {
    if (!this.recordsListNode || !this.recordsEmptyNode) {
      return;
    }

    const records = Array.isArray(stats.localRecords) ? stats.localRecords : [];
    const visibleRecords = this.showAllRecords ? records.slice(0, 10) : [];
    this.recordsListNode.replaceChildren();
    if (this.recordsSectionNode) {
      this.recordsSectionNode.hidden = !this.showAllRecords;
    }
    this.recordsListNode.hidden = !this.showAllRecords;
    this.recordsEmptyNode.hidden = !this.showAllRecords || records.length > 0;

    visibleRecords.forEach((record, index) => {
      const item = this.document.createElement('li');
      item.className = 'result-records__item';
      item.innerHTML = [
        `<span class="result-records__rank">#${index + 1}</span>`,
        `<strong>${formatNumber(record.score)}</strong>`,
        `<span>${record.blooms} blooms · stack ${record.bestStack} · ${record.overblooms} over</span>`
      ].join('');
      this.recordsListNode.append(item);
    });

    if (this.recordRankNode) {
      this.recordRankNode.textContent = stats.localRecordRank
        ? `#${stats.localRecordRank} local`
        : '';
    }
    this.updateRecordsButton();
  }

  updateRecordsButton() {
    if (!this.recordsButton) {
      return;
    }

    this.recordsButton.setAttribute('aria-expanded', this.showAllRecords ? 'true' : 'false');
    this.recordsButton.textContent = this.showAllRecords ? 'Hide Records' : 'Records';
  }
}

function formatNumber(value) {
  return Number(value).toLocaleString('en-US');
}

// Git Viz — simple git graph visualizer (English UI)

// Constants
const BRANCH_COLORS = [
  "#7dd3fc", // sky
  "#fca5a5", // red
  "#fcd34d", // amber
  "#a7f3d0", // green
  "#c4b5fd", // violet
  "#f9a8d4", // pink
  "#93c5fd", // blue
  "#fdba74", // orange
];

// State
let state = {
  commits: [], // {id, message, branch, parents: [id], timeIndex}
  branches: {}, // name -> { name, color, tip, lane }
  head: { branch: "master" },
};

let commitCounter = 0;
let selectedCommitId = null;
let history = []; // [{command, description, snapshot, ts}]

// DOM
const el = (id) => document.getElementById(id);
const graphEl = el("graph");
const headBranchEl = el("head-branch");
const checkoutSelect = el("checkout-branch");
const mergeSelect = el("merge-branch");
const graphContainer = document.getElementById("graph-container");
const commitCard = document.getElementById("commit-card");
const historyListEl = document.getElementById("history-list");
const commitDialog = el("commit-dialog");
const commitMessageInput = el("commit-message-input");

// Dialog state
let editingCommitId = null;

// Utils
function newCommitId() {
  commitCounter += 1;
  return `c${commitCounter}`;
}

function ensureBranch(name) {
  if (!state.branches[name]) {
    const lane = Object.keys(state.branches).length; // master=0, next branches increment
    const color = BRANCH_COLORS[lane % BRANCH_COLORS.length];
    state.branches[name] = { name, color, tip: null, lane };
  }
}

// no command logging pane anymore

// Core mutations
function resetRepo() {
  state = {
    commits: [],
    branches: {},
    head: { branch: "master" },
  };
  commitCounter = 0;
  selectedCommitId = null;
  ensureBranch("master");
  // initial commit
  const id = newCommitId();
  const commit = {
    id,
    message: "initial commit",
    branch: "master",
    parents: [],
    timeIndex: state.commits.length,
  };
  state.commits.push(commit);
  state.branches.master.tip = id;
  renderAll();
}

function addCommit(message = "new commit") {
  recordHistory(`git commit -m '${message}'`, "Record changes to history.");
  const branch = state.head.branch;
  const parent = state.branches[branch].tip;
  const id = newCommitId();
  const commit = {
    id,
    message,
    branch,
    parents: parent ? [parent] : [],
    timeIndex: state.commits.length,
  };
  state.commits.push(commit);
  state.branches[branch].tip = id;
  renderAll();
}

function createBranch(name) {
  name = (name || "").trim();
  if (!name) return;
  if (state.branches[name]) {
    alert("This branch already exists.");
    return;
  }
  recordHistory(`git branch ${name}`, "Create a new branch from current tip.");
  ensureBranch(name);
  // new branch starts at current tip
  state.branches[name].tip = state.branches[state.head.branch].tip;
  renderAll();
}

function checkoutBranch(name) {
  if (!state.branches[name]) return;
  recordHistory(`git checkout ${name}`, "Switch current branch (HEAD).");
  state.head.branch = name;
  renderAll();
}

function mergeBranch(sourceName) {
  const target = state.head.branch;
  if (!state.branches[sourceName] || sourceName === target) return;
  recordHistory(`git merge ${sourceName}`, "Merge changes into current branch.");
  const tipTarget = state.branches[target].tip;
  const tipSource = state.branches[sourceName].tip;
  const id = newCommitId();
  const commit = {
    id,
    message: `merge ${sourceName} -> ${target}`,
    branch: target,
    parents: [tipTarget, tipSource].filter(Boolean),
    timeIndex: state.commits.length,
  };
  state.commits.push(commit);
  state.branches[target].tip = id;
  renderAll();
}

// Layout + rendering
const SPACING_X = 100;
const SPACING_Y = 90;
const PADDING = 60;

function layoutCommits() {
  // x by timeIndex, y by branch lane
  for (const [i, c] of state.commits.entries()) {
    c.timeIndex = i;
    c.x = PADDING + i * SPACING_X;
    const lane = state.branches[c.branch]?.lane ?? 0;
    c.y = PADDING + lane * SPACING_Y;
  }
}

function renderGraph() {
  layoutCommits();
  const width = Math.max(800, PADDING * 2 + (state.commits.length + 1) * SPACING_X);
  const lanes = Object.keys(state.branches).length || 1;
  const height = Math.max(400, PADDING * 2 + lanes * SPACING_Y);
  lastGraphSize = { width, height };
  graphEl.setAttribute("viewBox", `0 0 ${width} ${height}`);
  graphEl.innerHTML = "";

  // edges
  for (const c of state.commits) {
    for (const parentId of c.parents) {
      const p = state.commits.find((x) => x.id === parentId);
      if (!p) continue;
      const edge = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const mx = (p.x + c.x) / 2;
      const d = `M ${p.x} ${p.y} C ${mx} ${p.y}, ${mx} ${c.y}, ${c.x} ${c.y}`;
      edge.setAttribute("d", d);
      edge.setAttribute("class", "edge");
      edge.setAttribute("stroke", state.branches[c.branch]?.color || "#95a3ff");
      graphEl.appendChild(edge);
    }
  }

  // commits
  for (const c of state.commits) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", c.x);
    circle.setAttribute("cy", c.y);
    circle.setAttribute("r", 12);
    circle.setAttribute("class", "commit-node");
    circle.setAttribute("fill", state.branches[c.branch]?.color || "#6ee7b7");
    circle.dataset.id = c.id;
    if (selectedCommitId === c.id) {
      circle.classList.add("selected");
    }
    circle.addEventListener("click", () => selectCommit(c));
    graphEl.appendChild(circle);

    // Add commit ID text in the middle of the circle
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", c.x);
    text.setAttribute("y", c.y);
    text.setAttribute("class", "commit-id");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.textContent = c.id;
    graphEl.appendChild(text);
  }

  // branch tags at tips (dynamic background width)
  for (const bName of Object.keys(state.branches)) {
    const b = state.branches[bName];
    const tip = state.commits.find((x) => x.id === b.tip);
    if (!tip) continue;
    const labelX = tip.x + 16;
    const labelY = tip.y - 14;

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", labelX);
    label.setAttribute("y", labelY);
    label.setAttribute("class", "label");
    label.textContent = `${bName}${state.head.branch === bName ? " (HEAD)" : ""}`;
    graphEl.appendChild(label);

    const bbox = label.getBBox();
    const padX = 10;
    const padY = 6;
    const tagBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    tagBg.setAttribute("x", bbox.x - padX);
    tagBg.setAttribute("y", bbox.y - padY);
    tagBg.setAttribute("rx", 10);
    tagBg.setAttribute("ry", 10);
    tagBg.setAttribute("width", bbox.width + padX * 2);
    tagBg.setAttribute("height", bbox.height + padY * 2);
    tagBg.setAttribute("class", "branch-tag");
    graphEl.insertBefore(tagBg, label);
  }
}

function selectCommit(c) {
  selectedCommitId = c.id;
  editingCommitId = c.id;
  renderAll();
  centerOnCommit(c);
  openCommitDialog(c);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
}

// no command log rendering

function renderControls() {
  headBranchEl.textContent = state.head.branch;
  // checkout options
  checkoutSelect.innerHTML = Object.keys(state.branches)
    .map((b) => `<option value="${b}">${b}</option>`) 
    .join("");
  checkoutSelect.value = state.head.branch;
  // merge options (exclude current)
  mergeSelect.innerHTML = Object.keys(state.branches)
    .filter((b) => b !== state.head.branch)
    .map((b) => `<option value="${b}">${b}</option>`) 
    .join("");
}

function renderAll() {
  renderGraph();
  renderControls();
  renderHistory();
  if (selectedCommitId) {
    const c = state.commits.find((x) => x.id === selectedCommitId);
    if (c) showCommitCard(c); else hideCommitCard();
  } else {
    hideCommitCard();
  }
}

// Event handlers
function bindUI() {
  document.getElementById("btn-add-commit").addEventListener("click", () => addCommit());
  document.getElementById("btn-create-branch").addEventListener("click", () => {
    const name = document.getElementById("branch-name").value;
    createBranch(name);
    document.getElementById("branch-name").value = "";
  });
  document.getElementById("btn-checkout").addEventListener("click", () => {
    const name = checkoutSelect.value;
    checkoutBranch(name);
  });
  document.getElementById("btn-merge").addEventListener("click", () => {
    const src = mergeSelect.value;
    mergeBranch(src);
  });
  document.getElementById("btn-reset").addEventListener("click", () => {
    recordHistory("git init", "Initialize a new repository (reset).");
    resetRepo();
  });
  document.getElementById("btn-undo")?.addEventListener("click", () => undoLast());

  // Dialog event listeners
  document.getElementById("btn-save-message").addEventListener("click", saveCommitMessage);
  document.getElementById("btn-cancel-message").addEventListener("click", closeCommitDialog);

  // Default message buttons
  document.querySelectorAll(".default-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const prefix = e.target.getAttribute("data-message");
      commitMessageInput.value = prefix;
      commitMessageInput.focus();
      commitMessageInput.setSelectionRange(prefix.length, prefix.length);
    });
  });

  // Close dialog on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !commitDialog.classList.contains("hidden")) {
      closeCommitDialog();
    }
  });

  // Close dialog on background click
  commitDialog.addEventListener("click", (e) => {
    if (e.target === commitDialog) {
      closeCommitDialog();
    }
  });

  // Save on Enter key in input
  commitMessageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      saveCommitMessage();
    }
  });
}

// Init
function init() {
  // Prepare base repo
  resetRepo();
  bindUI();
  renderAll();
}

document.addEventListener("DOMContentLoaded", init);

// Helpers for selection UI
function showCommitCard(c) {
  const pos = graphCoordsToClient(c.x, c.y);
  commitCard.innerHTML = `
    <div><strong>Commit</strong> <code>${c.id}</code></div>
    <div class="meta">Branch: <code>${c.branch}</code></div>
    <div>Message: ${escapeHtml(c.message)}</div>
    <div>Parents: ${c.parents.length ? c.parents.map((p) => `<code>${p}</code>`).join(', ') : '(none)'}</div>
  `;
  commitCard.style.left = Math.max(8, pos.x + 16) + 'px';
  commitCard.style.top = Math.max(8, pos.y - 10) + 'px';
  commitCard.classList.remove('hidden');
}

function hideCommitCard() {
  commitCard.classList.add('hidden');
}

function openCommitDialog(c) {
  commitMessageInput.value = c.message;
  commitMessageInput.focus();
  commitMessageInput.select();
  commitDialog.classList.remove('hidden');
}

function closeCommitDialog() {
  commitDialog.classList.add('hidden');
  editingCommitId = null;
}

function saveCommitMessage() {
  if (!editingCommitId) return;
  const message = commitMessageInput.value.trim();
  if (!message) {
    alert('Please enter a commit message');
    return;
  }

  const commit = state.commits.find((c) => c.id === editingCommitId);
  if (commit) {
    recordHistory(`git commit --amend -m '${message}'`, "Update commit message.");
    commit.message = message;
  }

  closeCommitDialog();
  renderAll();
  if (commit) {
    showCommitCard(commit);
  }
}

function centerOnCommit(c) {
  const rect = graphContainer.getBoundingClientRect();
  const size = getGraphSize();
  const scaleX = rect.width / size.width;
  const scaleY = rect.height / size.height;
  const targetX = c.x * scaleX - rect.width * 0.4; // slightly left of center
  const targetY = c.y * scaleY - rect.height * 0.4;
  graphContainer.scrollTo({ left: targetX, top: targetY, behavior: 'smooth' });
}

let lastGraphSize = { width: 800, height: 400 };
function getGraphSize() { return lastGraphSize; }

// convert SVG graph coords -> container client coords (top-left inside wrapper)
function graphCoordsToClient(gx, gy) {
  const rect = graphContainer.getBoundingClientRect();
  const size = getGraphSize();
  const scaleX = rect.width / size.width;
  const scaleY = rect.height / size.height;
  const x = gx * scaleX - graphContainer.scrollLeft;
  const y = gy * scaleY - graphContainer.scrollTop;
  return { x, y };
}

// Hide selection if clicking on background
graphEl.addEventListener('click', (e) => {
  if (e.target === graphEl) {
    selectedCommitId = null;
    hideCommitCard();
    renderAll();
  }
});

// History handling and UI
function deepCopy(obj) { return JSON.parse(JSON.stringify(obj)); }
function makeSnapshot() { return { state: deepCopy(state), commitCounter, selectedCommitId }; }
function restoreSnapshot(snap) {
  state = deepCopy(snap.state);
  commitCounter = snap.commitCounter;
  selectedCommitId = snap.selectedCommitId;
}
function recordHistory(command, description) {
  history.push({ command, description, snapshot: makeSnapshot(), ts: Date.now() });
}
function undoLast() {
  if (history.length === 0) return;
  const last = history.pop();
  restoreSnapshot(last.snapshot);
  renderAll();
}
// per-entry revert removed; only Undo Last is supported
function renderHistory() {
  if (!historyListEl) return;
  historyListEl.innerHTML = history.map((h, i) => {
    return `<div class="history-item">
      <div class="meta"><span>#${i + 1}</span><span>${new Date(h.ts).toLocaleTimeString()}</span></div>
      <div class="command"><code>${h.command}</code></div>
      <div class="meta">${h.description || ''}</div>
    </div>`;
  }).join('');
}

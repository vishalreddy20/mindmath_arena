const LEARN = {
    moduleSlug: null,
    data: null,
    optimal: null,
    examples: [],
    exampleIndex: 0,
    totalExamples: 3,
    part: 1,
    nodes: [],
    selected: null,
    mergeA: null,
    mergeB: null,
    opChosen: null,
    history: [],
    stepOperands: [],
    stepOperators: [],
    runningResult: null,
    canvas: { w: 0, h: 0 }
};

const LEARN_META = {
    split_add: {
        name: 'Split & Add',
        description: 'Break both numbers into tens and ones, then combine each part to solve quickly.'
    },
    bridge_10: {
        name: 'Bridge to 10',
        description: 'Find what is needed to make 10 first, then add what remains.'
    },
    near_doubles: {
        name: 'Near Doubles',
        description: 'Use a nearby double fact and adjust by one.'
    },
    round_solve: {
        name: 'Round & Solve',
        description: 'Round to a friendly ten, solve, then adjust back.'
    },
    split_multiply: {
        name: 'Split to Multiply',
        description: 'Split one factor into 10 and ones, multiply each part, and add products.'
    },
    nines_trick: {
        name: 'The 9s Trick',
        description: 'Multiply by 10, then subtract the number once.'
    }
};

let learnSvg = null;
let learnSvgEl = null;
let learnUidCounter = 0;
const learnUid = () => 'ln' + (++learnUidCounter) + '_' + Date.now();

async function initLearn(moduleSlug) {
    LEARN.moduleSlug = moduleSlug;
    LEARN.examples = [];
    LEARN.exampleIndex = 0;
    LEARN.part = 1;
    LEARN.nodes = [];
    LEARN.selected = null;
    LEARN.mergeA = null;
    LEARN.mergeB = null;
    LEARN.opChosen = null;
    LEARN.history = [];
    LEARN.stepOperands = [];
    LEARN.stepOperators = [];
    LEARN.runningResult = null;

    learnSvgEl = document.getElementById('tree-svg');
    if (!learnSvgEl) return;

    learnSvg = d3.select('#tree-svg');
    LEARN.canvas.w = learnSvgEl.clientWidth || 900;
    LEARN.canvas.h = learnSvgEl.clientHeight || 500;

    hidePracticePopups();

    LEARN.examples = await loadLearnExamples(moduleSlug, LEARN.totalExamples);
    if (!LEARN.examples.length) {
        const panel = document.getElementById('learn-panel');
        if (panel) {
            panel.classList.remove('hidden');
            panel.innerHTML = '<div class="learn-card-inner"><h2 class="learn-title">Unable to load Learn mode</h2><p class="learn-desc">Problem data is not available right now.</p></div>';
        }
        return;
    }

    setActiveExample(0);

    showPart1();
}

function setActiveExample(index) {
    LEARN.exampleIndex = index;
    LEARN.data = LEARN.examples[index];
    LEARN.optimal = LEARN.data.approaches.find(a => a.isOptimal);
}

function showPart1() {
    LEARN.part = 1;
    const panel = document.getElementById('learn-panel');
    const hint = document.getElementById('learn-hint-banner');
    if (!panel || !hint || !learnSvgEl) return;

    panel.classList.remove('hidden');
    hint.classList.add('hidden');
    learnSvgEl.classList.add('hidden');

    const meta = LEARN_META[LEARN.data.module] || {
        name: LEARN.data.module,
        description: 'Practice the strategy in small guided steps.'
    };

    panel.innerHTML = [
        '<div class="learn-card-inner">',
        '<p class="learn-desc">Example ' + (LEARN.exampleIndex + 1) + ' of ' + LEARN.examples.length + '</p>',
        '<h2 class="learn-title">' + escapeHtml(meta.name) + '</h2>',
        '<p class="learn-desc">' + escapeHtml(meta.description) + '</p>',
        '<p class="learn-example">For example: ' + escapeHtml(LEARN.data.question) + ' -> ' + escapeHtml(LEARN.optimal.expression) + ' = ' + LEARN.data.answer + '</p>',
        '<button class="btn btn-primary" id="learn-understand-btn">I understand - show me the tree -></button>',
        '</div>'
    ].join('');

    const btn = document.getElementById('learn-understand-btn');
    if (btn) btn.onclick = () => showPart2();
}

function showPart2() {
    LEARN.part = 2;
    const panel = document.getElementById('learn-panel');
    const hint = document.getElementById('learn-hint-banner');
    if (!panel || !hint || !learnSvgEl) return;

    panel.classList.add('hidden');
    panel.innerHTML = '';
    hint.classList.remove('hidden');
    learnSvgEl.classList.remove('hidden');

    renderGuidedApproachTree();
    hint.textContent = LEARN.optimal.hint || 'Tap the highlighted strategy bubble to begin.';
}

function renderGuidedApproachTree() {
    learnSvg.selectAll('*').remove();

    LEARN.canvas.w = learnSvgEl.clientWidth || 900;
    LEARN.canvas.h = learnSvgEl.clientHeight || 500;

    const q = LEARN.data;
    const cx = LEARN.canvas.w / 2;
    const cy = 60;
    const leafY = LEARN.canvas.h * 0.55;
    const n = q.approaches.length;
    const step = (LEARN.canvas.w - 120) / (n - 1);

    const parentGroup = learnSvg.append('g')
        .attr('class', 'parent-node')
        .attr('transform', 'translate(' + cx + ',' + cy + ')');

    parentGroup.append('circle')
        .attr('r', 36)
        .attr('fill', '#1e3a5f')
        .attr('stroke', '#F59E0B')
        .attr('stroke-width', 3);

    parentGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', '#F59E0B')
        .attr('font-size', '13px')
        .attr('font-weight', '700')
        .attr('pointer-events', 'none')
        .text(q.question);

    q.approaches.forEach((ap, i) => {
        const lx = 60 + step * i;
        const midY = (cy + leafY) / 2;

        learnSvg.append('path')
            .attr('d', 'M' + cx + ',' + (cy + 36) + ' C' + cx + ',' + midY + ' ' + lx + ',' + midY + ' ' + lx + ',' + (leafY - 40))
            .attr('fill', 'none')
            .attr('stroke', 'rgba(255,255,255,0.15)')
            .attr('stroke-width', 1.5);

        const branchOp = ap.operators && ap.operators.length > 0 ? normalizeOpSymbol(ap.operators[0]) : '+';
        learnSvg.append('text')
            .attr('x', (cx + lx) * 0.5)
            .attr('y', midY - 8)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '16px')
            .attr('font-weight', '700')
            .text(branchOp);

        const g = learnSvg.append('g')
            .attr('class', 'approach-bubble')
            .attr('data-id', ap.id)
            .attr('transform', 'translate(' + lx + ',' + leafY + ')')
            .style('cursor', ap.isOptimal ? 'pointer' : 'default')
            .style('opacity', ap.isOptimal ? 1 : 0.35);

        g.append('circle')
            .attr('r', 40)
            .attr('fill', '#0f2034')
            .attr('stroke', ap.isOptimal ? '#F59E0B' : '#06B6D4')
            .attr('stroke-width', ap.isOptimal ? 4 : 2.5);

        const expr = ap.expression;
        const split = findSplitPointLearn(expr);
        if (split === -1 || expr.length <= 7) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .attr('fill', 'white')
                .attr('font-size', expr.length > 6 ? '10px' : '12px')
                .attr('font-weight', '600')
                .attr('pointer-events', 'none')
                .text(expr);
        } else {
            const t = g.append('text')
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .attr('font-size', '10px')
                .attr('font-weight', '600')
                .attr('pointer-events', 'none');
            t.append('tspan').attr('x', 0).attr('dy', '-0.65em').text(expr.slice(0, split));
            t.append('tspan').attr('x', 0).attr('dy', '1.3em').text(expr.slice(split));
        }

        if (ap.isOptimal) {
            g.on('click', () => startGuidedMerge());
        }
    });
}

function startGuidedMerge() {
    const ap = LEARN.optimal;
    LEARN.nodes = ap.terms.map(v => ({
        id: learnUid(),
        value: v,
        x: 0,
        y: 0
    }));
    LEARN.selected = null;
    LEARN.mergeA = null;
    LEARN.mergeB = null;
    LEARN.opChosen = null;
    LEARN.history = [];

    LEARN.stepOperands = [];
    LEARN.stepOperators = [];

    let running = ap.terms[0];
    for (let i = 0; i < ap.operators.length; i++) {
        LEARN.stepOperands.push([running, ap.terms[i + 1]]);
        LEARN.stepOperators.push(ap.operators[i]);
        running = applyOp(running, ap.operators[i], ap.terms[i + 1]);
    }
    LEARN.runningResult = running;

    layoutLearnNodes();
    renderGuidedMergePhase();
    updateGuidedHint();
}

function layoutLearnNodes() {
    const n = LEARN.nodes.length;
    const pad = 80;
    const usable = LEARN.canvas.w - pad * 2;
    const y = LEARN.canvas.h - 100;

    LEARN.nodes.forEach((node, i) => {
        node.x = n === 1 ? LEARN.canvas.w / 2 : pad + (usable / (n - 1)) * i;
        node.y = y;
    });
}

function renderGuidedMergePhase() {
    learnSvg.selectAll('*').remove();

    drawGuidedMergeBranches();

    LEARN.nodes.forEach(node => {
        const g = learnSvg.append('g')
            .attr('class', 'merge-bubble')
            .attr('data-nid', node.id)
            .attr('transform', 'translate(' + node.x + ',' + node.y + ')')
            .style('cursor', 'pointer');

        const isSelected = LEARN.selected && LEARN.selected.id === node.id;

        g.append('circle')
            .attr('r', 30)
            .attr('fill', '#0f2034')
            .attr('stroke', isSelected ? '#F59E0B' : '#10b981')
            .attr('stroke-width', isSelected ? 3.5 : 2.5);

        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('fill', 'white')
            .attr('font-size', '14px')
            .attr('font-weight', '700')
            .attr('pointer-events', 'none')
            .text(String(node.value));

        g.on('click', () => handleGuidedNodeClick(node));

        g.call(
            d3.drag()
                .on('drag', (event) => {
                    node.x = event.x;
                    node.y = event.y;
                    g.attr('transform', 'translate(' + node.x + ',' + node.y + ')');
                })
                .on('end', () => {
                    const hit = LEARN.nodes.find(n => n.id !== node.id && Math.hypot(n.x - node.x, n.y - node.y) < 65);
                    if (hit) {
                        tryOpenGuidedMerge(node, hit);
                    } else {
                        layoutLearnNodes();
                        renderGuidedMergePhase();
                    }
                })
        );
    });
}

function drawGuidedMergeBranches() {
    if (!Array.isArray(LEARN.nodes) || LEARN.nodes.length < 2) return;

    const parentX = LEARN.canvas.w / 2;
    const parentY = Math.max(90, Math.min(LEARN.canvas.h * 0.35, 180));

    const pg = learnSvg.append('g')
        .attr('class', 'merge-parent-node')
        .attr('transform', 'translate(' + parentX + ',' + parentY + ')')
        .attr('pointer-events', 'none');

    pg.append('circle')
        .attr('r', 30)
        .attr('fill', '#1e3a5f')
        .attr('stroke', '#F59E0B')
        .attr('stroke-width', 3);

    pg.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', '#F59E0B')
        .attr('font-size', '12px')
        .attr('font-weight', '700')
        .text((LEARN.data && LEARN.data.question) ? LEARN.data.question : 'Merge');

    LEARN.nodes.forEach(node => {
        const midY = (parentY + node.y) * 0.5;
        learnSvg.append('path')
            .attr('class', 'merge-branch')
            .attr('d', 'M' + parentX + ',' + (parentY + 30) + ' C' + parentX + ',' + midY + ' ' + node.x + ',' + midY + ' ' + node.x + ',' + (node.y - 30))
            .attr('fill', 'none')
            .attr('stroke', 'rgba(148,163,184,0.5)')
            .attr('stroke-width', 2)
            .attr('stroke-linecap', 'round');
    });
}

function handleGuidedNodeClick(node) {
    if (LEARN.part !== 2) return;

    if (LEARN.selected && LEARN.selected.id === node.id) {
        LEARN.selected = null;
        renderGuidedMergePhase();
        updateGuidedHint();
        return;
    }

    if (LEARN.selected) {
        const a = LEARN.selected;
        LEARN.selected = null;
        tryOpenGuidedMerge(a, node);
        return;
    }

    LEARN.selected = node;
    renderGuidedMergePhase();
    updateGuidedHint('Selected ' + node.value + '. Choose the next node for this guided step.');
}

function tryOpenGuidedMerge(nodeA, nodeB) {
    const idx = LEARN.history.length;
    if (idx >= LEARN.stepOperands.length) return;

    const pair = LEARN.stepOperands[idx];
    const a = pair[0];
    const b = pair[1];

    const validOrder = nodeA.value === a && nodeB.value === b;
    const validSwap = nodeA.value === b && nodeB.value === a;
    if (!validOrder && !validSwap) {
        playLearnBuzzer();
        layoutLearnNodes();
        renderGuidedMergePhase();
        updateGuidedHint('Follow the step exactly: merge ' + a + ' and ' + b + '.');
        return;
    }

    LEARN.mergeA = nodeA;
    LEARN.mergeB = nodeB;
    LEARN.opChosen = null;
    LEARN.selected = null;

    const popup = document.getElementById('merge-popup');
    if (!popup) return;

    popup.querySelector('.mp-question').textContent = 'What is ' + nodeA.value + ' ? ' + nodeB.value;
    popup.querySelector('.mp-answer').value = '';
    popup.querySelector('.mp-confirm').disabled = true;

    popup.querySelectorAll('.mp-op').forEach(btn => {
        btn.classList.remove('selected');
        btn.onclick = () => {
            LEARN.opChosen = btn.dataset.op;
            popup.querySelectorAll('.mp-op').forEach(bn => bn.classList.remove('selected'));
            btn.classList.add('selected');
            const filled = popup.querySelector('.mp-answer').value.trim() !== '';
            popup.querySelector('.mp-confirm').disabled = !(LEARN.opChosen && filled);
        };
    });

    popup.querySelector('.mp-answer').oninput = () => {
        const filled = popup.querySelector('.mp-answer').value.trim() !== '';
        popup.querySelector('.mp-confirm').disabled = !(LEARN.opChosen && filled);
    };

    popup.querySelector('.mp-confirm').onclick = () => confirmGuidedMerge(popup);
    popup.classList.remove('hidden');
}

function confirmGuidedMerge(popup) {
    const idx = LEARN.history.length;
    const expectedOp = LEARN.stepOperators[idx];
    const a = LEARN.mergeA.value;
    const b = LEARN.mergeB.value;

    if (LEARN.opChosen !== expectedOp) {
        shakePopup(popup);
        playLearnBuzzer();
        popup.querySelector('.mp-answer').value = '';
        updateGuidedHint('Use the correct operator for this step: ' + normalizeOpSymbol(expectedOp));
        return;
    }

    const userAnswer = Number(popup.querySelector('.mp-answer').value);
    const expected = applyOp(a, expectedOp, b);

    if (!Number.isFinite(expected) || userAnswer !== expected) {
        shakePopup(popup);
        playLearnBuzzer();
        popup.querySelector('.mp-answer').value = '';
        updateGuidedHint('Try again for this step.');
        return;
    }

    popup.classList.add('hidden');

    const idA = LEARN.mergeA.id;
    const idB = LEARN.mergeB.id;

    LEARN.history.push({ a, op: expectedOp, b, result: expected });
    LEARN.mergeA = null;
    LEARN.mergeB = null;
    LEARN.opChosen = null;

    const refA = LEARN.nodes.find(n => n.id === idA);
    const refB = LEARN.nodes.find(n => n.id === idB);
    if (!refA || !refB) return;

    LEARN.nodes = LEARN.nodes.filter(n => n.id !== idA && n.id !== idB);
    LEARN.nodes.push({ id: learnUid(), value: expected, x: 0, y: 0 });

    layoutLearnNodes();
    playLearnPop();

    if (LEARN.nodes.length === 1) {
        onLearnComplete(LEARN.nodes[0].value);
    } else {
        renderGuidedMergePhase();
        updateGuidedHint();
    }
}

function onLearnComplete(finalValue) {
    if (finalValue !== LEARN.data.answer) {
        updateGuidedHint('Something went wrong. Restart Learn and try again.');
        return;
    }

    playLearnFanfare();
    launchLearnConfetti();

    if (window.MindMathArenaApp) {
        if (typeof window.MindMathArenaApp.recordModuleCompletion === 'function') {
            window.MindMathArenaApp.recordModuleCompletion(LEARN.data.module, 'learn');
        }
        if (typeof window.MindMathArenaApp.addXp === 'function') {
            window.MindMathArenaApp.addXp(25);
        }
        if (typeof window.MindMathArenaApp.addStreak === 'function') {
            window.MindMathArenaApp.addStreak(1);
        }
    }

    setTimeout(() => showPart3(), 700);
}

function showPart3() {
    LEARN.part = 3;
    const panel = document.getElementById('learn-panel');
    const hint = document.getElementById('learn-hint-banner');
    if (!panel || !hint || !learnSvgEl) return;

    panel.classList.remove('hidden');
    hint.classList.add('hidden');
    learnSvgEl.classList.add('hidden');

    const name = LEARN.optimal.name || (LEARN_META[LEARN.data.module] ? LEARN_META[LEARN.data.module].name : 'strategy');
    const hasNext = LEARN.exampleIndex < LEARN.examples.length - 1;
    const actionText = hasNext ? 'Next Learn Example' : 'Go to Practice';
    panel.innerHTML = [
        '<div class="learn-card-inner">',
        '<h2 class="learn-title">You learned the ' + escapeHtml(name) + ' strategy!</h2>',
        '<p class="learn-desc">Completed example ' + (LEARN.exampleIndex + 1) + ' of ' + LEARN.examples.length + '</p>',
        '<div class="learn-mini-tree">',
        '<div class="lmt-root">' + escapeHtml(LEARN.data.question) + '</div>',
        '<div class="lmt-branch">|</div>',
        '<div class="lmt-leaf">' + escapeHtml(LEARN.optimal.expression) + ' = ' + LEARN.data.answer + '</div>',
        '</div>',
        '<button class="btn btn-primary" id="learn-next-action">' + actionText + '</button>',
        '</div>'
    ].join('');

    const btn = document.getElementById('learn-next-action');
    if (btn) {
        btn.onclick = () => {
            if (hasNext) {
                setActiveExample(LEARN.exampleIndex + 1);
                showPart1();
                return;
            }
            if (window.MindMathArenaApp) {
                window.MindMathArenaApp.state.lastMode = 'practice';
                if (typeof window.MindMathArenaApp.saveLocalState === 'function') {
                    window.MindMathArenaApp.saveLocalState();
                }
                if (typeof window.MindMathArenaApp.switchView === 'function') {
                    window.MindMathArenaApp.switchView('arena');
                }
            }
            initPractice(LEARN.moduleSlug);
        };
    }
}

function updateGuidedHint(overrideText) {
    const hint = document.getElementById('learn-hint-banner');
    const status = document.getElementById('status-bar');
    if (!hint) return;

    if (overrideText) {
        hint.textContent = overrideText;
        if (status) status.textContent = overrideText;
        return;
    }

    const idx = LEARN.history.length;
    if (idx < LEARN.stepOperands.length) {
        const pair = LEARN.stepOperands[idx];
        const op = normalizeOpSymbol(LEARN.stepOperators[idx]);
        const line = 'Step ' + (idx + 1) + ': Merge ' + pair[0] + ' ' + op + ' ' + pair[1];
        hint.textContent = line;
        if (status) status.textContent = line;
    } else {
        hint.textContent = 'Great work!';
        if (status) status.textContent = 'Great work!';
    }
}

function applyOp(a, op, b) {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/') {
        if (b === 0) return NaN;
        return Math.round(a / b);
    }
    return NaN;
}

function findSplitPointLearn(expr) {
    const mid = Math.floor(expr.length / 2);
    for (let offset = 0; offset < mid; offset++) {
        const fwd = mid + offset;
        const bwd = mid - offset;
        if (fwd < expr.length && (expr[fwd] === '+' || expr[fwd] === '-')) return fwd;
        if (bwd > 0 && (expr[bwd] === '+' || expr[bwd] === '-')) return bwd;
    }
    return -1;
}

function normalizeOpSymbol(op) {
    if (op === '*') return 'x';
    if (op === '/') return '/';
    return op;
}

function hidePracticePopups() {
    const ids = ['merge-popup', 'efficiency-popup', 'retro-panel'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

function shakePopup(popup) {
    popup.classList.add('shake');
    setTimeout(() => popup.classList.remove('shake'), 400);
}

function playLearnPop() {
    if (window.AudioSys && typeof window.AudioSys.play === 'function') {
        window.AudioSys.play('merge');
    }
}

function playLearnBuzzer() {
    if (window.AudioSys && typeof window.AudioSys.play === 'function') {
        window.AudioSys.play('error');
    }
}

function playLearnFanfare() {
    if (window.AudioSys && typeof window.AudioSys.play === 'function') {
        window.AudioSys.play('success');
    }
}

function launchLearnConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;

    const rect = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    canvas.width = Math.max(300, Math.floor(rect.width));
    canvas.height = Math.max(200, Math.floor(rect.height));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#F59E0B', '#06B6D4', '#10B981', '#EF4444', '#8B5CF6'];
    const particles = Array.from({ length: 100 }, () => ({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.4,
        vx: -2 + Math.random() * 4,
        vy: 2 + Math.random() * 4,
        size: 4 + Math.random() * 6,
        c: colors[Math.floor(Math.random() * colors.length)],
        r: Math.random() * Math.PI,
        vr: -0.12 + Math.random() * 0.24
    }));

    let frame = 0;
    const maxFrames = 90;

    function tick() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.r += p.vr;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.r);
            ctx.fillStyle = p.c;
            ctx.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size);
            ctx.restore();
        });

        frame += 1;
        if (frame < maxFrames) requestAnimationFrame(tick);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    tick();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

async function loadLearnExamples(moduleSlug, count) {
    const out = [];

    for (let i = 0; i < count; i++) {
        const fromApi = await fetchProblemFromApi(moduleSlug);
        if (fromApi && Array.isArray(fromApi.approaches)) {
            out.push(fromApi);
            continue;
        }

        const localGenerated = buildLocalLearnProblem(moduleSlug);
        if (localGenerated) {
            out.push(localGenerated);
        }
    }

    return out;
}

async function fetchProblemFromApi(moduleSlug) {
    try {
        const response = await fetch('/api/problem.php?module=' + encodeURIComponent(moduleSlug));
        if (!response.ok) return null;
        const text = await response.text();
        return JSON.parse(text);
    } catch (error) {
        return null;
    }
}

function buildLocalLearnProblem(moduleSlug) {
    if (moduleSlug === 'split_add') {
        const a = randomInt(22, 49);
        const b = randomInt(21, 45);
        const answer = a + b;
        const aT = Math.floor(a / 10) * 10;
        const aO = a % 10;
        const bT = Math.floor(b / 10) * 10;
        const bO = b % 10;
        return {
            module: moduleSlug,
            question: a + ' + ' + b,
            answer,
            approaches: [
                mkAp('A', aT + '+' + aO + '+' + bT + '+' + bO, [aT, aO, bT, bO], ['+', '+', '+'], true, 'Split & Add', 'Break both numbers into tens + ones, add each part separately'),
                mkAp('B', a + '+' + bT + '+' + bO, [a, bT, bO], ['+', '+'], false, null, null),
                mkAp('C', (aT + bT) + '+' + (aO + bO), [aT + bT, aO + bO], ['+'], false, null, null),
                mkAp('D', (Math.round(a / 10) * 10) + '+' + (answer - Math.round(a / 10) * 10), [Math.round(a / 10) * 10, answer - Math.round(a / 10) * 10], ['+'], false, null, null)
            ]
        };
    }

    if (moduleSlug === 'bridge_10') {
        const a = randomInt(6, 9);
        const need = 10 - a;
        const b = randomInt(need + 1, 9);
        const rest = b - need;
        const answer = a + b;
        return {
            module: moduleSlug,
            question: a + ' + ' + b,
            answer,
            approaches: [
                mkAp('A', a + '+' + need + '+' + rest, [a, need, rest], ['+', '+'], true, 'Bridge to 10', a + ' needs ' + need + ' to reach 10, then add the remaining ' + rest),
                mkAp('B', Math.floor(answer / 2) + '+' + Math.ceil(answer / 2), [Math.floor(answer / 2), Math.ceil(answer / 2)], ['+'], false, null, null),
                mkAp('C', b + '+' + (10 - b) + '+' + (answer - 10), [b, 10 - b, answer - 10], ['+', '+'], false, null, null),
                mkAp('D', '10+' + (answer - 10), [10, answer - 10], ['+'], false, null, null)
            ]
        };
    }

    if (moduleSlug === 'near_doubles') {
        const a = randomInt(5, 9);
        const b = a + 1;
        const answer = a + b;
        return {
            module: moduleSlug,
            question: a + ' + ' + b,
            answer,
            approaches: [
                mkAp('A', a + '+' + a + '+1', [a, a, 1], ['+', '+'], true, 'Near Doubles', 'Find the nearest double, solve it, adjust by +1'),
                mkAp('B', b + '+' + b + '-1', [b, b, 1], ['+', '-'], false, null, null),
                mkAp('C', (a - 1) + '+' + (b + 1), [a - 1, b + 1], ['+'], false, null, null),
                mkAp('D', '10+' + (answer - 10), [10, answer - 10], ['+'], false, null, null)
            ]
        };
    }

    if (moduleSlug === 'round_solve') {
        const a = randomInt(28, 79);
        const b = randomInt(11, 20);
        const answer = a + b;
        const roundA = Math.round(a / 10) * 10;
        const adjust = roundA - a;
        const bT = Math.floor(b / 10) * 10;
        const bO = b % 10;
        return {
            module: moduleSlug,
            question: a + ' + ' + b,
            answer,
            approaches: [
                mkAp('A', roundA + '+' + b + (adjust >= 0 ? '-' + adjust : '+' + Math.abs(adjust)), [roundA, b, Math.abs(adjust)], ['+', adjust >= 0 ? '-' : '+'], true, 'Round & Solve', 'Round ugly number to nearest 10, solve, subtract the rounding'),
                mkAp('B', a + '+' + bT + '+' + bO, [a, bT, bO], ['+', '+'], false, null, null),
                mkAp('C', (Math.floor(a / 10) * 10) + '+' + (a % 10) + '+' + b, [Math.floor(a / 10) * 10, a % 10, b], ['+', '+'], false, null, null),
                mkAp('D', (Math.floor(answer / 10) * 10) + '+' + (answer % 10), [Math.floor(answer / 10) * 10, answer % 10], ['+'], false, null, null)
            ]
        };
    }

    if (moduleSlug === 'split_multiply') {
        const a = randomInt(3, 8);
        const b = randomInt(11, 15);
        const answer = a * b;
        const h1 = Math.floor(b / 2);
        const h2 = b - h1;
        return {
            module: moduleSlug,
            question: a + ' x ' + b,
            answer,
            approaches: [
                mkAp('A', (a * 10) + '+' + (a * (b - 10)), [a * 10, a * (b - 10)], ['+'], true, 'Split to Multiply', 'Break one factor into (10 + ones), multiply each, add products'),
                mkAp('B', (a * h1) + '+' + (a * h2), [a * h1, a * h2], ['+'], false, null, null),
                mkAp('C', (a * (b + 1)) + '-' + a, [a * (b + 1), a], ['-'], false, null, null),
                mkAp('D', answer + '+0', [answer, 0], ['+'], false, null, null)
            ]
        };
    }

    if (moduleSlug === 'nines_trick') {
        const n = randomInt(2, 9);
        const answer = 9 * n;
        const k = randomInt(1, n - 1);
        return {
            module: moduleSlug,
            question: '9 x ' + n,
            answer,
            approaches: [
                mkAp('A', (10 * n) + '-' + n, [10 * n, n], ['-'], true, 'The 9s Trick', 'Multiply by 10, then subtract the number once'),
                mkAp('B', (9 * k) + '+' + (9 * (n - k)), [9 * k, 9 * (n - k)], ['+'], false, null, null),
                mkAp('C', (9 * (n - 1)) + '+9', [9 * (n - 1), 9], ['+'], false, null, null),
                mkAp('D', answer + '+0', [answer, 0], ['+'], false, null, null)
            ]
        };
    }

    return null;
}

function mkAp(id, expression, terms, operators, isOptimal, name, hint) {
    return { id, expression, terms, operators, isOptimal, name, hint };
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

window.initLearn = initLearn;

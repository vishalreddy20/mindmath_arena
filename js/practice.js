const CANVAS = { w: 0, h: 0 };
let svg, svgEl;
let _uid = 0;
const uid = () => 'n' + (++_uid) + '_' + Date.now();

const G = {
    phase: 'approach',
    question: null,
    approaches: [],
    chosen: null,
    nodes: [],
    selected: null,
    dragging: null,
    mergeA: null,
    mergeB: null,
    opChosen: null,
    history: []
};

async function initPractice(moduleSlug) {
    svgEl = document.getElementById('tree-svg');
    if (!svgEl) return;

    svg = d3.select('#tree-svg');
    CANVAS.w = svgEl.clientWidth || 900;
    CANVAS.h = svgEl.clientHeight || 500;

    const learnPanel = document.getElementById('learn-panel');
    const hintBanner = document.getElementById('learn-hint-banner');
    const retro = document.getElementById('retro-panel');
    const eff = document.getElementById('efficiency-popup');
    const merge = document.getElementById('merge-popup');
    if (learnPanel) {
        learnPanel.classList.add('hidden');
        learnPanel.innerHTML = '';
    }
    if (hintBanner) {
        hintBanner.classList.add('hidden');
        hintBanner.textContent = '';
    }
    if (retro) retro.classList.add('hidden');
    if (eff) eff.classList.add('hidden');
    if (merge) merge.classList.add('hidden');

    let data = null;
    try {
        const response = await fetch('/api/problem.php?module=' + encodeURIComponent(moduleSlug));
        if (!response.ok) throw new Error('Problem API failed');
        data = await response.json();
    } catch (error) {
        if (window.MindMathArenaApp && typeof window.MindMathArenaApp.getLocalProblem === 'function') {
            data = window.MindMathArenaApp.getLocalProblem(moduleSlug);
        }
    }

    if (!data || !Array.isArray(data.approaches)) {
        setStatus('Unable to load problem data.');
        return;
    }

    Object.assign(G, {
        phase: 'approach',
        question: data,
        approaches: data.approaches,
        chosen: null,
        nodes: [],
        selected: null,
        dragging: null,
        mergeA: null,
        mergeB: null,
        opChosen: null,
        history: []
    });

    renderApproachPhase();
    setStatus('Tap a bubble to choose your approach.');
}

function renderApproachPhase() {
    svg.selectAll('*').remove();

    const q = G.question;
    const cx = CANVAS.w / 2;
    const cy = 60;
    const leafY = CANVAS.h * 0.55;
    const n = G.approaches.length;
    const step = (CANVAS.w - 120) / (n - 1);

    const parentGroup = svg.append('g')
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

    G.approaches.forEach((ap, i) => {
        const lx = 60 + step * i;

        svg.append('path')
            .attr('d', 'M' + cx + ',' + (cy + 36) + ' C' + cx + ',' + ((cy + leafY) / 2) + ' ' + lx + ',' + ((cy + leafY) / 2) + ' ' + lx + ',' + (leafY - 40))
            .attr('fill', 'none')
            .attr('stroke', 'rgba(255,255,255,0.15)')
            .attr('stroke-width', 1.5);

        const g = svg.append('g')
            .attr('class', 'approach-bubble')
            .attr('data-id', ap.id)
            .attr('transform', 'translate(' + lx + ',' + leafY + ')')
            .style('cursor', 'pointer');

        g.append('circle')
            .attr('r', 40)
            .attr('fill', '#0f2034')
            .attr('stroke', ap.isOptimal ? '#F59E0B' : '#06B6D4')
            .attr('stroke-width', 2.5);

        const expr = ap.expression;
        const mid = findSplitPoint(expr);

        if (mid === -1 || expr.length <= 7) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .attr('fill', 'white')
                .attr('font-size', expr.length > 6 ? '10px' : '12px')
                .attr('font-weight', '600')
                .attr('pointer-events', 'none')
                .text(expr);
        } else {
            const line1 = expr.slice(0, mid);
            const line2 = expr.slice(mid);
            const t = g.append('text')
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .attr('font-size', '10px')
                .attr('font-weight', '600')
                .attr('pointer-events', 'none');
            t.append('tspan').attr('x', 0).attr('dy', '-0.65em').text(line1);
            t.append('tspan').attr('x', 0).attr('dy', '1.3em').text(line2);
        }

        g.on('click', () => handleApproachClick(ap));
    });
}

function findSplitPoint(expr) {
    const mid = Math.floor(expr.length / 2);
    for (let offset = 0; offset < mid; offset++) {
        const fwd = mid + offset;
        const bwd = mid - offset;
        if (fwd < expr.length && (expr[fwd] === '+' || expr[fwd] === '-')) return fwd;
        if (bwd > 0 && (expr[bwd] === '+' || expr[bwd] === '-')) return bwd;
    }
    return -1;
}

function handleApproachClick(ap) {
    if (G.phase !== 'approach') return;
    G.chosen = ap;

    if (!ap.isOptimal) {
        showEfficiencyPopup(ap, () => enterMergePhase(G.chosen));
    } else {
        enterMergePhase(ap);
    }
}

function showEfficiencyPopup(chosen, onContinue) {
    const optimal = G.approaches.find(a => a.isOptimal);
    const popup = document.getElementById('efficiency-popup');
    if (!popup) {
        onContinue();
        return;
    }

    popup.querySelector('.ep-text').textContent =
        'Smart thinking! The "' + optimal.name + '" way (' + optimal.expression + ') is a bit faster - but your approach works perfectly too!';

    popup.querySelector('.ep-keep').onclick = () => {
        popup.classList.add('hidden');
        onContinue();
    };

    popup.querySelector('.ep-switch').onclick = () => {
        popup.classList.add('hidden');
        G.chosen = optimal;
        enterMergePhase(optimal);
    };

    popup.classList.remove('hidden');
}

function enterMergePhase(ap) {
    G.phase = 'merge';
    G.history = [];

    G.nodes = ap.terms.map(v => ({
        id: uid(),
        value: v,
        x: 0,
        y: 0
    }));

    layoutNodes();
    renderMergePhase();
    setStatus('Merge the bubbles to find the answer!');
}

function layoutNodes() {
    const n = G.nodes.length;
    const pad = 80;
    const usable = CANVAS.w - pad * 2;
    const y = CANVAS.h - 100;

    G.nodes.forEach((node, i) => {
        node.x = n === 1 ? CANVAS.w / 2 : pad + (usable / (n - 1)) * i;
        node.y = y;
    });
}

function renderMergePhase() {
    svg.selectAll('*').remove();

    drawMergeBranches();

    G.nodes.forEach(node => {
        const g = svg.append('g')
            .attr('class', 'merge-bubble')
            .attr('data-nid', node.id)
            .attr('transform', 'translate(' + node.x + ',' + node.y + ')')
            .style('cursor', 'pointer');

        const isSelected = G.selected && G.selected.id === node.id;

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

        g.on('click', () => handleNodeClick(node));

        g.call(
            d3.drag()
                .on('start', () => {
                    G.dragging = node;
                })
                .on('drag', (event) => {
                    node.x = event.x;
                    node.y = event.y;
                    g.attr('transform', 'translate(' + node.x + ',' + node.y + ')');
                })
                .on('end', () => {
                    G.dragging = null;
                    const hit = G.nodes.find(n => n.id !== node.id && Math.hypot(n.x - node.x, n.y - node.y) < 65);
                    if (hit) {
                        openMergePopup(node, hit);
                    } else {
                        layoutNodes();
                        renderMergePhase();
                    }
                })
        );
    });

    updateStatusFromPhase();
}

function drawMergeBranches() {
    if (!Array.isArray(G.nodes) || G.nodes.length < 2) return;

    const parentX = CANVAS.w / 2;
    const parentY = Math.max(90, Math.min(CANVAS.h * 0.35, 180));

    const pg = svg.append('g')
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
        .text((G.question && G.question.question) ? G.question.question : 'Merge');

    G.nodes.forEach(node => {
        const midY = (parentY + node.y) * 0.5;
        svg.append('path')
            .attr('class', 'merge-branch')
            .attr('d', 'M' + parentX + ',' + (parentY + 30) + ' C' + parentX + ',' + midY + ' ' + node.x + ',' + midY + ' ' + node.x + ',' + (node.y - 30))
            .attr('fill', 'none')
            .attr('stroke', 'rgba(148,163,184,0.5)')
            .attr('stroke-width', 2)
            .attr('stroke-linecap', 'round');
    });
}

function handleNodeClick(node) {
    if (G.phase !== 'merge') return;

    if (G.selected && G.selected.id === node.id) {
        G.selected = null;
        renderMergePhase();
        setStatus('Merge the bubbles to find the answer!');
        return;
    }

    if (G.selected) {
        const a = G.selected;
        G.selected = null;
        openMergePopup(a, node);
        return;
    }

    G.selected = node;
    renderMergePhase();
    setStatus('Selected ' + node.value + '. Tap another bubble to merge.');
}

function openMergePopup(nodeA, nodeB) {
    G.mergeA = nodeA;
    G.mergeB = nodeB;
    G.opChosen = null;
    G.selected = null;

    const popup = document.getElementById('merge-popup');
    if (!popup) return;

    popup.querySelector('.mp-question').textContent = 'What is ' + nodeA.value + ' ? ' + nodeB.value;
    popup.querySelector('.mp-answer').value = '';
    popup.querySelector('.mp-confirm').disabled = true;

    popup.querySelectorAll('.mp-op').forEach(btn => {
        btn.classList.remove('selected');
        btn.onclick = () => {
            G.opChosen = btn.dataset.op;
            popup.querySelectorAll('.mp-op').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            checkConfirmReady();
        };
    });

    popup.querySelector('.mp-answer').oninput = checkConfirmReady;

    function checkConfirmReady() {
        const filled = popup.querySelector('.mp-answer').value.trim() !== '';
        popup.querySelector('.mp-confirm').disabled = !(G.opChosen && filled);
    }

    popup.querySelector('.mp-confirm').onclick = () => confirmMerge(popup);
    popup.classList.remove('hidden');
}

function confirmMerge(popup) {
    const userAnswer = Number(popup.querySelector('.mp-answer').value);
    const a = G.mergeA.value;
    const b = G.mergeB.value;
    const op = G.opChosen;

    let expected;
    if (op === '+') expected = a + b;
    if (op === '-') expected = a - b;
    if (op === '*') expected = a * b;
    if (op === '/') {
        if (b === 0) expected = NaN;
        else expected = Math.round(a / b);
    }

    if (!Number.isFinite(expected) || userAnswer !== expected) {
        popup.classList.add('shake');
        setTimeout(() => popup.classList.remove('shake'), 500);
        popup.querySelector('.mp-answer').value = '';
        playBuzzer();
        return;
    }

    popup.classList.add('hidden');

    const idA = G.mergeA.id;
    const idB = G.mergeB.id;

    G.history.push({ a, op, b, result: expected });
    G.mergeA = null;
    G.mergeB = null;
    G.opChosen = null;

    const refA = G.nodes.find(n => n.id === idA);
    const refB = G.nodes.find(n => n.id === idB);
    openMergePopupAndDoMerge(refA, refB, expected);
}

function openMergePopupAndDoMerge(nodeA, nodeB, result) {
    if (!nodeA || !nodeB) return;

    G.nodes = G.nodes.filter(n => n.id !== nodeA.id && n.id !== nodeB.id);
    G.nodes.push({ id: uid(), value: result, x: 0, y: 0 });

    layoutNodes();

    playPop();
    awardXP(10);

    if (G.nodes.length === 1) {
        setTimeout(() => checkFinalAnswer(G.nodes[0].value), 400);
    } else {
        renderMergePhase();
        setStatus('Nice! ' + G.nodes.length + ' bubble' + (G.nodes.length > 1 ? 's' : '') + ' left - keep merging!');
    }
}

function checkFinalAnswer(finalValue) {
    if (finalValue === G.question.answer) {
        G.phase = 'done';
        setStatus('');
        launchConfetti();
        playFanfare();

        if (window.MindMathArenaApp && typeof window.MindMathArenaApp.recordModuleCompletion === 'function') {
            window.MindMathArenaApp.recordModuleCompletion(G.question.module, 'practice');
        }

        awardXP(25);
        incrementStreak();
        setTimeout(() => showRetrospective(), 1800);
    } else {
        setStatus('Something went wrong - tap Restart to try again.');
    }
}

function showRetrospective() {
    const optimal = G.approaches.find(a => a.isOptimal);
    const chosen = G.chosen;
    const isBest = chosen.id === optimal.id;
    const retro = document.getElementById('retro-panel');
    if (!retro) return;

    retro.querySelector('.rp-your-path').textContent = chosen.expression;
    retro.querySelector('.rp-optimal-path').textContent = optimal.expression;
    retro.querySelector('.rp-message').textContent = isBest
        ? 'You used the fastest strategy! Outstanding!'
        : 'Both work! The "' + optimal.name + '" approach saves steps - try it next time.';

    retro.querySelector('.rp-next').onclick = () => {
        retro.classList.add('hidden');
        initPractice(G.question.module);
    };

    retro.classList.remove('hidden');
}

function setStatus(msg) {
    const el = document.getElementById('status-bar');
    if (el) el.textContent = msg;
}

function updateStatusFromPhase() {
    if (G.phase === 'merge' && !G.selected) {
        setStatus('Merge the bubbles to find the answer!');
    }
}

function awardXP(amount) {
    if (window.MindMathArenaApp && typeof window.MindMathArenaApp.addXp === 'function') {
        window.MindMathArenaApp.addXp(amount);
    }
}

function incrementStreak() {
    if (window.MindMathArenaApp && typeof window.MindMathArenaApp.addStreak === 'function') {
        window.MindMathArenaApp.addStreak(1);
    }
}

function playPop() {
    if (window.AudioSys && typeof window.AudioSys.play === 'function') {
        window.AudioSys.play('merge');
    }
}

function playBuzzer() {
    if (window.AudioSys && typeof window.AudioSys.play === 'function') {
        window.AudioSys.play('error');
    }
}

function playFanfare() {
    if (window.AudioSys && typeof window.AudioSys.play === 'function') {
        window.AudioSys.play('success');
    }
}

function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;

    const rect = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    canvas.width = Math.max(300, Math.floor(rect.width));
    canvas.height = Math.max(200, Math.floor(rect.height));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#F59E0B', '#06B6D4', '#10B981', '#EF4444', '#8B5CF6'];
    const pieces = Array.from({ length: 120 }, () => ({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.4,
        vx: -2 + Math.random() * 4,
        vy: 2 + Math.random() * 4,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI,
        vr: -0.1 + Math.random() * 0.2
    }));

    let frame = 0;
    const maxFrames = 90;

    function tick() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vr;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size);
            ctx.restore();
        });

        frame += 1;
        if (frame < maxFrames) {
            requestAnimationFrame(tick);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    tick();
}

window.initPractice = initPractice;

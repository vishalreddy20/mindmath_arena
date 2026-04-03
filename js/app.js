class MindMathApp {
    constructor() {
        this.state = {
            player: null,
            currentStrategy: null,
            level: 1,
            xp: 0,
            xpToNext: 200,
            streak: 0,
            badges: [],
            lastLearnSession: null
        };
        
        this.strategies = [
            { id: 'partitioning', name: 'Split & Add', description: 'Break numbers into tens and ones, then add them up!', difficulty: 1 },
            { id: 'bridging', name: 'Bridge to 10', description: 'Make 10 first, then add what\'s left!', difficulty: 1 },
            { id: 'near-doubles', name: 'Near Doubles', description: 'Find the double, then add a little more!', difficulty: 1 },
            { id: 'compensation', name: 'Round & Solve', description: 'Round to a friendly number, then adjust!', difficulty: 2 },
            { id: 'mult-partition', name: 'Split to Multiply', description: 'Break a number apart to make multiplication easy!', difficulty: 2 },
            { id: 'multiply-nine', name: 'The 9s Trick', description: 'Multiply by 10 and subtract — it\'s magic!', difficulty: 2 }
        ];

        this.initDOM();
        this.bindEvents();
        // Try to restore from localStorage first
        this.loadLocalState();
        // Then check PHP backend session
        this.checkSession();
    }

    initDOM() {
        this.views = {
            auth: document.getElementById('view-auth'),
            dashboard: document.getElementById('view-dashboard'),
            arena: document.getElementById('view-arena')
        };
        
        this.renderStrategyCards();
    }

    bindEvents() {
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('btn-back-dashboard').addEventListener('click', () => {
            this.updateDashboard();
            this.switchView('dashboard');
        });
        document.getElementById('btn-next-problem').addEventListener('click', () => this.loadProblem());
        document.getElementById('btn-how-to-play').addEventListener('click', () => this.showHowToPlay());
        document.getElementById('btn-howto-start').addEventListener('click', () => this.hideHowToPlay());
        document.getElementById('btn-howto-dont-show').addEventListener('click', () => this.hideHowToPlay(true));
        document.getElementById('btn-continue-levelup').addEventListener('click', () => {
            document.getElementById('levelup-overlay').classList.add('hidden');
        });
        document.getElementById('btn-restart-problem').addEventListener('click', () => this.loadProblem());

        
        // Listen for tree engine custom events
        document.addEventListener('node-merge-success', (e) => this.handleMergeSuccess(e.detail));
        document.addEventListener('node-merge-fail', (e) => this.handleMergeFail(e.detail));
        document.addEventListener('strategy-complete', (e) => this.handleProblemComplete(e.detail));
    }

    switchView(viewName) {
        Object.values(this.views).forEach(v => {
            if (v) v.classList.remove('active');
        });
        if (this.views[viewName]) {
            this.views[viewName].classList.add('active');
        }
    }

    async checkSession() {
        try {
            const response = await fetch('api/index.php?endpoint=session');
            const data = await response.json();
            if (data.session_active && data.player) {
                this.updateStateFromBackend(data);
                this.switchView('dashboard');
            }
        } catch (e) {
            console.error("No active session or backend not ready", e);
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        if (!username) return;

        try {
            const response = await fetch('api/index.php?endpoint=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await response.json();
            
            this.updateStateFromBackend(data);
            this.switchView('dashboard');
        } catch (e) {
            console.error("Login failed, falling back to local mode", e);
            this.state.player = username;
            this.saveLocalState();
            this.updateDashboard();
            this.switchView('dashboard');
        }
    }

    // ─── localStorage persistence ───
    saveLocalState() {
        try {
            localStorage.setItem('mindmath_state', JSON.stringify({
                player: this.state.player,
                level: this.state.level,
                xp: this.state.xp,
                xpToNext: this.state.xpToNext,
                badges: this.state.badges,
                lastLearnSession: this.state.lastLearnSession
            }));
        } catch(e) { /* ignore */ }
    }

    loadLocalState() {
        try {
            const saved = localStorage.getItem('mindmath_state');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.player) {
                    this.state.player = data.player;
                    this.state.level = data.level || 1;
                    this.state.xp = data.xp || 0;
                    this.state.xpToNext = data.xpToNext || 200;
                    this.state.badges = data.badges || [];
                    this.state.lastLearnSession = data.lastLearnSession || null;
                    this.updateDashboard();
                    this.switchView('dashboard');
                }
            }
        } catch(e) { /* ignore */ }
    }

    updateStateFromBackend(data) {
        if(data.player) this.state.player = data.player;
        if(data.level) this.state.level = data.level;
        if(data.xp !== undefined) this.state.xp = data.xp;
        if(data.xpToNext) this.state.xpToNext = data.xpToNext;
        if(data.badges) this.state.badges = data.badges;
        if(data.lastLearnSession) this.state.lastLearnSession = data.lastLearnSession;
        this.updateDashboard();
    }

    renderStrategyCards() {
        const grid = document.getElementById('strategy-grid');
        grid.innerHTML = '';
        
        this.strategies.forEach(strat => {
            const card = document.createElement('div');
            card.className = 'strategy-card glass-panel';
            card.innerHTML = `
                <h4>${strat.name}</h4>
                <p>${strat.description}</p>
                <div class="difficulty-badge difficulty-${strat.difficulty}">Lvl ${strat.difficulty}</div>
                <div class="card-buttons">
                    <button class="btn btn-small btn-learn">🎯 Enter Arena</button>
                </div>
            `;
            // Simplified: Only one entry point to the high-fidelity unified engine
            card.querySelector('.btn-learn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.startArena(strat);
            });
            grid.appendChild(card);
        });
    }

    startArena(strat) {
        this.state.currentStrategy = strat;
        this.state.streak = 0;
        this.isPracticeMode = true; // Always active mode
        document.getElementById('arena-strategy-title').textContent = strat.name;
        document.getElementById('arena-streak').textContent = this.state.streak;
        document.getElementById('success-overlay').classList.add('hidden');
        this.switchView('arena');
        if (!this.getHowToPlayHidden()) {
            this.showHowToPlay();
        }
        this.loadProblem();
    }

    getHowToPlayHidden() {
        try {
            return localStorage.getItem('mindmath_hide_howto') === '1';
        } catch (e) {
            return false;
        }
    }

    showHowToPlay() {
        const overlay = document.getElementById('how-to-play-overlay');
        if (overlay) overlay.classList.remove('hidden');
    }

    hideHowToPlay(remember = false) {
        const overlay = document.getElementById('how-to-play-overlay');
        if (overlay) overlay.classList.add('hidden');
        if (remember) {
            try {
                localStorage.setItem('mindmath_hide_howto', '1');
            } catch (e) {
                // ignore storage failures
            }
        }
    }

    updateDashboard() {
        document.getElementById('dash-player-name').textContent = this.state.player || 'Player';
        document.getElementById('dash-level').textContent = this.state.level;
        document.getElementById('dash-xp-text').textContent = `${this.state.xp} / ${this.state.xpToNext} XP`;
        
        const pct = Math.min(100, (this.state.xp / this.state.xpToNext) * 100);
        document.getElementById('dash-xp-fill').style.width = `${pct}%`;
        
        // Render badges
        const badgesContainer = document.getElementById('badges-container');
        badgesContainer.innerHTML = '';
        if(this.state.badges.length === 0) {
            badgesContainer.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">No badges yet. Start matching!</p>';
        } else {
            this.state.badges.forEach(b => {
                badgesContainer.innerHTML += `
                    <div class="badge-item">
                        <span class="badge-icon">${b.icon}</span>
                        <div>
                            <div style="font-weight:bold">${b.name}</div>
                            <div style="font-size:0.8rem;color:var(--text-muted)">${b.desc}</div>
                        </div>
                    </div>`;
            });
        }
    }

    startStrategy(strat, isPractice = false) {
        this.state.currentStrategy = strat;
        this.state.streak = 0;
        this.isPracticeMode = isPractice;
        document.getElementById('arena-strategy-title').textContent = isPractice ? strat.name + ' - Practice' : strat.name;
        document.getElementById('arena-streak').textContent = this.state.streak;
        document.getElementById('success-overlay').classList.add('hidden');
        this.switchView('arena');
        this.loadProblem();
    }

    async loadProblem() {
        document.getElementById('success-overlay').classList.add('hidden');
        document.getElementById('tree-container').innerHTML = ''; // Clear SVG
        
        // Tell Engine to show loading
        if (window.AudioSys) window.AudioSys.play('start');

        let problemData;
        try {
            // Try fetching from backend
            const response = await fetch(`api/index.php?endpoint=problem&strategy=${this.state.currentStrategy.id}&level=${this.state.level}`);
            problemData = await response.json();
            if(problemData.error) throw new Error(problemData.error);
        } catch (e) {
            console.warn("Backend problem generation failed/offline, using local fallback generator");
            problemData = this.generateFallbackProblem(this.state.currentStrategy.id);
        }

        if (this.isPracticeMode) {
            problemData = this.applyPracticeContinuity(problemData);
        }

        if (problemData && problemData.level === undefined) {
            problemData.level = this.state.level || 1;
        }

        // Initialize specific strategy logic class
        const strategyClassMap = {
            'compensation': CompensationStrategy,
            'partitioning': PartitioningStrategy,
            'bridging': BridgingStrategy,
            'near-doubles': NearDoublesStrategy,
            'mult-partition': MultPartitionStrategy,
            'multiply-nine': MultiplyNineStrategy
        };
        
        const StratClass = strategyClassMap[this.state.currentStrategy.id];
        if (StratClass) {
            this.currentStrategyController = new StratClass(problemData);
            const initialTreeData = this.currentStrategyController.getInitialTree();
            
            // Re-init engine
            if(!this.treeEngine) {
                this.treeEngine = new TreeEngine('#tree-container');
                this.treeEngine.setHintCallback((hint) => {
                    document.getElementById('hint-text').textContent = hint || "Tap to split. Drag to combine.";
                });
            }
            if (!this.sandboxEngine) {
                this.sandboxEngine = new SandboxEngine('#tree-container');
                this.sandboxEngine.setHintCallback((hint) => {
                    document.getElementById('hint-text').textContent = hint || "Tap to split. Drag to combine.";
                });
            }

            this.activeEngine = this.sandboxEngine; // Use the combined physics tree
            
            this.activeEngine.setStrategyController(this.currentStrategyController);
            this.activeEngine.render(initialTreeData);
            
            this.captureLearnSession(problemData);
        } else {
            document.getElementById('hint-text').textContent = "Strategy module not loaded yet!";
        }
    }

    handleMergeSuccess(detail) {
        if (window.AudioSys) window.AudioSys.play('merge');
        if (!this.isPracticeMode) {
            document.getElementById('hint-text').textContent = detail.message || "Good move!";
        }
    }

    handleMergeFail(detail) {
        if (window.AudioSys) window.AudioSys.play('error');
        document.getElementById('hint-text').textContent = this.isPracticeMode
            ? (detail.message || "Try a different move!")
            : (detail.message || "Not quite! Try again.");
        // Don't reset streak on wrong drag - too punishing for kids
    }

    async handleProblemComplete(detail) {
        if (window.AudioSys) window.AudioSys.play('success');
        this.state.streak += 1;
        document.getElementById('arena-streak').textContent = this.state.streak;
        
        let completionData;
        try {
            const response = await fetch('api/index.php?endpoint=complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    strategy: this.state.currentStrategy.id,
                    time: detail.timeTaken,
                    streak: this.state.streak
                })
            });
            completionData = await response.json();
            this.updateStateFromBackend(completionData.state);
        } catch (e) {
            // Local fallback simulation
            const earnedXp = 50 + (this.state.streak * 5);
            this.state.xp += earnedXp;
            completionData = { earnedXp: earnedXp, newBadges: [], leveledUp: false };
            while(this.state.xp >= this.state.xpToNext) {
                this.state.level++;
                this.state.xp = this.state.xp - this.state.xpToNext;
                this.state.xpToNext = Math.floor(this.state.xpToNext * 1.5);
                completionData.leveledUp = true;
            }
            this.saveLocalState();
            this.updateDashboard();
        }

        // Show success overlay
        setTimeout(() => {
            this.showStandardSuccess(completionData);
        }, 800);
    }
    
    showStandardSuccess(completionData) {
        const overlay = document.getElementById('success-overlay');
        const statsBox = overlay.querySelector('.stats-box');
        
        overlay.querySelector('h2').textContent = "Success!";
        overlay.querySelector('.earned-xp').innerHTML = `+<span id="result-xp">${completionData.earnedXp}</span> XP`;
        statsBox.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">XP Earned</span>
                <span class="stat-value text-accent-green">+${completionData.earnedXp}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total XP</span>
                <span class="stat-value text-accent-cyan" id="arena-xp-total">${this.state.xp}</span>
            </div>
        `;
        
        const nextBtn = document.getElementById('btn-next-problem');
        if (nextBtn) nextBtn.textContent = "Next Problem";
        
        overlay.classList.remove('hidden');
        
        if (completionData.leveledUp && !this.isPracticeMode) {
            setTimeout(() => {
                document.getElementById('new-level-display').textContent = this.state.level;
                document.getElementById('levelup-overlay').classList.remove('hidden');
                if (window.AudioSys) window.AudioSys.play('levelup');
            }, 1000);
        }
        
        if (completionData.newBadges && completionData.newBadges.length > 0) {
            completionData.newBadges.forEach(b => {
                if (window.GamificationSys) window.GamificationSys.showToast(`${b.icon} Badge Unlocked!`, b.name);
            });
        }
    }

    captureLearnSession(problemData) {
        this.state.lastLearnSession = {
            strategyId: this.state.currentStrategy.id,
            operands: problemData.operands,
            operation: problemData.operation,
            recordedAt: Date.now()
        };
        this.saveLocalState();
    }

    applyPracticeContinuity(problemData) {
        const last = this.state.lastLearnSession;
        if (!last || last.strategyId !== this.state.currentStrategy.id || !Array.isArray(last.operands)) {
            return problemData;
        }

        const roll = Math.random();
        if (roll > 0.7) return problemData;

        const varied = this.varyOperandsForStrategy(last.strategyId, last.operands.slice());
        return {
            ...problemData,
            operands: varied,
            equation: this.buildEquation(last.strategyId, varied),
            operation: problemData.operation || last.operation
        };
    }

    varyOperandsForStrategy(strategyId, operands) {
        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
        const tweak = (v, delta = 2) => v + (Math.floor(Math.random() * (delta * 2 + 1)) - delta);

        if (strategyId === 'multiply-nine') {
            const first = clamp(tweak(operands[0], 1), 2, 9);
            return [first, 9];
        }

        if (strategyId === 'near-doubles') {
            const base = clamp(tweak(Math.min(operands[0], operands[1]), 1), 3, 12);
            return [base, base + 1];
        }

        if (strategyId === 'bridging') {
            const first = clamp(tweak(operands[0], 1), 6, 9);
            const need = 10 - first;
            const second = clamp(Math.max(need + 1, tweak(operands[1], 2)), 3, 12);
            return [first, second];
        }

        if (strategyId === 'mult-partition') {
            const a = clamp(tweak(operands[0], 1), 2, 6);
            const b = clamp(tweak(operands[1], 2), 11, 19);
            return [a, b];
        }

        if (strategyId === 'compensation') {
            const right = clamp(tweak(operands[1], 2), 9, 49);
            const left = clamp(Math.max(right + 2, tweak(operands[0], 3)), right + 1, 80);
            return [left, right];
        }

        const first = clamp(tweak(operands[0], 3), 10, 60);
        const second = clamp(tweak(operands[1], 3), 10, 60);
        return [first, second];
    }

    buildEquation(strategyId, operands) {
        const [a, b] = operands;
        if (strategyId === 'multiply-nine' || strategyId === 'mult-partition') {
            return `${a} × ${b}`;
        }
        if (strategyId === 'compensation') {
            return `${a} - ${b}`;
        }
        return `${a} + ${b}`;
    }

    buildPracticeRetrospective(detail) {
        const path = Array.isArray(detail.practicePath) ? detail.practicePath : [];
        const childPath = path.length
            ? path.map((step, idx) => {
                if (step.type === 'split') {
                    return `<li>${idx + 1}. ${step.target} = ${step.left} ${step.op} ${step.right}</li>`;
                }
                return `<li>${idx + 1}. ${step.left} ${step.op} ${step.right} = ${step.result}</li>`;
            }).join('')
            : '<li>You solved it with smart moves!</li>';

        const optimalRaw = this.currentStrategyController && this.currentStrategyController.getOptimalPathText
            ? this.currentStrategyController.getOptimalPathText()
            : 'Use your learned strategy to reduce steps.';

        const optimalSteps = optimalRaw
            .split('<br>')
            .map(s => s.trim())
            .filter(Boolean)
            .map(s => `<li>${s}</li>`)
            .join('');

        const insightMap = {
            partitioning: 'Key insight: Group tens and ones separately before combining.',
            bridging: 'Key insight: Make 10 first, then add the leftover.',
            'near-doubles': 'Key insight: Double the close number, then adjust by the difference.',
            compensation: 'Key insight: Round to a friendly number, then compensate the difference.',
            'mult-partition': 'Key insight: Split into tens and ones, multiply each part, then add.',
            'multiply-nine': 'Key insight: Turn ×9 into ×10 minus ×1.'
        };

        const keyInsight = insightMap[this.state.currentStrategy.id] || 'Key insight: Use the learned trick to cut steps.';

        return `
            <div class="practice-retrospective">
                <div class="retro-title">There's a faster way - here's the trick you learned!</div>
                <div class="retro-layout">
                    <section class="retro-card">
                        <h4>Your Path</h4>
                        <ol>${childPath}</ol>
                    </section>
                    <section class="retro-card retro-card-optimal">
                        <h4>Learn Mode Path</h4>
                        <ol>${optimalSteps}</ol>
                        <div class="retro-key-insight">${keyInsight}</div>
                    </section>
                </div>
            </div>
        `;
    }
    
    // Fallback generators if PHP is not available
    generateFallbackProblem(strategyId) {
        const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const lvl = this.state.level || 1;
        // Scale difficulty gently with level
        
        if(strategyId === 'compensation') {
            // Kids: small subtraction, right operand near a ten (e.g. 23-9, 35-19)
            let tens = [10, 20, 30][rand(0, 2)];
            let o2 = tens - 1; // 9, 19, or 29
            let o1 = o2 + rand(3, 15); // ensure positive answer
            return {
                equation: `${o1} - ${o2}`,
                operands: [o1, o2],
                operation: '-',
                adjustment: 1,
                direction: '+'
            };
        } else if (strategyId === 'partitioning') {
            // Kids: two-digit + two-digit, keep sums under 100
            let o1 = rand(11, 35), o2 = rand(11, 35);
            return { equation: `${o1} + ${o2}`, operands: [o1, o2], operation: '+' };
        } else if (strategyId === 'bridging') {
            // Kids: first number close to 10 (6-9), second small (3-7)
            let o1 = rand(6, 9), o2 = rand(3, 7);
            // Ensure o2 > (10 - o1) so there's a remainder to bridge
            if (o2 <= (10 - o1)) o2 = (10 - o1) + 1;
            return { equation: `${o1} + ${o2}`, operands: [o1, o2], operation: '+' };
        } else if (strategyId === 'near-doubles') {
            // Kids: adjacent numbers 3-12 so doubles stay small
            let o1 = rand(3, 12);
            return { equation: `${o1} + ${o1 + 1}`, operands: [o1, o1 + 1], operation: '+' };
        } else if (strategyId === 'mult-partition') {
            // Kids: small multiplier (2-5) × teen number (11-15)
            let o1 = rand(2, 5), o2 = rand(11, 15);
            return { equation: `${o1} × ${o2}`, operands: [o1, o2], operation: '×', type: 'add' };
        } else if (strategyId === 'multiply-nine') {
            // Kids: single digit × 9 (2-9)
            let o1 = rand(2, 9);
            return { equation: `${o1} × 9`, operands: [o1, 9], operation: '×' };
        }
    }
}

// Init when DOM loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MindMathApp();
});

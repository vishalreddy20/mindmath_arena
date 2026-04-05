const MODULES = [
    {
        id: 'split_add',
        name: 'Split & Add',
        level: 1,
        tagline: 'Break both numbers into tens and ones.',
        description: 'Split each addend into tens and ones, then combine the parts.',
        learn: 'Learn',
        practice: 'Practice'
    },
    {
        id: 'bridge_10',
        name: 'Bridge to 10',
        level: 1,
        tagline: 'Make 10 first, then add the rest.',
        description: 'Find the number needed to reach 10, then finish the sum.',
        learn: 'Learn',
        practice: 'Practice'
    },
    {
        id: 'near_doubles',
        name: 'Near Doubles',
        level: 1,
        tagline: 'Use a close double and adjust.',
        description: 'Find the nearest double, then add or subtract the small difference.',
        learn: 'Learn',
        practice: 'Practice'
    },
    {
        id: 'round_solve',
        name: 'Round & Solve',
        level: 1,
        tagline: 'Round, solve, then adjust back.',
        description: 'Round one number to a friendly ten, solve, and compensate.',
        learn: 'Learn',
        practice: 'Practice'
    },
    {
        id: 'split_multiply',
        name: 'Split to Multiply',
        level: 2,
        tagline: 'Break one factor into 10 and ones.',
        description: 'Use the distributive property to split a two-digit factor.',
        learn: 'Learn',
        practice: 'Practice'
    },
    {
        id: 'nines_trick',
        name: 'The 9s Trick',
        level: 2,
        tagline: 'Multiply by 10, then subtract once.',
        description: 'A fast shortcut for multiplying by 9.',
        learn: 'Learn',
        practice: 'Practice'
    }
];

const STORAGE_KEY = 'mindmath-arena-state-clean';

const LOCAL_PROBLEMS = {
    split_add: {
        module: 'split_add',
        question: '39 + 45',
        answer: 84,
        approaches: [
            { id: 'A', expression: '30+9+40+5', terms: [30, 9, 40, 5], operators: ['+', '+', '+'], isOptimal: true, name: 'Split & Add', hint: 'Split both numbers into tens and ones, then combine.' },
            { id: 'B', expression: '39+40+5', terms: [39, 40, 5], operators: ['+', '+'], isOptimal: false, name: null, hint: null },
            { id: 'C', expression: '70+14', terms: [70, 14], operators: ['+'], isOptimal: false, name: null, hint: null },
            { id: 'D', expression: '40+44', terms: [40, 44], operators: ['+'], isOptimal: false, name: null, hint: null }
        ]
    },
    bridge_10: {
        module: 'bridge_10',
        question: '8 + 6',
        answer: 14,
        approaches: [
            { id: 'A', expression: '8+2+4', terms: [8, 2, 4], operators: ['+', '+'], isOptimal: true, name: 'Bridge to 10', hint: '8 needs 2 to reach 10, then add the remaining 4' },
            { id: 'B', expression: '7+7', terms: [7, 7], operators: ['+'], isOptimal: false, name: null, hint: null },
            { id: 'C', expression: '6+4+4', terms: [6, 4, 4], operators: ['+', '+'], isOptimal: false, name: null, hint: null },
            { id: 'D', expression: '10+4', terms: [10, 4], operators: ['+'], isOptimal: false, name: null, hint: null }
        ]
    },
    near_doubles: {
        module: 'near_doubles',
        question: '6 + 7',
        answer: 13,
        approaches: [
            { id: 'A', expression: '6+6+1', terms: [6, 6, 1], operators: ['+', '+'], isOptimal: true, name: 'Near Doubles', hint: 'Use the nearest double and adjust by 1.' },
            { id: 'B', expression: '7+7-1', terms: [7, 7, 1], operators: ['+', '-'], isOptimal: false, name: null, hint: null },
            { id: 'C', expression: '5+8', terms: [5, 8], operators: ['+'], isOptimal: false, name: null, hint: null },
            { id: 'D', expression: '10+3', terms: [10, 3], operators: ['+'], isOptimal: false, name: null, hint: null }
        ]
    },
    round_solve: {
        module: 'round_solve',
        question: '29 + 14',
        answer: 43,
        approaches: [
            { id: 'A', expression: '30+14-1', terms: [30, 14, 1], operators: ['+', '-'], isOptimal: true, name: 'Round & Solve', hint: 'Round to the nearest ten, solve, then subtract the rounding.' },
            { id: 'B', expression: '29+10+4', terms: [29, 10, 4], operators: ['+', '+'], isOptimal: false, name: null, hint: null },
            { id: 'C', expression: '20+9+14', terms: [20, 9, 14], operators: ['+', '+'], isOptimal: false, name: null, hint: null },
            { id: 'D', expression: '40+3', terms: [40, 3], operators: ['+'], isOptimal: false, name: null, hint: null }
        ]
    },
    split_multiply: {
        module: 'split_multiply',
        question: '6 x 14',
        answer: 84,
        approaches: [
            { id: 'A', expression: '60+24', terms: [60, 24], operators: ['+'], isOptimal: true, name: 'Split to Multiply', hint: 'Split one factor into 10 and ones, multiply each, then add.' },
            { id: 'B', expression: '42+42', terms: [42, 42], operators: ['+'], isOptimal: false, name: null, hint: null },
            { id: 'C', expression: '90-6', terms: [90, 6], operators: ['-'], isOptimal: false, name: null, hint: null },
            { id: 'D', expression: '84+0', terms: [84, 0], operators: ['+'], isOptimal: false, name: null, hint: null }
        ]
    },
    nines_trick: {
        module: 'nines_trick',
        question: '9 x 7',
        answer: 63,
        approaches: [
            { id: 'A', expression: '70-7', terms: [70, 7], operators: ['-'], isOptimal: true, name: 'The 9s Trick', hint: 'Multiply by 10, then subtract the number once.' },
            { id: 'B', expression: '36+27', terms: [36, 27], operators: ['+'], isOptimal: false, name: null, hint: null },
            { id: 'C', expression: '45+18', terms: [45, 18], operators: ['+'], isOptimal: false, name: null, hint: null },
            { id: 'D', expression: '63+0', terms: [63, 0], operators: ['+'], isOptimal: false, name: null, hint: null }
        ]
    }
};

const DEFAULT_STATE = {
    player: null,
    level: 1,
    xp: 0,
    xpToNext: 200,
    streak: 0,
    badges: [],
    moduleWins: {},
    learnedModules: {},
    lastModuleId: null,
    lastMode: null
};

const App = {
    state: { ...DEFAULT_STATE },
    views: {},
    initialized: false,

    init() {
        if (this.initialized) return;
        this.initialized = true;

        this.views = {
            auth: document.getElementById('view-auth'),
            dashboard: document.getElementById('view-dashboard'),
            arena: document.getElementById('view-arena')
        };

        this.bindEvents();
        this.loadLocalState();
        this.syncSession();
        this.renderDashboard();

        if (this.state.player) {
            this.switchView('dashboard');
        }
    },

    bindEvents() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', event => this.handleLogin(event));
        }

        const backButton = document.getElementById('btn-back-dashboard');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.switchView('dashboard');
            });
        }

        const restartButton = document.getElementById('btn-restart-problem');
        if (restartButton) {
            restartButton.addEventListener('click', () => {
                if (this.state.lastModuleId && this.state.lastMode) {
                    this.startModule(this.state.lastModuleId, this.state.lastMode);
                }
            });
        }

        const nextButton = document.getElementById('btn-next-problem');
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                if (this.state.lastModuleId && this.state.lastMode) {
                    this.startModule(this.state.lastModuleId, this.state.lastMode);
                }
            });
        }

        const howToButton = document.getElementById('btn-how-to-play');
        if (howToButton) {
            howToButton.addEventListener('click', () => this.showHowToPlay());
        }

        const howToStart = document.getElementById('btn-howto-start');
        if (howToStart) {
            howToStart.addEventListener('click', () => this.hideHowToPlay());
        }

        const howToDontShow = document.getElementById('btn-howto-dont-show');
        if (howToDontShow) {
            howToDontShow.addEventListener('click', () => this.hideHowToPlay(true));
        }

        const continueButton = document.getElementById('btn-continue-levelup');
        if (continueButton) {
            continueButton.addEventListener('click', () => {
                const overlay = document.getElementById('levelup-overlay');
                if (overlay) overlay.classList.add('hidden');
            });
        }

        document.addEventListener('click', event => {
            const learnButton = event.target.closest('[data-module-learn]');
            if (learnButton) {
                this.startModule(learnButton.dataset.moduleLearn, 'learn');
                return;
            }

            const practiceButton = event.target.closest('[data-module-practice]');
            if (practiceButton) {
                this.startModule(practiceButton.dataset.modulePractice, 'practice');
                return;
            }
        });
    },

    switchView(viewName) {
        Object.values(this.views).forEach(view => {
            if (view) view.classList.remove('active');
        });

        const target = this.views[viewName];
        if (target) target.classList.add('active');
    },

    async syncSession() {
        try {
            const response = await fetch('api/index.php?endpoint=session');
            const data = await response.json();
            if (data && data.session_active && data.player) {
                this.applyBackendState(data);
                this.switchView('dashboard');
            }
        } catch (error) {
            // Offline/local fallback is fine for submission.
        }
    },

    async handleLogin(event) {
        event.preventDefault();
        const input = document.getElementById('username');
        const username = input ? input.value.trim() : '';
        if (!username) return;

        try {
            const response = await fetch('api/index.php?endpoint=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await response.json();
            this.applyBackendState(data);
            this.switchView('dashboard');
        } catch (error) {
            this.state.player = username;
            this.saveLocalState();
            this.renderDashboard();
            this.switchView('dashboard');
        }
    },

    applyBackendState(data) {
        if (!data) return;
        if (data.player) this.state.player = data.player;
        if (data.level !== undefined) this.state.level = data.level;
        if (data.xp !== undefined) this.state.xp = data.xp;
        if (data.xpToNext !== undefined) this.state.xpToNext = data.xpToNext;
        if (Array.isArray(data.badges)) this.state.badges = data.badges;
        this.saveLocalState();
        this.renderDashboard();
    },

    recordModuleCompletion(moduleId, mode = 'practice') {
        if (!moduleId) return;

        this.state.moduleWins[moduleId] = (this.state.moduleWins[moduleId] || 0) + 1;
        if (mode === 'learn') {
            this.state.learnedModules[moduleId] = true;
        }

        this.renderDashboard();
        this.saveLocalState();
    },

    addXp(amount) {
        this.state.xp = (this.state.xp || 0) + amount;
        this.renderDashboard();
        this.saveLocalState();
    },

    addStreak(amount = 1) {
        this.state.streak = (this.state.streak || 0) + amount;
        this.renderDashboard();
        this.saveLocalState();
    },

    loadLocalState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            this.state = {
                ...DEFAULT_STATE,
                ...saved,
                moduleWins: saved.moduleWins || {},
                learnedModules: saved.learnedModules || {},
                badges: Array.isArray(saved.badges) ? saved.badges : []
            };
        } catch (error) {
            this.state = { ...DEFAULT_STATE };
        }
    },

    saveLocalState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch (error) {
            // Ignore storage failures.
        }
    },

    getLocalProblem(moduleId) {
        const source = LOCAL_PROBLEMS[moduleId] || LOCAL_PROBLEMS.split_add;
        if (typeof structuredClone === 'function') {
            return structuredClone(source);
        }
        return JSON.parse(JSON.stringify(source));
    },

    renderDashboard() {
        const playerName = document.getElementById('dash-player-name');
        const levelEl = document.getElementById('dash-level');
        const xpText = document.getElementById('dash-xp-text');
        const xpFill = document.getElementById('dash-xp-fill');
        const streakEl = document.getElementById('arena-streak');
        const totalXpEl = document.getElementById('arena-xp-total');

        if (playerName) playerName.textContent = this.state.player || 'Player';
        if (levelEl) levelEl.textContent = String(this.state.level || 1);
        if (xpText) xpText.textContent = `${this.state.xp || 0} / ${this.state.xpToNext || 200} XP`;
        if (xpFill) xpFill.style.width = `${Math.min(100, ((this.state.xp || 0) / (this.state.xpToNext || 200)) * 100)}%`;
        if (streakEl) streakEl.textContent = String(this.state.streak || 0);
        if (totalXpEl) totalXpEl.textContent = String(this.state.xp || 0);

        this.renderModuleCards();
        this.renderBadges();
    },

    renderModuleCards() {
        const grid = document.getElementById('strategy-grid');
        if (!grid) return;

        const level2Unlocked = this.level2Unlocked();
        grid.innerHTML = '';

        MODULES.forEach(module => {
            const locked = module.level === 2 && !level2Unlocked;
            const card = document.createElement('article');
            card.className = `strategy-card glass-panel ${locked ? 'difficulty-locked' : ''}`;
            card.innerHTML = `
                <div class="module-card-head">
                    <div>
                        <h4>${this.escapeHtml(module.name)}</h4>
                        <div class="module-tagline">${this.escapeHtml(module.tagline)}</div>
                    </div>
                    <div class="difficulty-badge difficulty-${module.level}">Lvl ${module.level}</div>
                </div>
                <p>${this.escapeHtml(module.description)}</p>
                <div class="module-tabs">
                    <button class="btn btn-secondary" data-module-learn="${module.id}">${module.learn}</button>
                    <button class="btn btn-primary" data-module-practice="${module.id}" ${locked ? 'disabled' : ''}>${module.practice}</button>
                </div>
                <div class="module-card-footer">
                    <span>${locked ? 'Locked until all Level 1 badges are earned.' : 'Ready to play.'}</span>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    renderBadges() {
        const container = document.getElementById('badges-container');
        if (!container) return;

        const badges = this.collectBadges();
        container.innerHTML = '';

        if (badges.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">No badges yet. Start a module.</p>';
            return;
        }

        badges.forEach(badge => {
            const row = document.createElement('div');
            row.className = 'badge-item';
            row.innerHTML = `
                <span class="badge-icon">🏆</span>
                <div>
                    <div style="font-weight:700;">${this.escapeHtml(badge.name)}</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);">${this.escapeHtml(badge.desc)}</div>
                </div>
            `;
            container.appendChild(row);
        });
    },

    collectBadges() {
        const learned = this.state.learnedModules || {};
        const badgeMap = new Map();

        (Array.isArray(this.state.badges) ? this.state.badges : []).forEach(badge => {
            if (badge && badge.id) badgeMap.set(badge.id, badge);
        });

        MODULES.filter(module => module.level === 1).forEach(module => {
            if (learned[module.id] || (this.state.moduleWins[module.id] || 0) > 0) {
                badgeMap.set(`badge-${module.id}`, {
                    id: `badge-${module.id}`,
                    name: `${module.name} Badge`,
                    desc: 'Completed the strategy at least once.'
                });
            }
        });

        return Array.from(badgeMap.values());
    },

    level2Unlocked() {
        const level1Modules = MODULES.filter(module => module.level === 1).map(module => module.id);
        return level1Modules.every(id => (this.state.moduleWins[id] || 0) > 0 || this.state.learnedModules[id]);
    },

    async startModule(moduleId, mode) {
        const module = MODULES.find(item => item.id === moduleId);
        if (!module) return;

        if (module.level === 2 && !this.level2Unlocked()) {
            this.toast('Unlock all Level 1 badges first.');
            return;
        }

        this.state.lastModuleId = moduleId;
        this.state.lastMode = mode;
        this.saveLocalState();
        this.switchView('arena');

        const title = document.getElementById('arena-strategy-title');
        if (title) title.textContent = module.name;

        if (mode === 'practice' && typeof window.initPractice === 'function') {
            await window.initPractice(moduleId);
        } else if (mode === 'learn' && typeof window.initLearn === 'function') {
            await window.initLearn(moduleId);
        }
    },

    showHowToPlay() {
        const overlay = document.getElementById('how-to-play-overlay');
        if (overlay) overlay.classList.remove('hidden');
    },

    hideHowToPlay(remember = false) {
        const overlay = document.getElementById('how-to-play-overlay');
        if (overlay) overlay.classList.add('hidden');
        if (remember) {
            try {
                localStorage.setItem('mindmath_hide_howto', '1');
            } catch (error) {
                // Ignore storage failures.
            }
        }
    },

    toast(message) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast-item glass-panel';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 1800);
    },

    escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
window.MindMathArenaApp = App;
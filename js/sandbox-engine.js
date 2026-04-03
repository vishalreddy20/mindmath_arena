class SandboxEngine {
    constructor(containerSelector) {
        this.containerSelector = containerSelector;
        this.svg = null;
        this.container = null;
        this.floatingNodes = [];
        this.width = document.querySelector(containerSelector).clientWidth;
        this.height = document.querySelector(containerSelector).clientHeight;
        
        this.strategyController = null;
        this.i = 100; // ID generator start
        this.isPracticeMode = true; // Always true for sandbox
        this.practicePathSteps = [];
        this._practiceNudgeTimer = null;
        this._practiceNudgeShown = false;
        
        this.updateHintCallback = null;
        this.simulation = null;
        this.links = []; // Hierarchy tracking
        this.maxFloatingNodes = 50;
        this._completedCurrentProblem = false;
        this.diagonal = d3.linkVertical().x(d => d.x).y(d => d.y);
    }

    // ===== Validation Helpers (Edge Cases) =====
    
    /**
     * Sanitize and validate a single numeric input
     * Returns { valid: bool, value: number|null, error: string|null }
     */
    validateSingleNumber(input, context = '') {
        if (input === null || input === undefined || input === '') {
            return { valid: false, value: null, error: 'Number required' };
        }

        const trimmed = String(input).trim();
        if (trimmed === '' || trimmed === '-' || trimmed === '.') {
            return { valid: false, value: null, error: 'Invalid number format' };
        }

        const num = parseFloat(trimmed);

        if (Number.isNaN(num)) {
            return { valid: false, value: null, error: 'Not a valid number' };
        }

        if (!Number.isFinite(num)) {
            return { valid: false, value: null, error: 'Infinity/extreme values not allowed' };
        }

        // Merge answers can exceed split-part limits (e.g., 20 + 6 at level 1)
        let limit;
        if (context === 'merge answer') {
            limit = { min: -10000000, max: 10000000 };
        } else {
            // Age-appropriate limits by level for regular split inputs
            const level = this.getCurrentLevel();
            const limits = {
                1: { min: 0, max: 20 },
                2: { min: 0, max: 100 },
                3: { min: -50, max: 500 },
                4: { min: -500, max: 5000 },
                5: { min: -5000, max: 50000 },
                6: { min: -50000, max: 999999 }
            };
            limit = limits[level] || limits[6];
        }

        if (num < limit.min || num > limit.max) {
            return { 
                valid: false, 
                value: null, 
                error: context === 'merge answer'
                    ? `Answer must be between ${limit.min} and ${limit.max}`
                    : `Keep numbers between ${limit.min} and ${limit.max} for Level ${this.getCurrentLevel()}`
            };
        }

        return { valid: true, value: num, error: null };
    }

    /**
     * Validate array of numbers (for split inputs)
     * Returns { valid: bool, values: number[]|null, error: string|null }
     */
    validateNumberArray(inputArray) {
        if (!Array.isArray(inputArray) || inputArray.length === 0) {
            return { valid: false, values: null, error: 'At least one number required' };
        }

        if (inputArray.length > 10) {
            return { valid: false, values: null, error: 'Split into max 10 parts' };
        }

        const validatedValues = [];
        for (let i = 0; i < inputArray.length; i++) {
            const validation = this.validateSingleNumber(inputArray[i]);
            if (!validation.valid) {
                return { 
                    valid: false, 
                    values: null, 
                    error: `Part ${i + 1}: ${validation.error}` 
                };
            }
            validatedValues.push(validation.value);
        }

        return { valid: true, values: validatedValues, error: null };
    }

    /**
     * Check if result is mathematically valid and within bounds
     */
    validateResult(computed, expected, op, inputCount = 0) {
        if (!Number.isFinite(computed)) {
            return { 
                valid: false, 
                error: `${op} produced infinity or invalid result` 
            };
        }

        const epsilon = 1e-9;
        const matches = Math.abs(computed - expected) < epsilon;

        if (!matches) {
            return { 
                valid: false, 
                error: `Equals ${computed}, need ${expected}` 
            };
        }

        return { valid: true, error: null, isRounded: false };
    }

    /**
     * Validate operator choice safety
     */
    validateOperatorChoice(op, values, targetVal) {
        const normalizedOp = this.normalizeOperator(op);
        const validOps = ['+', '-', '×', '÷'];
        if (!validOps.includes(normalizedOp)) {
            return { valid: false, error: 'Invalid operator' };
        }

        // Pre-check for division by zero
        if (normalizedOp === '÷' && values.slice(1).some(v => v === 0)) {
            return { valid: false, error: 'Cannot divide by zero' };
        }

        // Pre-check for extreme multiplication
        if (normalizedOp === '×' && values.length >= 2) {
            const product = values.reduce((a, b) => a * b, 1);
            if (!Number.isFinite(product)) {
                return { valid: false, error: 'Multiplication result too large' };
            }
        }

        return { valid: true, error: null };
    }

    normalizeOperator(op) {
        return op === '−' ? '-' : op;
    }

    getInputBoundsForLevel() {
        const level = this.getCurrentLevel();
        const limits = {
            1: { min: 0, max: 20, step: '1' },
            2: { min: 0, max: 100, step: '1' },
            3: { min: -50, max: 500, step: '0.01' },
            4: { min: -500, max: 5000, step: '0.01' },
            5: { min: -5000, max: 50000, step: '0.01' },
            6: { min: -50000, max: 999999, step: '0.01' }
        };

        return limits[level] || limits[6];
    }

    setStrategyController(ctrl) {
        this.strategyController = ctrl;
        this.practicePathSteps = [];
        this._practiceNudgeShown = false;
        this._completedCurrentProblem = false;
        this.initNudgeSystem();
        this.refreshHints();
    }
    
    initNudgeSystem() {
        if (this._nudgeInterval) clearInterval(this._nudgeInterval);
        this._lastInteraction = Date.now();
        this._nudgeInterval = setInterval(() => {
            const idleTime = Date.now() - this._lastInteraction;
            if (idleTime > 6000 && !this._practiceNudgeShown && this.floatingNodes.length >= 2) {
                this.showGhostHandNudge();
            }
        }, 1000);
    }

    resetNudgeTimer() {
        this._lastInteraction = Date.now();
        this.hideGhostHand();
    }

    showGhostHandNudge() {
        if (this.floatingNodes.length < 2) return;
        this._practiceNudgeShown = true;
        
        const n1 = this.floatingNodes[0];
        const n2 = this.floatingNodes[1];
        
        const overlay = document.getElementById('onboarding-overlay');
        const hand = document.getElementById('ghost-hand');
        if (!overlay || !hand) return;

        overlay.classList.remove('hidden');
        
        // Calculate relative positions for CSS variables
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        
        hand.style.left = `${n1.x}px`;
        hand.style.top = `${n1.y}px`;
        hand.style.setProperty('--target-x', `${dx}px`);
        hand.style.setProperty('--target-y', `${dy}px`);
        hand.classList.add('ghost-hand-active');

        this.refreshHints("Look! I bet those two would love to be friends. Try dragging one onto the other!");
    }

    hideGhostHand() {
        const overlay = document.getElementById('onboarding-overlay');
        const hand = document.getElementById('ghost-hand');
        if (overlay) overlay.classList.add('hidden');
        if (hand) hand.classList.remove('ghost-hand-active');
    }

    setHintCallback(cb) {
        this.updateHintCallback = cb;
    }
    
    refreshHints(customMsg = null) {
        if (!this.updateHintCallback) {
            // Fallback to manual UI update if callback not set
            const box = document.getElementById('arena-hint-box');
            const text = document.getElementById('arena-hint-text');
            if (box && text) {
                box.classList.remove('hidden');
                text.textContent = customMsg || 'Pick an operator first, then split or drag bubbles to combine.';
            }
            return;
        }
        this.updateHintCallback(customMsg || 'Pick an operator first, then split or drag bubbles to combine.');
    }

    render(data) {
        const el = document.querySelector(this.containerSelector);
        if (el) {
            this.width = el.clientWidth || this.width;
            this.height = el.clientHeight || this.height;
        }
        d3.select(this.containerSelector).selectAll("*").remove();

        this.svg = d3.select(this.containerSelector)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .call(d3.zoom().on("zoom", (event) => {
                this.container.attr("transform", event.transform);
            }))
            .on("dblclick.zoom", null);
            
        this.container = this.svg.append("g");

        // Parse initial data to get starting hierarchy
        this.floatingNodes = [];
        this.links = [];
        
        const root = d3.hierarchy(data, d => d.children);
        const treeLayout = d3.tree().nodeSize([200, 150]);
        treeLayout(root);

        // Convert hierarchy to flat node list and link list for physics
        const nodes = root.descendants();
        const minX = d3.min(nodes, d => d.x);
        const maxX = d3.max(nodes, d => d.x);
        const centerX = (this.width / 2) - ((maxX + minX) / 2);

        nodes.forEach(d => {
            const node = {
                id: d.data.id || ++this.i,
                label: d.data.label,
                val: d.data.val,
                type: d.data.type || 'operand',
                draggable: true,
                x: d.x + centerX,
                y: (d.depth * 150) + 100
            };

            // If it's not a leaf, make it a parent-anchor (ghost)
            if (d.children && d.children.length > 0) {
                node.type = 'parent-anchor';
                node.draggable = false;
                node.fx = node.x;
                node.fy = node.y;
            }

            this.floatingNodes.push(node);
            d.physicsNode = node; // Link back for link creation
        });

        root.links().forEach(link => {
            this.links.push({
                source: link.source.physicsNode,
                target: link.target.physicsNode,
                operator: link.target.data.op || '+'
            });
        });

        this.simulation = d3.forceSimulation(this.floatingNodes)
            .force("link", d3.forceLink(this.links).id(d => d.id).distance(150).strength(0.5))
            .force("charge", d3.forceManyBody().strength(-1000))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2))
            .force("collision", d3.forceCollide().radius(60))
            .on("tick", () => this.ticked());

        this.updateNodes();
        if (!this._startTime) {
            this._startTime = Date.now();
        }
    }

    ticked() {
        // Update Link Paths
        this.container.selectAll("path.sandbox-link")
            .attr("d", this.diagonal);

        // Update Operator Labels
        this.container.selectAll("g.sandbox-link-label")
            .attr("transform", d => {
                const mx = (d.source.x + d.target.x) / 2;
                const my = (d.source.y + d.target.y) / 2;
                return `translate(${mx}, ${my})`;
            });

        // Update Nodes
        this.container.selectAll("g.sandbox-node")
            .attr("transform", d => `translate(${d.x}, ${d.y})`);
    }

    updateNodes() {
        // --- Links Layer ---
        const linksData = this.links;
        const link = this.container.selectAll("path.sandbox-link")
            .data(linksData, d => `${d.source.id}-${d.target.id}`);

        link.enter().insert("path", "g.sandbox-node")
            .attr("class", "link sandbox-link")
            .attr("d", this.diagonal);

        link.exit().remove();

        // --- Link Labels ---
        const labelsData = this.links.filter(l => l.operator);
        const label = this.container.selectAll("g.sandbox-link-label")
            .data(labelsData, d => `${d.source.id}-${d.target.id}`);

        const labelEnter = label.enter().insert("g", "g.sandbox-node")
            .attr("class", "link-label sandbox-link-label");

        labelEnter.append("circle").attr("r", 15);
        labelEnter.append("text").attr("dy", ".35em").attr("text-anchor", "middle");

        const labelUpdate = labelEnter.merge(label);
        labelUpdate.select("text").text(d => d.operator);

        label.exit().remove();

        // --- Nodes Layer ---
        const nodeGroup = this.container.selectAll("g.sandbox-node")
            .data(this.floatingNodes, d => d.id);

        const nodeEnter = nodeGroup.enter().append("g")
            .attr("class", d => `node sandbox-node ${d.type}`)
            .attr("id", d => `node-${d.id}`);

        nodeEnter.append("circle")
            .attr("r", 40)
            .style("stroke-width", "4px");

        nodeEnter.append("text")
            .attr("dy", ".35em")
            .attr("x", 0)
            .text(d => d.label)
            .style("fill-opacity", 1);

        // Attach physics drag (slightly different from tree drag)
        nodeEnter.call(this.initPhysicsDrag());

        // Attach click listener for freeform splitting
        const engineRef = this;
        nodeEnter.on("click", function(event, d) {
            if (event.defaultPrevented) return;
            if (!d.draggable || d.val === undefined || Number.isNaN(Number(d.val))) return;
            engineRef.showSplitModal(d);
        });

        // Update phase
        const nodeUpdate = nodeEnter.merge(nodeGroup);
        
        nodeUpdate.select("circle")
            .style("stroke-width", d => d._isTarget ? "6px" : "4px")
            .style("stroke", d => d._isTarget ? "var(--accent-purple)" : "");
            
        nodeUpdate.classed("drag-target", d => d._isTarget);

        nodeUpdate.select("text").text(d => d.label);

        // Remove phase
        nodeGroup.exit()
            .transition().duration(300)
            .attr("transform", "scale(0)")
            .remove();

        this.simulation.nodes(this.floatingNodes);
        this.simulation.force("link").links(this.links);
        this.simulation.alpha(1).restart();
        
        this.checkWinCondition();
    }

    initPhysicsDrag() {
        const engine = this;
        const findClosestValidTarget = (sourceNode, x, y, hitRadius = 110) => {
            let closest = null;
            let minDist = Infinity;

            engine.floatingNodes.forEach(n => {
                if (n.id === sourceNode.id) return;
                if (!n.draggable || n.val === undefined || Number.isNaN(Number(n.val))) return;

                const dx = n.x - x;
                const dy = n.y - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < hitRadius && dist < minDist) {
                    minDist = dist;
                    closest = n;
                }
            });

            return closest;
        };

        return d3.drag()
            .filter((event, d) => !!d.draggable && d.val !== undefined)
            .on("start", function(event, d) {
                if (window.AudioSys) window.AudioSys.play('drag');
                if (!event.active) engine.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
                d3.select(this).raise();
            })
            .on("drag", function(event, d) {
                d.fx = event.x;
                d.fy = event.y;

                // Collision detection for target highlighting
                const closest = findClosestValidTarget(d, d.fx, d.fy, 110);
                
                engine.floatingNodes.forEach(n => {
                    n._isTarget = false;
                });
                
                if (closest) closest._isTarget = true;
                
                engine.container.selectAll("g.sandbox-node").selectAll("circle")
                    .classed("magnetic-glow", n => n._isTarget);
                
                if (closest) {
                    engine.resetNudgeTimer(); // Interacting resets the nudge
                }
            })
            .on("end", function(event, d) {
                if (!event.active) engine.simulation.alphaTarget(0);

                const dropX = event.x ?? d.x;
                const dropY = event.y ?? d.y;
                let targetNode = findClosestValidTarget(d, dropX, dropY, 120);

                d.fx = null;
                d.fy = null;

                engine.floatingNodes.forEach(n => {
                    if (n._isTarget) {
                        if (!targetNode) targetNode = n;
                        n._isTarget = false;
                    }
                });
                
                if (targetNode) {
                    if (targetNode.val !== undefined && d.val !== undefined) {
                        engine.showMathModal(d, targetNode);
                    }
                }
                
                engine.container.selectAll("g.sandbox-node").select("circle")
                    .style("stroke-width", "4px")
                    .style("stroke", "");
            });
    }

    showSplitModal(node) {
        const overlay = document.getElementById('manual-split-overlay');
        const targetLabel = document.getElementById('manual-split-target');
        const targetEqLabel = document.getElementById('manual-split-target-eq');
        const partsCountInput = document.getElementById('manual-split-parts');
        const partsContainer = document.getElementById('manual-split-parts-container');
        const opValue = document.getElementById('manual-split-op-value');
        const opButtons = overlay.querySelectorAll('.split-op-btn');
        const feedback = document.getElementById('manual-split-feedback');

        const resultFeedback = document.getElementById('manual-split-result-feedback');
        const expressionDisplay = document.getElementById('manual-split-expression');
        const alternativesContainer = document.getElementById('manual-split-alternatives');

        const computeWithOp = (values, op) => {
            let computed = values[0];
            for (let idx = 1; idx < values.length; idx++) {
                const next = values[idx];
                switch (op) {
                    case '+': computed += next; break;
                    case '-': computed -= next; break;
                    case '×': computed *= next; break;
                    case '÷':
                        if (next === 0) return null;
                        computed /= next;
                        break;
                }
            }
            return Number.isFinite(computed) ? computed : null;
        };

        const getAlternativeSplits = (targetVal, op, partsCount) => {
            const candidates = [];

            if (op === '+') {
                if (partsCount === 2) {
                    candidates.push([targetVal - 1, 1]);
                    const half = Math.floor(targetVal / 2);
                    candidates.push([half, targetVal - half]);
                    const tens = Math.floor(targetVal / 10) * 10;
                    candidates.push([tens, targetVal - tens]);
                } else {
                    const base = Math.floor(targetVal / partsCount);
                    const remainder = targetVal - (base * partsCount);
                    const dist = Array.from({ length: partsCount }, (_, i) => i < Math.abs(remainder)
                        ? base + (remainder >= 0 ? 1 : -1)
                        : base);
                    candidates.push(dist);
                    const withOnes = [targetVal - (partsCount - 1), ...Array(partsCount - 1).fill(1)];
                    candidates.push(withOnes);
                }
            } else if (op === '-') {
                if (partsCount === 2) {
                    candidates.push([targetVal + 1, 1]);
                    candidates.push([targetVal + 2, 2]);
                    candidates.push([targetVal + 10, 10]);
                } else {
                    candidates.push([targetVal + (partsCount - 1), ...Array(partsCount - 1).fill(1)]);
                }
            } else if (op === '×') {
                if (partsCount === 2 && Number.isInteger(targetVal)) {
                    for (let i = 2; i <= Math.abs(targetVal); i++) {
                        if (i > 20) break;
                        if (targetVal % i === 0) {
                            candidates.push([i, targetVal / i]);
                        }
                    }
                }
                candidates.push([targetVal, ...Array(partsCount - 1).fill(1)]);
            } else if (op === '÷') {
                if (partsCount === 2) {
                    candidates.push([targetVal * 2, 2]);
                    candidates.push([targetVal * 3, 3]);
                    candidates.push([targetVal * 5, 5]);
                } else {
                    candidates.push([targetVal * Math.pow(2, partsCount - 1), ...Array(partsCount - 1).fill(2)]);
                }
            }

            const seen = new Set();
            return candidates
                .filter(arr => Array.isArray(arr) && arr.length === partsCount)
                .filter(arr => arr.every(v => Number.isFinite(v)))
                .filter(arr => {
                    const key = arr.join('|');
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                })
                .filter(arr => {
                    const computed = computeWithOp(arr, op);
                    if (computed === null) return false;
                    if (Math.abs(computed - targetVal) > 1e-9) return false;
                    const splitValidation = this.validateSplitForLevel(op, arr, targetVal);
                    return !!splitValidation.valid;
                })
                .slice(0, 4);
        };

        const renderAlternativeSuggestions = () => {
            if (!alternativesContainer) return;
            alternativesContainer.innerHTML = '';
            const op = this.normalizeOperator(opValue.value);
            const partsCount = parseInt(partsCountInput.value, 10) || 2;
            const targetVal = Number(node.val);
            const alternatives = getAlternativeSplits(targetVal, op, partsCount);

            if (alternatives.length === 0) {
                const empty = document.createElement('span');
                empty.textContent = 'No quick alternatives at this level.';
                empty.style.color = 'var(--text-muted)';
                empty.style.fontSize = '0.8rem';
                alternativesContainer.appendChild(empty);
                return;
            }

            alternatives.forEach((alt, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-secondary';
                btn.style.padding = '0.3rem 0.55rem';
                btn.style.fontSize = '0.82rem';
                btn.textContent = `Option ${idx + 1}: ${alt.join(` ${op} `)}`;
                btn.onclick = () => {
                    const inputs = partsContainer.querySelectorAll('.split-part-input');
                    alt.forEach((value, i) => {
                        if (inputs[i]) inputs[i].value = String(value);
                    });
                    feedback.textContent = 'Alternative loaded. You can edit any number.';
                    updateLivePreview();
                };
                alternativesContainer.appendChild(btn);
            });
        };

        const updateLivePreview = () => {
            const rawParts = Array.from(partsContainer.querySelectorAll('.split-part-input'));
            const values = rawParts.map((input) => {
                const val = parseFloat(input.value);
                return Number.isNaN(val) ? null : val;
            });
            const op = this.normalizeOperator(opValue.value);
            const targetVal = node.val;

            // Validate input range on-the-fly
            let invalidPart = null;
            for (let i = 0; i < rawParts.length; i++) {
                const input = rawParts[i];
                if (input.value !== '') {
                    const valCheck = this.validateSingleNumber(input.value);
                    if (!valCheck.valid) {
                        invalidPart = i;
                        input.style.borderColor = 'var(--accent-coral)';
                    } else {
                        input.style.borderColor = '';
                    }
                }
            }

            // Build expression string dynamically
            let expressionStr = '';
            if (values.length > 0) {
                expressionStr = values.map((v, idx) => {
                    if (v === null) return '?';
                    return v.toString();
                }).join(` ${op} `);
            } else {
                expressionStr = '? ' + op + ' ?';
            }

            if (values.some(v => v === null)) {
                expressionStr += ' = ?';
                expressionDisplay.textContent = expressionStr;
                expressionDisplay.style.color = 'var(--text-muted)';
                resultFeedback.textContent = invalidPart !== null ? 'Check Part ' + (invalidPart + 1) : 'Fill in the numbers';
                resultFeedback.style.color = 'var(--text-muted)';
                return;
            }

            // Check for non-finite values
            if (values.some(v => !Number.isFinite(v))) {
                expressionDisplay.textContent = expressionStr + ' = ✗';
                expressionDisplay.style.color = 'var(--accent-coral)';
                resultFeedback.textContent = 'Numbers too extreme';
                resultFeedback.style.color = 'var(--accent-coral)';
                return;
            }

            let computed = values[0];
            for (let idx = 1; idx < values.length; idx++) {
                const next = values[idx];
                switch(op) {
                    case '+': computed += next; break;
                    case '-': computed -= next; break;
                    case '×': computed *= next; break;
                    case '÷': 
                        if (next === 0) {
                            expressionDisplay.textContent = expressionStr + ' = ✗';
                            expressionDisplay.style.color = 'var(--accent-coral)';
                            resultFeedback.textContent = 'Cannot divide by zero';
                            resultFeedback.style.color = 'var(--accent-coral)';
                            return;
                        }
                        computed /= next; 
                        break;
                }
            }

            // Check if result is finite
            if (!Number.isFinite(computed)) {
                expressionDisplay.textContent = expressionStr + ' = ✗';
                expressionDisplay.style.color = 'var(--accent-coral)';
                resultFeedback.textContent = 'Result too extreme';
                resultFeedback.style.color = 'var(--accent-coral)';
                return;
            }

            const epsilon = 1e-9;
            const isCorrect = Math.abs(computed - targetVal) < epsilon;
            
            expressionStr += ` = ${computed}`;
            expressionDisplay.textContent = expressionStr;
            expressionDisplay.style.color = isCorrect ? 'var(--accent-emerald)' : 'var(--accent-coral)';
            resultFeedback.textContent = isCorrect ? '✓ Perfect!' : `Need ${targetVal}`;
            resultFeedback.style.color = isCorrect ? 'var(--accent-emerald)' : 'var(--accent-coral)';
        };

        const renderPartInputs = (count) => {
            partsContainer.innerHTML = '';
            const bounds = this.getInputBoundsForLevel();
            for (let idx = 0; idx < count; idx++) {
                const input = document.createElement('input');
                input.type = 'number';
                input.autocomplete = 'off';
                input.className = 'split-part-input';
                input.dataset.index = String(idx);
                input.style.fontSize = '1.5rem';
                input.style.width = '80px';
                input.style.padding = '5px';
                input.style.textAlign = 'center';
                input.style.borderRadius = '5px';
                input.style.background = 'var(--bg-color)';
                input.style.color = 'white';
                input.placeholder = '0';
                input.min = String(bounds.min);
                input.max = String(bounds.max);
                input.step = bounds.step;
                input.oninput = updateLivePreview;
                
                // Sanitization: prevent extreme values and sanitize input
                input.onchange = (e) => {
                    if (e.target.value !== '') {
                        const val = parseFloat(e.target.value);
                        if (!Number.isFinite(val)) {
                            e.target.value = '';
                        } else {
                            // Round to reasonable precision
                            e.target.value = Number.isInteger(val) ? val.toString() : val.toFixed(4);
                        }
                    }
                    updateLivePreview();
                };
                
                partsContainer.appendChild(input);

                if (idx < count - 1) {
                    const op = document.createElement('span');
                    op.className = 'split-inline-op';
                    op.textContent = opValue.value;
                    partsContainer.appendChild(op);
                }
            }
        };

        const syncInlineOperators = () => {
            partsContainer.querySelectorAll('.split-inline-op').forEach((opEl) => {
                opEl.textContent = opValue.value;
            });
            renderAlternativeSuggestions();
            updateLivePreview();
        };
        
        targetLabel.textContent = node.label;
        if (targetEqLabel) targetEqLabel.textContent = node.label;
        partsCountInput.value = '2';
        opValue.value = '+';
        feedback.textContent = '';
        expressionDisplay.textContent = '? + ? = ?';
        expressionDisplay.style.color = 'var(--text-muted)';
        resultFeedback.textContent = '';
        renderPartInputs(parseInt(partsCountInput.value, 10));
        renderAlternativeSuggestions();
        opButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.op === '+');
            btn.onclick = () => {
                opValue.value = btn.dataset.op;
                opButtons.forEach(x => x.classList.remove('active'));
                btn.classList.add('active');
                syncInlineOperators();
            };
        });
        partsCountInput.onchange = () => {
            const count = Math.max(2, Math.min(6, parseInt(partsCountInput.value, 10) || 2));
            partsCountInput.value = String(count);
            renderPartInputs(count);
            renderAlternativeSuggestions();
            updateLivePreview();
            const firstInput = partsContainer.querySelector('input');
            if (firstInput) firstInput.focus();
        };
        overlay.classList.remove('hidden');
        const firstInput = partsContainer.querySelector('input');
        if (firstInput) firstInput.focus();
        
        const cleanup = () => {
            overlay.classList.add('hidden');
            document.getElementById('btn-manual-split-submit').onclick = null;
            document.getElementById('btn-manual-split-cancel').onclick = null;
            partsCountInput.onchange = null;
            if (alternativesContainer) alternativesContainer.innerHTML = '';
            partsContainer.querySelectorAll('.split-part-input').forEach(input => {
                input.oninput = null;
            });
        };

        document.getElementById('btn-manual-split-cancel').onclick = cleanup;

        const checkAnswer = () => {
            const rawParts = Array.from(partsContainer.querySelectorAll('.split-part-input'));
            
            // Step 1: Validate each input exists and is numeric
            const sanitizeValidation = this.validateNumberArray(
                rawParts.map(inp => inp.value)
            );
            if (!sanitizeValidation.valid) {
                feedback.textContent = sanitizeValidation.error;
                if (window.AudioSys) window.AudioSys.play('error');
                return;
            }

            const values = sanitizeValidation.values;
            const op = this.normalizeOperator(opValue.value);
            const targetVal = node.val;
            const epsilon = 1e-9;
            
            // Step 2: Check operator validity pre-computation
            const opCheck = this.validateOperatorChoice(op, values, targetVal);
            if (!opCheck.valid) {
                feedback.textContent = opCheck.error;
                if (window.AudioSys) window.AudioSys.play('error');
                return;
            }

            // Step 3: Compute result and check boundaries
            let computed = values[0];
            for (let idx = 1; idx < values.length; idx++) {
                const next = values[idx];
                switch(op) {
                    case '+': computed += next; break;
                    case '-': computed -= next; break;
                    case '×': computed *= next; break;
                    case '÷': computed /= next; break;
                }
            }

            // Step 4: Validate result sanity
            const resultCheck = this.validateResult(computed, targetVal, op, values.length);
            if (!resultCheck.valid) {
                feedback.textContent = resultCheck.error;
                if (window.AudioSys) window.AudioSys.play('error');
                return;
            }

            // Step 5: Check pedagogical constraints by level
            const splitValidation = this.validateSplitForLevel(op, values, targetVal);
            if (!splitValidation.valid) {
                feedback.textContent = splitValidation.message;
                if (window.AudioSys) window.AudioSys.play('error');
                return;
            }

            // All validation passed!
            if (Math.abs(computed - targetVal) < epsilon) {
                 this.applySplit(node, values, op);
                 cleanup();
            } else {
                 if (window.AudioSys) window.AudioSys.play('error');
                 feedback.textContent = "That math doesn't equal " + targetVal + "!";
                 
                 // Apply educational "Boing" animation to the node
                 const nodeEl = document.getElementById(`node-${node.id}`);
                 if (nodeEl) {
                     nodeEl.classList.add('boing-reset');
                     setTimeout(() => nodeEl.classList.remove('boing-reset'), 600);
                 }

                 const firstPart = partsContainer.querySelector('.split-part-input');
                 if (firstPart) firstPart.focus();
            }
        };

        document.getElementById('btn-manual-split-submit').onclick = checkAnswer;

        partsContainer.onkeydown = (e) => {
            if (e.key === 'Enter') checkAnswer();
        };
    }

    getCurrentLevel() {
        const fromProblemData = this.strategyController && this.strategyController.problemData
            ? this.strategyController.problemData.level
            : undefined;
        const fromShortProp = this.strategyController && this.strategyController.p
            ? this.strategyController.p.level
            : undefined;
        const level = parseInt(fromProblemData ?? fromShortProp ?? 1, 10);
        return Number.isNaN(level) ? 1 : level;
    }

    validateSplitForLevel(op, values, targetVal) {
        const level = this.getCurrentLevel();
        
        // Basic sanity checks first
        if (values.length < 2 || values.length > 6) {
            return { valid: false, message: 'Use 2-6 parts for splits.' };
        }

        // Check for NaN, Infinity, or non-finite values
        if (values.some(v => !Number.isFinite(v))) {
            return { valid: false, message: 'All parts must be valid numbers.' };
        }

        // Check for negative numbers at early levels (except subtraction result)
        if (level <= 2) {
            if (values.some(v => v < 0)) {
                return { valid: false, message: 'Use non-negative numbers for splits at this level.' };
            }
        }

        if (level >= 3) {
            return { valid: true };
        }

        const isInt = (n) => Number.isInteger(n);
        const allInts = values.every(isInt);

        if (op === '-') {
            if (!allInts) {
                return { valid: false, message: 'Use whole numbers for subtraction splits at this level.' };
            }
            if (level <= 1 && values.length !== 2) {
                return { valid: false, message: 'Level 1 subtraction split uses exactly 2 parts.' };
            }

            let running = values[0];
            for (let idx = 1; idx < values.length; idx++) {
                const next = values[idx];
                if (next < 0) {
                    return { valid: false, message: 'Use non-negative numbers in subtraction splits.' };
                }
                running -= next;
                if (running < 0) {
                    return { valid: false, message: 'Keep subtraction steps non-negative at this level.' };
                }
            }
        }

        if (op === '÷') {
            if (!allInts) {
                return { valid: false, message: 'Use whole numbers for division splits at this level.' };
            }
            if (values.slice(1).some(v => v === 0)) {
                return { valid: false, message: 'Division by zero is not allowed.' };
            }
            if (level <= 1 && values.length !== 2) {
                return { valid: false, message: 'Level 1 division split uses exactly 2 parts.' };
            }

            let running = values[0];
            for (let idx = 1; idx < values.length; idx++) {
                const divisor = values[idx];
                if (divisor === 0) {
                    return { valid: false, message: 'Cannot divide by zero.' };
                }
                const quotient = running / divisor;
                if (!Number.isFinite(quotient) || !Number.isInteger(quotient)) {
                    return { valid: false, message: 'Use exact division steps (no fractions) at this level.' };
                }
                running = quotient;
            }
        }

        if (op === '×' && level <= 1) {
            if (!allInts) {
                return { valid: false, message: 'Use whole numbers for multiplication splits at this level.' };
            }
            
            // Check each multiplier isn't too extreme
            if (values.some(v => v <= 0)) {
                return { valid: false, message: 'Use positive numbers for multiplication splits.' };
            }
            
            if (values.some(v => Math.abs(v) > Math.max(100, Math.abs(targetVal) * 2))) {
                return { valid: false, message: 'Choose friendlier multiplication parts for this level.' };
            }

            // Check product isn't overflow
            const product = values.reduce((a, b) => a * b, 1);
            if (!Number.isFinite(product) || product > 1000000) {
                return { valid: false, message: 'Multiplication result would be too large.' };
            }
        }

        if (op === '+' && level <= 1) {
            if (!allInts) {
                return { valid: false, message: 'Use whole numbers for addition splits at this level.' };
            }
        }

        return { valid: true };
    }

    applySplit(sourceNode, parts, op) {
        // Prevent graph explosion - split keeps parent and adds N children
        const projectedCount = this.floatingNodes.length + parts.length;
        if (projectedCount > this.maxFloatingNodes) {
            if (window.AudioSys) window.AudioSys.play('error');
            this.refreshHints(`Arena full at ${this.maxFloatingNodes} bubbles. Merge some first.`);
            return;
        }

        // Record AST
        this.practicePathSteps.push({
            type: 'split',
            target: sourceNode.val,
            parts: parts.slice(),
            left: parts[0],
            op,
            right: parts.slice(1).join(` ${op} `)
        });

        const partsCount = parts.length;
        const spacing = 80;
        const startX = sourceNode.x - ((partsCount - 1) * spacing) / 2;

        // Keep source visible as a parent anchor in the tree.
        sourceNode.type = 'parent-anchor';
        sourceNode.draggable = false;
        sourceNode.val = undefined;
        sourceNode.fx = sourceNode.x;
        sourceNode.fy = sourceNode.y;

        parts.forEach((partVal, idx) => {
            const childNode = {
                id: ++this.i,
                label: partVal.toString(),
                type: 'operand',
                draggable: true,
                val: partVal,
                x: startX + idx * spacing,
                y: sourceNode.y + 88
            };

            this.floatingNodes.push(childNode);
            this.links.push({
                source: sourceNode,
                target: childNode,
                operator: idx === 0 ? null : op
            });
        });
        
        if (window.AudioSys) window.AudioSys.play('merge');
        this.updateNodes();
    }

    showMathModal(sourceNode, targetNode) {
        const overlay = document.getElementById('manual-math-overlay');
        const sourceLabel = document.getElementById('manual-math-source');
        const targetLabel = document.getElementById('manual-math-target');
        const ansInput = document.getElementById('manual-math-ans');
        const feedback = document.getElementById('manual-math-feedback');
        const opSelect = document.getElementById('manual-math-op');
        const expressionDisplay = document.getElementById('manual-math-expression');
        const bounds = this.getInputBoundsForLevel();
        
        const updateMergePreview = () => {
            let userVal = null;
            const userValStr = ansInput.value.trim();
            
            // Validate answer input in real-time
            if (userValStr !== '') {
                const valCheck = this.validateSingleNumber(userValStr, 'merge answer');
                if (valCheck.valid) {
                    userVal = valCheck.value;
                    ansInput.style.borderColor = '';
                } else {
                    ansInput.style.borderColor = 'var(--accent-coral)';
                    expressionDisplay.textContent = `${sourceNode.val} ${opSelect.value} ${targetNode.val} = ✗`;
                    expressionDisplay.style.color = 'var(--accent-coral)';
                    return;
                }
            } else {
                ansInput.style.borderColor = '';
            }

            const userOp = this.normalizeOperator(opSelect.value);
            const v1 = sourceNode.val;
            const v2 = targetNode.val;
            let computed = null;
            
            // Compute with safety checks
            switch(userOp) {
                case '+': computed = v1 + v2; break;
                case '-': computed = v1 - v2; break;
                case '×': 
                    computed = v1 * v2;
                    if (!Number.isFinite(computed)) {
                        expressionDisplay.textContent = `${v1} ${userOp} ${v2} = ✗`;
                        expressionDisplay.style.color = 'var(--accent-coral)';
                        return;
                    }
                    break;
                case '÷': 
                    if (v2 === 0) {
                        expressionDisplay.textContent = `${v1} ${userOp} ${v2} = ✗`;
                        expressionDisplay.style.color = 'var(--accent-coral)';
                        return;
                    }
                    computed = v1 / v2;
                    break;
            }

            if (!Number.isFinite(computed)) {
                expressionDisplay.textContent = `${v1} ${userOp} ${v2} = ✗`;
                expressionDisplay.style.color = 'var(--accent-coral)';
                return;
            }

            // Keep merge preview user-driven (no answer reveal).
            const rhs = userValStr === '' ? '?' : userValStr;
            expressionDisplay.textContent = `${v1} ${userOp} ${v2} = ${rhs}`;
            expressionDisplay.style.color = userVal === null ? 'var(--accent-purple)' : 'var(--text-main)';
        };
        
        sourceLabel.textContent = sourceNode.label;
        targetLabel.textContent = targetNode.label;
        ansInput.value = '';
        ansInput.oninput = updateMergePreview;
        
        // Sanitization for merge answer input
        ansInput.onchange = (e) => {
            if (e.target.value !== '') {
                const val = parseFloat(e.target.value);
                if (!Number.isFinite(val)) {
                    e.target.value = '';
                } else {
                    e.target.value = Number.isInteger(val) ? val.toString() : val.toFixed(4);
                }
            }
            updateMergePreview();
        };
        
        opSelect.onchange = updateMergePreview;
        feedback.textContent = '';
        ansInput.removeAttribute('min');
        ansInput.removeAttribute('max');
        ansInput.step = bounds.step;
        expressionDisplay.textContent = `${sourceNode.val} + ${targetNode.val} = ?`;
        expressionDisplay.style.color = 'var(--accent-purple)';
        overlay.classList.remove('hidden');
        ansInput.focus();
        
        const cleanup = () => {
            overlay.classList.add('hidden');
            document.getElementById('btn-manual-math-submit').onclick = null;
            document.getElementById('btn-manual-math-cancel').onclick = null;
            ansInput.oninput = null;
            ansInput.onchange = null;
            opSelect.onchange = null;
        };

        document.getElementById('btn-manual-math-cancel').onclick = cleanup;

        const checkAnswer = () => {
            // Step 1: Validate user answer input
            const ansValidation = this.validateSingleNumber(ansInput.value, 'merge answer');
            if (!ansValidation.valid) {
                feedback.textContent = ansValidation.error;
                if (window.AudioSys) window.AudioSys.play('error');
                return;
            }

            const userVal = ansValidation.value;
            const userOp = this.normalizeOperator(opSelect.value);
            const epsilon = 1e-9;
            
            // Step 2: Validate operator choice
            const opCheck = this.validateOperatorChoice(userOp, [sourceNode.val, targetNode.val], null);
            if (!opCheck.valid) {
                feedback.textContent = opCheck.error;
                if (window.AudioSys) window.AudioSys.play('error');
                return;
            }
            
            const v1 = sourceNode.val;
            const v2 = targetNode.val;
            let computed = null;
            
            // Step 3: Compute result with safety checks
            switch(userOp) {
                case '+': 
                    computed = v1 + v2; 
                    break;
                case '-': 
                    computed = v1 - v2; 
                    break;
                case '×': 
                    computed = v1 * v2;
                    if (!Number.isFinite(computed)) {
                        feedback.textContent = "Multiplication result too large!";
                        if (window.AudioSys) window.AudioSys.play('error');
                        return;
                    }
                    break;
                case '÷': 
                    if (v2 === 0) {
                        feedback.textContent = "Cannot divide by zero!";
                        if (window.AudioSys) window.AudioSys.play('error');
                        return;
                    }
                    computed = v1 / v2;
                    break;
            }

            // Step 4: Validate result is sane
            if (!Number.isFinite(computed)) {
                feedback.textContent = "Invalid computation result";
                if (window.AudioSys) window.AudioSys.play('error');
                return;
            }

            // Step 5: Check answer correctness
            const isCorrect = Math.abs(userVal - computed) < epsilon;
            
            if (isCorrect) {
                 this.applyMerge(sourceNode, targetNode, userVal, userOp);
                 cleanup();
            } else {
                 if (window.AudioSys) window.AudioSys.play('error');
                 feedback.textContent = "Not quite yet! Let's check that calculation again.";
                 
                 // Shake both offending nodes
                 [sourceNode, targetNode].forEach(n => {
                     const el = document.getElementById(`node-${n.id}`);
                     if (el) {
                         el.classList.add('boing-reset');
                         setTimeout(() => el.classList.remove('boing-reset'), 600);
                     }
                 });
                 
                 ansInput.focus();
            }
        };

        document.getElementById('btn-manual-math-submit').onclick = checkAnswer;
        
        ansInput.onkeydown = (e) => {
            if (e.key === 'Enter') checkAnswer();
        };
    }

    applyMerge(sourceNode, targetNode, userVal, op) {
        this.practicePathSteps.push({
            type: 'merge',
            left: sourceNode.val, op, right: targetNode.val,
            result: userVal
        });

        // Keep merged inputs visible as parents so the tree remains attached and readable.
        sourceNode.type = 'parent-anchor';
        sourceNode.draggable = false;
        sourceNode.val = undefined;
        sourceNode.fx = sourceNode.x;
        sourceNode.fy = sourceNode.y;

        targetNode.type = 'parent-anchor';
        targetNode.draggable = false;
        targetNode.val = undefined;
        targetNode.fx = targetNode.x;
        targetNode.fy = targetNode.y;
        
        const newNode = {
            id: ++this.i, label: userVal.toString(), type: 'intermediate', draggable: true, val: userVal,
            x: (sourceNode.x + targetNode.x) / 2, 
            y: ((sourceNode.y + targetNode.y) / 2) + 72
        };

        this.floatingNodes.push(newNode);
        this.links.push(
            { source: sourceNode, target: newNode, operator: null },
            { source: targetNode, target: newNode, operator: op }
        );
        
        if (window.AudioSys) window.AudioSys.play('merge');
        document.dispatchEvent(new CustomEvent('node-merge-success', {
            detail: { message: "Calculated! Try another path if you want." }
        }));
        this.updateNodes();
    }

    checkWinCondition() {
        if (!this.strategyController || this._completedCurrentProblem) return;

        const activeLeaves = this.floatingNodes.filter(n =>
            n.draggable &&
            n.val !== undefined &&
            !Number.isNaN(Number(n.val))
        );

        const epsilon = 1e-9;
        const solvedNode = activeLeaves.find(n => Math.abs(Number(n.val) - Number(this.strategyController.answer)) < epsilon);

        // Complete as soon as the correct answer appears in any active result node.
        // This avoids forcing extra compulsory merges/splits after the learner already solved it.
        if (solvedNode) {
            this._completedCurrentProblem = true;
            const timeTaken = Math.floor((Date.now() - (this._startTime || Date.now())) / 1000);
            
            document.dispatchEvent(new CustomEvent('strategy-complete', {
                detail: {
                    timeTaken,
                    freeform: true,
                    practicePath: this.practicePathSteps.slice(),
                    finalValue: solvedNode.val,
                    solvedEarly: activeLeaves.length > 1
                }
            }));
        }
    }
}

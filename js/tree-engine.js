class TreeEngine {
    constructor(containerSelector) {
        this.containerSelector = containerSelector;
        this.svg = null;
        this.container = null;
        this.root = null;
        this.treeLayout = null;
        this.width = document.querySelector(containerSelector).clientWidth;
        this.height = document.querySelector(containerSelector).clientHeight;
        
        this.margin = { top: 60, right: 60, bottom: 60, left: 60 };
        this.strategyController = null;
        this.i = 0; // for node ID generation
        this.isPracticeMode = false;
        this.practicePathSteps = [];
        this._practiceNudgeTimer = null;
        this._practiceNudgeShown = false;
        this._practiceTargetVal = null;
        
        // Expose a public method to update hints
        this.updateHintCallback = null;
    }

    setStrategyController(ctrl) {
        this.strategyController = ctrl;
        this.practicePathSteps = [];
        this._practiceNudgeShown = false;
        this._practiceTargetVal = null;
        if (this._practiceNudgeTimer) {
            clearTimeout(this._practiceNudgeTimer);
            this._practiceNudgeTimer = null;
        }
        this.refreshHints();
    }
    
    setHintCallback(cb) {
        this.updateHintCallback = cb;
    }
    
    refreshHints() {
        if (!this.updateHintCallback) return;
        if (this.isPracticeMode) {
            const target = this.getPracticeTargetNode();
            if (target) {
                this.updateHintCallback(`What can you do with ${target.val}?`);
            } else {
                this.updateHintCallback('What can you do next?');
            }
            return;
        }
        if (this.strategyController && this.strategyController.getHint) {
            this.updateHintCallback(this.strategyController.getHint());
        }
    }

    render(data) {
        // Recalculate dimensions in case container was resized
        const el = document.querySelector(this.containerSelector);
        if (el) {
            this.width = el.clientWidth || this.width;
            this.height = el.clientHeight || this.height;
        }
        d3.select(this.containerSelector).selectAll("*").remove();
        
        // Setup SVG
        this.svg = d3.select(this.containerSelector)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .call(d3.zoom().on("zoom", (event) => {
                this.container.attr("transform", event.transform);
            }))
            .on("dblclick.zoom", null); // disable double click zoom
            
        this.container = this.svg.append("g")
            .attr("transform", `translate(0, ${this.margin.top})`);
            
        // Setup Tree Layout
        this.treeLayout = d3.tree().nodeSize([180, 130]);
        // Alternatively, fixed size tree layout
        // this.treeLayout = d3.tree().size([this.width - this.margin.left - this.margin.right, this.height - this.margin.top - this.margin.bottom]);

        // Setup Root Data
        let clonedData = JSON.parse(JSON.stringify(data));
        
        // Remove pre-attached modifiers in Practice mode so kids aren't railroaded
        if (this.isPracticeMode) {
             const pruneModifiers = (node) => {
                 if (node.children) {
                     node.children = node.children.filter(c => c.type !== 'modifier');
                     node.children.forEach(pruneModifiers);
                 }
             };
             pruneModifiers(clonedData);
             if (this.strategyController) {
                 this.strategyController.treeState = clonedData;
             }
        }
        
        this.root = d3.hierarchy(clonedData, d => d.children);
        this.root.x0 = this.width / 2;
        this.root.y0 = 0;
        
        // Give permanent IDs
        this.root.each(d => {
            d.data.id = d.data.id || ++this.i;
        });

        this.update(this.root);
    }

    update(source) {
        const treeData = this.treeLayout(this.root);
        const nodes = treeData.descendants();
        const links = treeData.links();

        // Adjust layout centering (since nodeSize spreads out from 0,0)
        // Center the tree horizontally
        const minX = d3.min(nodes, d => d.x);
        const maxX = d3.max(nodes, d => d.x);
        const offset = (this.width / 2) - ((maxX + minX) / 2);
        
        nodes.forEach(d => {
            d.x = d.x + offset;
            d.y = d.depth * 130; // vertical spacing
        });

        if (this.isPracticeMode) {
            this.updatePracticeFocus(nodes);
        }

        const duration = 500;
        
        // ****************** Nodes section ***************************
        const nodeGroup = this.container.selectAll("g.node")
            .data(nodes, d => d.data.id);

        const nodeEnter = nodeGroup.enter().append("g")
            .attr("class", d => `node ${d.data.type}`)
            .attr("id", d => `node-${d.data.id}`)
            .attr("transform", d => `translate(${source.x0}, ${source.y0})`);

        nodeEnter.append("circle")
            .attr("r", 1e-6);

        nodeEnter.append("text")
            .attr("dy", d => d.data.type === "modifier" ? ".35em" : ".35em")
            .attr("x", 0)
            .text(d => d.data.label)
            .style("fill-opacity", 1e-6);

        // Attach Drag Behavior to NEW draggable nodes
        nodeEnter.filter(d => d.data.draggable)
            .call(initNodeDrag(this));

        // Update nodes
        const nodeUpdate = nodeEnter.merge(nodeGroup);

        // Re-attach drag to ANY node that became draggable mid-strategy
        const engineRef = this;
        nodeUpdate.each(function(d) {
            if (d.data.draggable && !d._dragAttached) {
                d3.select(this).call(initNodeDrag(engineRef));
                d._dragAttached = true;
            }
        });
        
        // Attach click listener for freeform splitting in Practice mode
        if (this.isPracticeMode) {
            nodeUpdate.on("click", function(event, d) {
                // Prevent click if we're dragging
                if (event.defaultPrevented) return;
                
                // Only allow splitting numerical nodes
                if (d.data.val !== undefined && (!d.data.children || d.data.children.length === 0)) {
                    engineRef.showSplitModal(d);
                }
            });
        }

        // Update node class to reflect type changes
        nodeUpdate.attr("class", d => `node ${d.data.type}`);

        nodeUpdate.transition()
            .duration(duration)
            .attr("transform", d => `translate(${d.x}, ${d.y})`);

        nodeUpdate.select("circle")
            .attr("r", 40)
            .style("stroke-width", d => d._isTarget ? "6px" : "4px")
            .style("stroke", d => d._isTarget ? "var(--accent-purple)" : "");
            
        // If node is valid drop target during drag
        nodeUpdate.classed("drag-target", d => d._isTarget);
        nodeUpdate.classed("practice-focus-node", d => !!d._isPracticeFocus);

        nodeUpdate.select("text")
            .style("fill-opacity", 1)
            .text(d => d.data.label);

        // Remove exiting nodes
        const nodeExit = nodeGroup.exit().transition()
            .duration(duration)
            .attr("transform", d => `translate(${source.x}, ${source.y})`)
            .remove();

        nodeExit.select("circle").attr("r", 1e-6);
        nodeExit.select("text").style("fill-opacity", 1e-6);

        // ****************** Links & Operators section ***************************
        const diagonal = d3.linkVertical()
            .x(d => d.x)
            .y(d => d.y);

        const link = this.container.selectAll("path.link")
            .data(links, d => d.target.data.id);

        const linkEnter = link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", d => {
                const o = { x: source.x0, y: source.y0 };
                return diagonal({ source: o, target: o });
            });

        const linkUpdate = linkEnter.merge(link);

        linkUpdate.transition()
            .duration(duration)
            .attr("d", diagonal);

        link.exit().transition()
            .duration(duration)
            .attr("d", d => {
                const o = { x: source.x, y: source.y };
                return diagonal({ source: o, target: o });
            })
            .remove();

        // ------------------ Operator Labels on Links ------------------
        const practiceLabels = links.filter(d => d.target.data.operator && d.target.data.operatorSource === 'child');
        const guidedLabels = links.filter(d => d.target.data.operator);
        const linkLabels = this.container.selectAll("g.link-label")
            .data(this.isPracticeMode ? practiceLabels : guidedLabels, d => d.target.data.id);
            
        const linkLabelsEnter = linkLabels.enter().insert("g", "g.node")
            .attr("class", "link-label")
            .attr("transform", d => `translate(${source.x0}, ${source.y0})`);
            
        linkLabelsEnter.append("circle")
            .attr("r", 15)
            .style("fill", "var(--bg-color)")
            .style("stroke", "var(--accent-cyan)")
            .style("stroke-width", "2px");
            
        linkLabelsEnter.append("text")
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .text(d => d.target.data.operator)
            .style("fill", "var(--text-main)")
            .style("font-size", "16px")
            .style("font-weight", "bold");
            
        const linkLabelsUpdate = linkLabelsEnter.merge(linkLabels);
        
        linkLabelsUpdate.transition()
            .duration(duration)
            .attr("transform", d => {
                // Midpoint between source and target
                const mx = (d.source.x + d.target.x) / 2;
                const my = (d.source.y + d.target.y) / 2;
                return `translate(${mx}, ${my})`;
            });
            
        linkLabelsUpdate.select("text")
            .text(d => d.target.data.operator);
            
        linkLabels.exit().transition()
            .duration(duration)
            .attr("transform", d => `translate(${source.x}, ${source.y})`)
            .style("opacity", 0)
            .remove();
        // -------------------------------------------------------------

        // Stash the old positions for transition.
        nodes.forEach(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        if (this.isPracticeMode) {
            this.refreshHints();
        }
        
        // Check game completion
        if (this.strategyController) {
            let isWin = false;
            let freeform = false;
            
            if (this.isPracticeMode) {
                isWin = this.isPracticeSolved();
                freeform = isWin;
            } else if (this.strategyController.isFreeformPath) {
                const stateChildren = this.strategyController.treeState.children;
                if (stateChildren.length === 1 && stateChildren[0].val === this.strategyController.answer) {
                    isWin = true;
                    freeform = true;
                }
            } else if (this.strategyController.isComplete()) {
                isWin = true;
            }

            if (isWin) {
                const timeTaken = Math.floor((Date.now() - (this._startTime || Date.now())) / 1000);
                // 🎉 Confetti celebration!
                this.launchConfetti();
                document.dispatchEvent(new CustomEvent('strategy-complete', {
                    detail: {
                        timeTaken,
                        freeform,
                        practicePath: this.practicePathSteps.slice(),
                        finalValue: this.getPracticeFinalValue()
                    }
                }));
            }
        }
        
        if (!this._startTime) {
            this._startTime = Date.now();
        }
    }

    launchConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        const colors = ['#06b6d4', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#ec4899'];
        const particles = [];
        
        for (let i = 0; i < 80; i++) {
            particles.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 200,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 12,
                vy: -Math.random() * 12 - 4,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10,
                life: 1
            });
        }
        
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = false;
            
            particles.forEach(p => {
                if (p.life <= 0) return;
                alive = true;
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.3; // gravity
                p.rotation += p.rotSpeed;
                p.life -= 0.012;
                
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                ctx.restore();
            });
            
            if (alive) requestAnimationFrame(animate);
            else ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
        animate();
    }

    // Called by drag handler to try merging draggingNode into targetNode
    attemptMerge(sourceNode, targetNode) {
        if (!this.strategyController) return false;

        // Practice mode is intentionally path-agnostic: any valid math merge is allowed.
        if (this.isPracticeMode) {
            if (sourceNode.data.val !== undefined && targetNode.data.val !== undefined) {
                this.showMathModal(sourceNode, targetNode, null, true);
                return true;
            }
            document.dispatchEvent(new CustomEvent('node-merge-fail', {
                detail: { message: 'Try combining two number bubbles.' }
            }));
            return false;
        }
        
        const result = this.strategyController.validateMerge(sourceNode.data.id, targetNode.data.id);
        
        if (result.valid) {
            if (this.isPracticeMode && (result.expectedValue !== undefined || result.expectedSplit)) {
                
                if (result.expectedValue !== undefined) {
                    this.showMathModal(sourceNode, targetNode, result);
                } else if (result.expectedSplit) {
                    this.finalizeMerge(targetNode, result);
                }
                return true; 
            } else {
                this.finalizeMerge(targetNode, result);
                return true;
            }
        } else {
            // Check for Freeform Capabilities
            if (this.isPracticeMode && sourceNode.data.val !== undefined && targetNode.data.val !== undefined) {
                this.showMathModal(sourceNode, targetNode, null, true);
                return true; // Handle visually without strategy
            }

            // Trigger shake on target
            const elem = document.getElementById(`node-${targetNode.data.id}`);
            if (elem) {
                elem.classList.add('shake-animation');
                setTimeout(() => elem.classList.remove('shake-animation'), 400);
            }
            document.dispatchEvent(new CustomEvent('node-merge-fail', {
                detail: { message: result.message }
            }));
            return false;
        }
    }

    finalizeMerge(targetNode, result) {
        const newData = this.strategyController.getInitialTree();
        this.root = d3.hierarchy(newData, d => d.children);
        this.update(targetNode);
        this.refreshHints();
        document.dispatchEvent(new CustomEvent('node-merge-success', {
            detail: { message: result.message }
        }));
    }

    showMathModal(sourceNode, targetNode, result, isFreeform = false) {
        const overlay = document.getElementById('manual-math-overlay');
        const sourceLabel = document.getElementById('manual-math-source');
        const targetLabel = document.getElementById('manual-math-target');
        const ansInput = document.getElementById('manual-math-ans');
        const feedback = document.getElementById('manual-math-feedback');
        const opSelect = document.getElementById('manual-math-op');
        
        sourceLabel.textContent = sourceNode.data.label;
        targetLabel.textContent = targetNode.data.label;
        ansInput.value = '';
        feedback.textContent = '';
        overlay.classList.remove('hidden');
        ansInput.focus();
        
        const cleanup = () => {
            overlay.classList.add('hidden');
            document.getElementById('btn-manual-math-submit').onclick = null;
            document.getElementById('btn-manual-math-cancel').onclick = null;
        };

        const handleCancel = () => {
            cleanup();
            this.update(targetNode); // snaps the floating node back into the layout
        };

        document.getElementById('btn-manual-math-cancel').onclick = handleCancel;

        const checkAnswer = () => {
            const userVal = parseFloat(ansInput.value);
            const userOp = opSelect.value;
            let isCorrect = false;
            const epsilon = 1e-9;
            
            if (!isFreeform && result !== null) {
                isCorrect = (userVal === result.expectedValue);
                if (result.expectedOp) {
                     isCorrect = isCorrect && (userOp === result.expectedOp);
                }
            } else {
                const v1 = sourceNode.data.val;
                const v2 = targetNode.data.val;
                let computed = null;
                switch(userOp) {
                    case '+': computed = v1 + v2; break;
                    case '-': computed = v1 - v2; break;
                    case '×': computed = v1 * v2; break;
                    case '÷': computed = v1 / v2; break;
                }
                isCorrect = Math.abs(userVal - computed) < epsilon;
            }
            
            if (isCorrect) {
                 // Perfect! Apply it!
                 if (!isFreeform) {
                     this.finalizeMerge(targetNode, result);
                 } else {
                     this.applyFreeformMerge(sourceNode, targetNode, userVal, userOp);
                 }
                 cleanup();
            } else {
                 if (window.AudioSys) window.AudioSys.play('error');
                 feedback.textContent = "Not quite right! Check your operation and your math.";
                 ansInput.focus();
            }
        };

        document.getElementById('btn-manual-math-submit').onclick = checkAnswer;
        
        ansInput.onkeydown = (e) => {
            if (e.key === 'Enter') checkAnswer();
        };
    }

    applyFreeformMerge(sourceNode, targetNode, userVal, userOp) {
        // Mark strategy as freeform
        this.strategyController.isFreeformPath = true;
        
        let stateChildren = this.strategyController.treeState.children;
        const sId = sourceNode.data.id;
        const tId = targetNode.data.id;
        
        const removeNode = (nodes, id) => {
            if (!nodes) return false;
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].id === id) {
                    nodes.splice(i, 1);
                    return true;
                }
                if (removeNode(nodes[i].children, id)) return true;
            }
            return false;
        };
        
        removeNode(stateChildren, sId);
        removeNode(stateChildren, tId);
        
        // Push newly computed node
        this.strategyController.treeState.children.push({
            id: ++this.i,
            label: userVal.toString(),
            type: 'intermediate',
            draggable: true,
            val: userVal
        });

        this.practicePathSteps.push({
            type: 'merge',
            left: sourceNode.data.val,
            op: userOp,
            right: targetNode.data.val,
            result: userVal
        });

        this._practiceNudgeShown = false;
        
        // Redraw
        this.root = d3.hierarchy(this.strategyController.treeState, d => d.children);
        this.update(targetNode);
        this.refreshHints();
        
        if (this.updateHintCallback) {
            this.updateHintCallback('Nice move!');
        }
        
        document.dispatchEvent(new CustomEvent('node-merge-success', {
            detail: { message: "Calculated!" }
        }));
    }

    showSplitModal(node) {
        const overlay = document.getElementById('manual-split-overlay');
        const targetLabel = document.getElementById('manual-split-target');
        const v1Input = document.getElementById('manual-split-v1');
        const v2Input = document.getElementById('manual-split-v2');
        const opValue = document.getElementById('manual-split-op-value');
        const opButtons = overlay.querySelectorAll('.split-op-btn');
        const feedback = document.getElementById('manual-split-feedback');
        
        targetLabel.textContent = node.data.label;
        v1Input.value = '';
        v2Input.value = '';
        opValue.value = '+';
        feedback.textContent = '';
        opButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.op === '+');
            btn.onclick = () => {
                opValue.value = btn.dataset.op;
                opButtons.forEach(x => x.classList.remove('active'));
                btn.classList.add('active');
            };
        });
        overlay.classList.remove('hidden');
        v1Input.focus();
        
        const cleanup = () => {
            overlay.classList.add('hidden');
            document.getElementById('btn-manual-split-submit').onclick = null;
            document.getElementById('btn-manual-split-cancel').onclick = null;
        };

        const handleCancel = () => {
            cleanup();
        };

        document.getElementById('btn-manual-split-cancel').onclick = handleCancel;

        const checkAnswer = () => {
            const v1 = parseFloat(v1Input.value);
            const v2 = parseFloat(v2Input.value);
            const op = opValue.value;
            const targetVal = node.data.val;
            
            if (isNaN(v1) || isNaN(v2)) {
                feedback.textContent = "Please enter both numbers.";
                return;
            }
            
            let computed = null;
            switch(op) {
                case '+': computed = v1 + v2; break;
                case '-': computed = v1 - v2; break;
                case '×': computed = v1 * v2; break;
                case '÷': computed = v1 / v2; break;
            }
            
            if (computed === targetVal) {
                 this.applyFreeformSplit(node, v1, op, v2);
                 cleanup();
            } else {
                 if (window.AudioSys) window.AudioSys.play('error');
                 feedback.textContent = "That math doesn't equal " + targetVal + "!";
                 v1Input.focus();
            }
        };

        document.getElementById('btn-manual-split-submit').onclick = checkAnswer;
        
        v2Input.onkeydown = (e) => {
            if (e.key === 'Enter') checkAnswer();
        };
    }

    getPracticeLeaves() {
        const leaves = [];
        const walk = (node) => {
            if (!node) return;
            const hasChildren = !!(node.children && node.children.length);
            if (!hasChildren && node.val !== undefined) {
                leaves.push(node);
                return;
            }
            if (node.children) node.children.forEach(walk);
        };
        walk(this.strategyController && this.strategyController.treeState);
        return leaves;
    }

    getPracticeTargetNode(nodes = null) {
        const fromHierarchy = Array.isArray(nodes)
            ? nodes
            : (this.root ? this.root.descendants() : []);
        const candidates = fromHierarchy.filter(d => {
            const hasChildren = !!(d.data.children && d.data.children.length);
            return !hasChildren && d.data.val !== undefined;
        });
        if (candidates.length === 0) return null;
        return candidates[0].data;
    }

    updatePracticeFocus(nodes) {
        nodes.forEach(d => {
            d._isPracticeFocus = false;
        });
        const target = this.getPracticeTargetNode(nodes);
        if (!target) return;

        const focusNode = nodes.find(d => d.data.id === target.id);
        if (focusNode) {
            focusNode._isPracticeFocus = true;
        }

        if (this._practiceTargetVal !== target.val) {
            this._practiceTargetVal = target.val;
            this._practiceNudgeShown = false;
            this.schedulePracticeNudge(target.val);
        }
    }

    schedulePracticeNudge(expectedVal) {
        if (this._practiceNudgeTimer) {
            clearTimeout(this._practiceNudgeTimer);
            this._practiceNudgeTimer = null;
        }
        this._practiceNudgeTimer = setTimeout(() => {
            if (!this.isPracticeMode || this._practiceNudgeShown) return;
            const current = this.getPracticeTargetNode();
            if (!current || current.val !== expectedVal) return;
            this._practiceNudgeShown = true;
            if (this.updateHintCallback) {
                this.updateHintCallback('Can you break this into two numbers you know?');
            }
        }, 15000);
    }

    isPracticeSolved() {
        if (!this.strategyController) return false;
        const leaves = this.getPracticeLeaves();
        return leaves.length === 1 && leaves[0].val === this.strategyController.answer;
    }

    getPracticeFinalValue() {
        const leaves = this.getPracticeLeaves();
        if (leaves.length !== 1) return null;
        return leaves[0].val;
    }
    
    applyFreeformSplit(sourceNode, v1, op, v2) {
        this.strategyController.isFreeformPath = true;
        
        let stateChildren = this.strategyController.treeState.children;
        const sId = sourceNode.data.id;
        
        // Find the node object in actual treeState to attach children to it
        const findNode = (nodes, id) => {
            if (!nodes) return null;
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].id === id) return nodes[i];
                let found = findNode(nodes[i].children, id);
                if (found) return found;
            }
            return null;
        };
        
        let targetStateNode = findNode(this.strategyController.treeState.children, sId);
        
        if (targetStateNode) {
            targetStateNode.val = undefined; // Parent is no longer a terminal numerical leaf
            targetStateNode.draggable = false; // Parent cannot be dragged anymore
            targetStateNode.children = [
                { id: ++this.i, label: v1.toString(), type: 'operand', draggable: true, val: v1 },
                { id: ++this.i, label: v2.toString(), type: 'operand', draggable: true, val: v2, operator: op, operatorSource: 'child' }
            ];

            this.practicePathSteps.push({
                type: 'split',
                target: sourceNode.data.val,
                left: v1,
                op,
                right: v2
            });

            this._practiceNudgeShown = false;
            
            this.root = d3.hierarchy(this.strategyController.treeState, d => d.children);
            this.update(sourceNode);
            this.refreshHints();
            
            if (this.updateHintCallback) {
                this.updateHintCallback('Nice split!');
            }
            
            if (window.AudioSys) window.AudioSys.play('merge');
        }
    }
}

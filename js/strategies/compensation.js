class CompensationStrategy {
    constructor(problemData) {
        this.problemData = problemData; 
        this.stepsCompleted = 0;
        
        this.leftOperand = this.problemData.operands[0];
        this.rightOperand = this.problemData.operands[1];
        this.operation = this.problemData.operation;
        this.adj = this.problemData.adjustment;
        this.dir = this.problemData.direction;
        
        // Calculate what the rounded numbers will be
        if (this.dir === '+') {
            this.newLeft = this.leftOperand + this.adj;
            this.newRight = this.rightOperand + this.adj;
        } else {
            this.newLeft = this.leftOperand - this.adj;
            this.newRight = this.rightOperand - this.adj;
        }
        
        // Calculate answer
        this.answer = this.operation === '-' 
            ? this.leftOperand - this.rightOperand 
            : this.leftOperand + this.rightOperand;
        
        this.currentHint = `${this.rightOperand} is close to ${this.newRight}! Add ${this.adj} to both numbers to make it easier. Drag the "${this.dir}${this.adj}" onto each number!`;
        
        this.leftModApplied = false;
        this.rightModApplied = false;
        
        this.treeState = this.buildInitialState();
    }

    buildInitialState() {
        return {
            id: 1, 
            label: `${this.leftOperand} ${this.operation} ${this.rightOperand}`,
            type: 'root',
            draggable: false,
            children: [
                {
                    id: 2,
                    label: this.leftOperand.toString(),
                    type: 'operand',
                    draggable: false, 
                    children: [
                        {
                            id: 4,
                            label: `${this.dir}${this.adj}`,
                            type: 'modifier',
                            draggable: true
                        }
                    ]
                },
                {
                    id: 3,
                    label: this.rightOperand.toString(),
                    type: 'operand',
                    draggable: false,
                    operator: this.operation,
                    children: [
                        {
                            id: 5,
                            label: `${this.dir}${this.adj}`,
                            type: 'modifier',
                            draggable: true
                        }
                    ]
                }
            ]
        };
    }

    getInitialTree() { return this.treeState; }
    getHint() { return this.currentHint; }
    
    getOptimalPathText() {
        return `1. Adjust one number to the nearest friendly ten (e.g. 59 → 60).<br>2. Perform the easier math with the friendly number.<br>3. Compensate the final answer by subtracting or adding back the amount you adjusted!`;
    }
    isComplete() { return this.stepsCompleted === 2; }

    validateMerge(sourceId, targetId) {
        // Flatten tree to find nodes by ID
        let nodesList = [];
        const findAll = (node) => { nodesList.push(node); if(node.children) node.children.forEach(findAll); };
        findAll(this.treeState);
        
        const source = nodesList.find(n => n.id === sourceId);
        const target = nodesList.find(n => n.id === targetId);
        
        if (!source || !target) return { valid: false, message: 'Invalid nodes.' };
        
        // Step 1 & 2: Apply modifier to an operand
        if (source.type === 'modifier' && (target.type === 'operand' || target.type === 'intermediate')) {
            if ((source.id === 4 && target.id === 2) || (source.id === 5 && target.id === 3)) {
                let currentVal = parseInt(target.label);
                let newVal = this.dir === '+' ? currentVal + this.adj : currentVal - this.adj;
                    
                target.label = newVal.toString();
                target.children = []; 
                target.type = 'intermediate';
                
                if (target.id === 2) this.leftModApplied = true;
                if (target.id === 3) this.rightModApplied = true;
                
                if (this.leftModApplied && this.rightModApplied) {
                    // Both applied: make them draggable for the final merge
                    let n2 = this.treeState.children.find(c => c.id === 2);
                    let n3 = this.treeState.children.find(c => c.id === 3);
                    if (n2) n2.draggable = true;
                    if (n3) n3.draggable = true;
                    
                    this.currentHint = `Both sides adjusted equally! Now ${n2.label} ${this.operation} ${n3.label} is easy. Drag them together!`;
                } else {
                    this.currentHint = `Good! Now do the same to the other number to keep it balanced.`;
                }
                
                return { valid: true, message: `Added ${this.dir}${this.adj} → now it's ${newVal}!`, expectedValue: newVal, expectedOp: this.dir };
            }
        }
        
        // Step 3: Final merge of the two intermediate values
        if (source.type === 'intermediate' && target.type === 'intermediate') {
            if (this.leftModApplied && this.rightModApplied) {
                this.stepsCompleted = 2;
                
                this.treeState.children = [{
                    id: 99,
                    label: this.answer.toString(),
                    type: 'leaf',
                    draggable: false
                }];
                
                this.currentHint = `🎉 ${this.leftOperand} ${this.operation} ${this.rightOperand} = ${this.answer}! Great job!`;
                return { valid: true, message: `Answer: ${this.answer}!`, expectedValue: this.answer, expectedOp: this.operation };
            }
        }
        
        return { valid: false, message: 'Drag the modifier bubble onto its number first!' };
    }
}

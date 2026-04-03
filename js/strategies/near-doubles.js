class NearDoublesStrategy {
    constructor(problemData) {
        this.p = problemData; // { equation: "7 + 8", operands: [7, 8] }
        let o1 = this.p.operands[0];
        let o2 = this.p.operands[1];
        
        this.min = Math.min(o1, o2);
        this.max = Math.max(o1, o2);
        this.diff = this.max - this.min;
        this.doubleVal = this.min * 2;
        this.answer = o1 + o2;
        
        this.state = 0; // 0=start, 1=split, 2=doubled, 3=done
        
        this.currentHint = `${this.min} and ${this.max} are close! ${this.max} = ${this.min} + ${this.diff}. Drag the split bubble to break ${this.max} apart!`;
        
        this.treeState = {
            id: 1, label: `${o1} + ${o2}`, type: 'root', draggable: false,
            children: [
                { id: 2, label: this.min.toString(), type: 'operand', draggable: true, val: this.min },
                { 
                    id: 3, label: this.max.toString(), type: 'operand', draggable: true, val: this.max, operator: '+',
                    children: [
                        { id: 4, label: `${this.min} and ${this.diff}`, type: 'modifier', draggable: true }
                    ]
                }
            ]
        };
    }

    getInitialTree() { return this.treeState; }
    getHint() { return this.currentHint; }
    isComplete() { return this.state === 3; }

    getOptimalPathText() {
        return `1. Find the smaller of the two numbers.<br>2. Double it to perform quick math.<br>3. Add the leftover difference from the bigger number!`;
    }

    validateMerge(sourceId, targetId) {
        let n = [];
        const f = (node) => { n.push(node); if(node.children) node.children.forEach(f); };
        f(this.treeState);
        
        const s = n.find(x => x.id === sourceId);
        const t = n.find(x => x.id === targetId);
        if(!s || !t) return {valid:false, message:''};
        
        // Step 1: Split larger operand
        if (s.type === 'modifier' && t.id === 3 && this.state === 0) {
            this.state = 1;
            this.treeState.children = [
                { id: 2, label: this.min.toString(), type: 'operand', draggable: true, val: this.min },
                { id: 6, label: this.min.toString(), type: 'operand', draggable: true, val: this.min, operator: '+' },
                { id: 7, label: this.diff.toString(), type: 'operand', draggable: true, val: this.diff, operator: '+' }
            ];
            this.currentHint = `${this.max} split into ${this.min} + ${this.diff}! Now drag the two ${this.min}s together — that's a double!`;
            return {valid:true, message:`Split ${this.max} into ${this.min} + ${this.diff}!`, expectedSplit: true};
        }
        
        // Step 2: Combine the doubles (two equal numbers)
        if (this.state === 1) {
            let ids = [s.id, t.id].sort().join(',');
            if (ids === '2,6') {
                this.state = 2;
                this.treeState.children = [
                    { id: 8, label: this.doubleVal.toString(), type: 'intermediate', draggable: true, val: this.doubleVal },
                    { id: 7, label: this.diff.toString(), type: 'operand', draggable: true, val: this.diff, operator: '+' }
                ];
                this.currentHint = `Double ${this.min} = ${this.doubleVal}! Now just add ${this.diff} more!`;
                return {valid:true, message:`${this.min} + ${this.min} = ${this.doubleVal}!`, expectedValue: this.doubleVal, expectedOp: '+'};
            }
            return {valid:false, message:`Drag the two ${this.min}s together first to make a double!`};
        }
        
        // Step 3: Add remainder
        if (this.state === 2 && ((s.id === 8 && t.id === 7) || (s.id === 7 && t.id === 8))) {
            this.state = 3;
            this.treeState.children = [{ id: 10, label: this.answer.toString(), type: 'leaf', draggable: false, val: this.answer }];
            this.currentHint = `🎉 ${this.min} + ${this.max} = ${this.answer}! Near doubles strategy mastered!`;
            return {valid:true, message:`${this.doubleVal} + ${this.diff} = ${this.answer}!`, expectedValue: this.answer, expectedOp: '+'};
        }
        
        return {valid:false, message:'Try splitting the bigger number first!'};
    }
}

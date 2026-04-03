class BridgingStrategy {
    constructor(problemData) {
        this.p = problemData; // { equation: "8 + 5", operands: [8, 5] }
        this.o1 = this.p.operands[0];
        this.o2 = this.p.operands[1];
        
        this.needTo10 = 10 - this.o1;        // e.g. 2
        this.remainder = this.o2 - this.needTo10; // e.g. 3
        this.answer = this.o1 + this.o2;
        
        this.state = 0; // 0=start, 1=split, 2=bridged to 10, 3=done
        
        this.currentHint = `${this.o1} needs ${this.needTo10} more to reach 10! Let's split ${this.o2} into ${this.needTo10} and ${this.remainder}. Drag the split bubble!`;
        
        this.treeState = {
            id: 1, label: `${this.o1} + ${this.o2}`, type: 'root', draggable: false,
            children: [
                { id: 2, label: this.o1.toString(), type: 'operand', draggable: true, val: this.o1 },
                { 
                    id: 3, label: this.o2.toString(), type: 'operand', draggable: true, val: this.o2, operator: '+',
                    children: [
                        { id: 4, label: `${this.needTo10} and ${this.remainder}`, type: 'modifier', draggable: true, v1: this.needTo10, v2: this.remainder }
                    ]
                }
            ]
        };
    }

    getInitialTree() { return this.treeState; }
    getHint() { return this.currentHint; }
    isComplete() { return this.state === 3; }

    getOptimalPathText() {
        return `1. Find out how much the first number needs to reach the next 10.<br>2. Split the second number so you can complete that 10.<br>3. Add the leftover remainder to your friendly 10!`;
    }

    validateMerge(sourceId, targetId) {
        let n = [];
        const f = (node) => { n.push(node); if(node.children) node.children.forEach(f); };
        f(this.treeState);
        
        const s = n.find(x => x.id === sourceId);
        const t = n.find(x => x.id === targetId);
        if(!s || !t) return {valid:false, message:''};
        
        // Step 1: Split the second operand
        if (s.type === 'modifier' && t.id === 3 && this.state === 0) {
            this.state = 1;
            this.treeState.children = [
                { id: 2, label: this.o1.toString(), type: 'operand', draggable: true, val: this.o1 },
                { id: 6, label: this.needTo10.toString(), type: 'operand', draggable: true, val: this.needTo10, operator: '+' },
                { id: 7, label: this.remainder.toString(), type: 'operand', draggable: true, val: this.remainder, operator: '+' }
            ];
            this.currentHint = `${this.o2} is split into ${this.needTo10} and ${this.remainder}! Now drag ${this.o1} and ${this.needTo10} together to make 10.`;
            return {valid:true, message:`Split ${this.o2} into ${this.needTo10} + ${this.remainder}!`, expectedSplit: true};
        }
        
        // Step 2: Bridge to 10 (merge o1 with needTo10)
        if (this.state === 1) {
            let ids = [s.id, t.id].sort().join(',');
            if (ids === '2,6') {
                this.state = 2;
                this.treeState.children = [
                    { id: 8, label: '10', type: 'intermediate', draggable: true, val: 10 },
                    { id: 7, label: this.remainder.toString(), type: 'operand', draggable: true, val: this.remainder, operator: '+' }
                ];
                this.currentHint = `You made 10! Now just add ${this.remainder} more. Drag them together!`;
                return {valid:true, message:`${this.o1} + ${this.needTo10} = 10!`, expectedValue: 10, expectedOp: '+'};
            }
            return {valid:false, message:`First combine ${this.o1} and ${this.needTo10} to make 10!`};
        }
        
        // Step 3: Add 10 + remainder
        if (this.state === 2 && ((s.id === 8 && t.id === 7) || (s.id === 7 && t.id === 8))) {
            this.state = 3;
            this.treeState.children = [{ id: 10, label: this.answer.toString(), type: 'leaf', draggable: false, val: this.answer }];
            this.currentHint = `🎉 ${this.o1} + ${this.o2} = ${this.answer}! You bridged through 10!`;
            return {valid:true, message:`10 + ${this.remainder} = ${this.answer}!`, expectedValue: this.answer, expectedOp: '+'};
        }
        
        return {valid:false, message:'Try splitting the number first!'};
    }
}

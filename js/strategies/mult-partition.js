class MultPartitionStrategy {
    constructor(problemData) {
        this.p = problemData;
        this.o1 = this.p.operands[0]; // e.g. 3
        this.o2 = this.p.operands[1]; // e.g. 12
        
        // Break o2 into tens and ones: e.g. 12 -> 10 + 2
        this.tens = Math.floor(this.o2 / 10) * 10;
        this.ones = this.o2 % 10;
        if (this.ones === 0) { this.tens = this.o2; this.ones = 0; }
        
        this.valTens = this.o1 * this.tens;  // 30
        this.valOnes = this.o1 * this.ones;  // 6
        this.answer = this.o1 * this.o2;     // 36
        
        this.currentHint = `Let's break ${this.o2} into ${this.tens} + ${this.ones}! Drag the split bubble onto ${this.o2}.`;
        this.state = 0;
        
        this.treeState = {
            id: 1, label: `${this.o1} × ${this.o2}`, type: 'root', draggable: false,
            children: [
                { id: 2, label: this.o1.toString(), type: 'operand', draggable: false, val: this.o1 },
                { 
                    id: 3, label: this.o2.toString(), type: 'operand', draggable: true, val: this.o2, operator: '×',
                    children: [
                        { id: 4, label: `${this.tens} + ${this.ones}`, type: 'modifier', draggable: true }
                    ]
                }
            ]
        };
    }

    getInitialTree() { return this.treeState; }
    getHint() { return this.currentHint; }
    isComplete() { return this.state === 4; }

    getOptimalPathText() {
        return `1. Partition the big number into Tens and Ones.<br>2. Multiply the Tens by the single digit.<br>3. Multiply the Ones by the single digit.<br>4. Add your two products together!`;
    }

    validateMerge(sourceId, targetId) {
        let n = [];
        const f = (node) => { n.push(node); if(node.children) node.children.forEach(f); };
        f(this.treeState);
        
        const s = n.find(x => x.id === sourceId);
        const t = n.find(x => x.id === targetId);
        if(!s || !t) return {valid:false, message:''};
        
        // ─── Step 1: Split into two sub-problems ───
        if (s.type === 'modifier' && t.id === 3 && this.state === 0) {
            this.state = 1;
            
            this.treeState.children = [
                { 
                    id: 5, label: `${this.o1} × ${this.tens}`, type: 'intermediate', draggable: false, val: this.valTens,
                    children: [
                        { id: 7, label: 'Solve!', type: 'modifier', draggable: true }
                    ]
                },
                { 
                    id: 6, label: `${this.o1} × ${this.ones}`, type: 'intermediate', draggable: false, val: this.valOnes, operator: '+',
                    children: [
                        { id: 8, label: 'Solve!', type: 'modifier', draggable: true }
                    ]
                }
            ];
            
            this.currentHint = `${this.o2} = ${this.tens} + ${this.ones}! Now solve each part. What is ${this.o1} × ${this.tens}? Drag "Solve!" onto it!`;
            return {valid:true, message:`Split ${this.o2} into ${this.tens} + ${this.ones}!`, expectedSplit: true};
        }
        
        // ─── Step 2: Solve the tens part ───
        if (this.state === 1 && s.id === 7 && t.id === 5) {
            this.state = 2;
            
            let node5 = this.treeState.children.find(c => c.id === 5);
            node5.label = this.valTens.toString();
            node5.children = [];
            
            this.currentHint = `${this.o1} × ${this.tens} = ${this.valTens}! Now what is ${this.o1} × ${this.ones}? Drag "Solve!" onto it!`;
            return {valid:true, message:`${this.o1} × ${this.tens} = ${this.valTens}!`, expectedValue: this.valTens, expectedOp: '×'};
        }
        
        // ─── Step 3: Solve the ones part ───
        if (this.state === 2 && s.id === 8 && t.id === 6) {
            this.state = 3;
            
            let node6 = this.treeState.children.find(c => c.id === 6);
            node6.label = this.valOnes.toString();
            node6.children = [];
            node6.draggable = true;
            
            let node5 = this.treeState.children.find(c => c.id === 5);
            node5.draggable = true;
            
            this.currentHint = `${this.o1} × ${this.ones} = ${this.valOnes}! Now add them: ${this.valTens} + ${this.valOnes}. Drag them together!`;
            return {valid:true, message:`${this.o1} × ${this.ones} = ${this.valOnes}!`, expectedValue: this.valOnes, expectedOp: '×'};
        }
        
        // ─── Step 4: Final addition ───
        if (this.state === 3 && ((s.id === 5 && t.id === 6) || (s.id === 6 && t.id === 5))) {
            this.state = 4;
            
            this.treeState.children = [{ id: 9, label: this.answer.toString(), type: 'leaf', draggable: false, val: this.answer }];
            this.currentHint = `🎉 ${this.valTens} + ${this.valOnes} = ${this.answer}! So ${this.o1} × ${this.o2} = ${this.answer}! Amazing!`;
            return {valid:true, message:`${this.valTens} + ${this.valOnes} = ${this.answer}!`, expectedValue: this.answer, expectedOp: '+'};
        }
        
        // Helpful error messages
        if (this.state === 1) return {valid:false, message:`Drag "Solve!" onto "${this.o1} × ${this.tens}" first!`};
        if (this.state === 2) return {valid:false, message:`Now drag "Solve!" onto "${this.o1} × ${this.ones}"!`};
        if (this.state === 3) return {valid:false, message:`Drag ${this.valTens} and ${this.valOnes} together to add them!`};
        
        return {valid:false, message:'Drag the split bubble onto the number first!'};
    }
}

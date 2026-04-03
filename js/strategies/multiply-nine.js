class MultiplyNineStrategy {
    constructor(problemData) {
        this.p = problemData; 
        this.o1 = this.p.operands[0]; // e.g. 8
        this.state = 0; 
        
        this.valTen = this.o1 * 10;   // 80
        this.valOne = this.o1;         // 8
        this.answer = this.o1 * 9;     // 72
        
        this.currentHint = `Multiplying by 9 is tricky! But 9 is just 10 minus 1. Drag the "10 - 1" bubble onto the 9 to split it!`;
        
        this.treeState = {
            id: 1, label: `${this.o1} × 9`, type: 'root', draggable: false,
            children: [
                { id: 2, label: this.o1.toString(), type: 'operand', draggable: false, val: this.o1 },
                { 
                    id: 3, label: '9', type: 'operand', draggable: true, val: 9, 
                    operator: '×',
                    children: [
                        { id: 4, label: '10 - 1', type: 'modifier', draggable: true }
                    ]
                }
            ]
        };
    }

    getInitialTree() { return this.treeState; }
    getHint() { return this.currentHint; }
    isComplete() { return this.state === 4; }

    getOptimalPathText() {
        return `1. Recognize that 9 is just 10 minus 1.<br>2. Multiply your number by 10 (easy!).<br>3. Multiply your number by 1.<br>4. Subtract the results to get your final answer!`;
    }

    validateMerge(sourceId, targetId) {
        let n = [];
        const f = (node) => { n.push(node); if(node.children) node.children.forEach(f); };
        f(this.treeState);
        
        const s = n.find(x => x.id === sourceId);
        const t = n.find(x => x.id === targetId);
        if(!s || !t) return {valid:false, message:''};
        
        // ─── Step 1: Split 9 into (10 - 1) → show two sub-problems ───
        if (s.type === 'modifier' && t.id === 3 && this.state === 0) {
            this.state = 1;
            
            this.treeState.children = [
                { 
                    id: 5, label: `${this.o1} × 10`, type: 'intermediate', draggable: false, val: this.valTen,
                    children: [
                        { id: 7, label: 'Solve!', type: 'modifier', draggable: true }
                    ]
                },
                { 
                    id: 6, label: `${this.o1} × 1`, type: 'intermediate', draggable: false, val: this.valOne, operator: '-',
                    children: [
                        { id: 8, label: 'Solve!', type: 'modifier', draggable: true }
                    ]
                }
            ];
            
            this.currentHint = `9 = 10 - 1! So ${this.o1} × 9 = (${this.o1} × 10) - (${this.o1} × 1). Now solve each part! Drag "Solve!" onto "${this.o1} × 10".`;
            return {valid:true, message:'9 split into 10 - 1!', expectedSplit: true};
        }
        
        // ─── Step 2: Solve the ×10 part ───
        if (this.state === 1 && s.id === 7 && t.id === 5) {
            this.state = 2;
            
            // Replace the sub-problem with its answer
            let node5 = this.treeState.children.find(c => c.id === 5);
            node5.label = this.valTen.toString();
            node5.children = [];
            
            this.currentHint = `${this.o1} × 10 = ${this.valTen}! Easy! Now solve the other part: What is ${this.o1} × 1? Drag "Solve!" onto it.`;
            return {valid:true, message:`${this.o1} × 10 = ${this.valTen}!`, expectedValue: this.valTen, expectedOp: '×'};
        }
        
        // ─── Step 3: Solve the ×1 part ───
        if (this.state === 2 && s.id === 8 && t.id === 6) {
            this.state = 3;
            
            let node6 = this.treeState.children.find(c => c.id === 6);
            node6.label = this.valOne.toString();
            node6.children = [];
            node6.draggable = true;
            
            // Also make the tens node draggable for the final merge
            let node5 = this.treeState.children.find(c => c.id === 5);
            node5.draggable = true;
            
            this.currentHint = `${this.o1} × 1 = ${this.valOne}! Now we just need ${this.valTen} - ${this.valOne}. Drag them together to subtract!`;
            return {valid:true, message:`${this.o1} × 1 = ${this.valOne}!`, expectedValue: this.valOne, expectedOp: '×'};
        }
        
        // ─── Step 4: Final subtraction ───
        if (this.state === 3 && ((s.id === 5 && t.id === 6) || (s.id === 6 && t.id === 5))) {
            this.state = 4;
            
            this.treeState.children = [{ id: 9, label: this.answer.toString(), type: 'leaf', draggable: false, val: this.answer }];
            this.currentHint = `🎉 ${this.valTen} - ${this.valOne} = ${this.answer}! So ${this.o1} × 9 = ${this.answer}! You're a math star!`;
            return {valid:true, message:`${this.valTen} - ${this.valOne} = ${this.answer}!`, expectedValue: this.answer, expectedOp: '-'};
        }
        
        // Helpful error messages
        if (this.state === 1) return {valid:false, message:`Drag "Solve!" onto "${this.o1} × 10" first!`};
        if (this.state === 2) return {valid:false, message:`Now drag "Solve!" onto "${this.o1} × 1"!`};
        if (this.state === 3) return {valid:false, message:`Drag ${this.valTen} and ${this.valOne} together to subtract!`};
        
        return {valid:false, message:'Drag the "10 - 1" bubble onto the 9 first!'};
    }
}

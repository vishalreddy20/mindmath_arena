class PartitioningStrategy {
    constructor(problemData) {
        this.problemData = problemData; // { equation: "24 + 53", operands: [24, 53], operation: '+' }
        this.op1 = this.problemData.operands[0]; // 24
        this.op2 = this.problemData.operands[1]; // 53
        
        let tens1 = Math.floor(this.op1 / 10) * 10;
        let ones1 = this.op1 % 10;
        let tens2 = Math.floor(this.op2 / 10) * 10;
        let ones2 = this.op2 % 10;
        
        this.answer = this.op1 + this.op2;
        
        this.currentHint = `Partition numbers: split into tens and ones. Try adding the tens (${tens1} and ${tens2}) or ones (${ones1} and ${ones2}) together!`;
        
        // Initial state: root connected to 4 broken-down pieces
        this.treeState = {
            id: 1, 
            label: `${this.op1} + ${this.op2}`,
            type: 'root',
            draggable: false,
            children: [
                { id: 2, label: tens1.toString(), type: 'operand', draggable: true, val: tens1, isTen: true },
                { id: 3, label: ones1.toString(), type: 'operand', draggable: true, val: ones1, isTen: false, operator: '+' },
                { id: 4, label: tens2.toString(), type: 'operand', draggable: true, val: tens2, isTen: true, operator: '+' },
                { id: 5, label: ones2.toString(), type: 'operand', draggable: true, val: ones2, isTen: false, operator: '+' }
            ]
        };
        
        this.tensMerged = false;
        this.onesMerged = false;
        this.finalMerged = false;
    }

    getInitialTree() { return this.treeState; }
    getHint() { return this.currentHint; }
    getOptimalPathText() {
        return `1. Break both numbers down into Tens and Ones.<br>2. Add the tens together.<br>3. Add the ones together.<br>4. Add your two totals for the final answer!`;
    }

    validateMerge(sourceId, targetId) {
        let nodesList = [];
        const findNodes = (node) => {
            nodesList.push(node);
            if(node.children) node.children.forEach(findNodes);
        };
        findNodes(this.treeState);
        
        const source = nodesList.find(n => n.id === sourceId);
        const target = nodesList.find(n => n.id === targetId);
        
        if (!source || !target || source.id === target.id) return { valid: false, message: 'Invalid drag.' };
        
        // Allowed: ten + ten (if not already merged)
        if (!this.tensMerged && source.isTen && target.isTen && source.type === 'operand' && target.type === 'operand') {
            this.tensMerged = true;
            this.currentHint = this.onesMerged 
                ? "Great! Now add your grouped tens and ones together."
                : "Tens grouped! Now add the remaining ones together.";
            return this.updateTreePostMerge(source, target, source.val + target.val, 'intermediate');
        }
        
        // Allowed: one + one (if not already merged)
        if (!this.onesMerged && source.isTen === false && target.isTen === false && source.type === 'operand' && target.type === 'operand') {
            this.onesMerged = true;
            this.currentHint = this.tensMerged 
                ? "Great! Now add your grouped tens and ones together."
                : "Ones grouped! Now add the remaining tens together.";
            return this.updateTreePostMerge(source, target, source.val + target.val, 'intermediate');
        }
        
        // Allowed: intermediate + intermediate (final answer)
        if (this.tensMerged && this.onesMerged && source.type === 'intermediate' && target.type === 'intermediate') {
            this.finalMerged = true;
            this.currentHint = "Solved! Excellent partitioning.";
            return this.updateTreePostMergeFinal(source, target, source.val + target.val);
        }
        
        return { valid: false, message: 'Try grouping tens with tens, and ones with ones!' };
    }
    
    updateTreePostMerge(source, target, sum, newType) {
        // Remove source and target
        this.treeState.children = this.treeState.children.filter(n => n.id !== source.id && n.id !== target.id);
        
        // Add merged node
        this.treeState.children.push({
            id: 100 + sum + Math.floor(Math.random() * 100), // ensure uniqueness
            label: sum.toString(),
            type: newType,
            draggable: true,
            val: sum,
            isTen: source.isTen // inherit isTen flag from source
        });
        
        // Re-apply operators to all children except the first one for visual cleanliness
        this.treeState.children.forEach((child, index) => {
            if (index === 0) delete child.operator;
            else child.operator = '+';
        });
        
        return { valid: true, message: 'Merged successfully!', expectedValue: sum, expectedOp: '+' };
    }

    updateTreePostMergeFinal(source, target, sum) {
        this.treeState.children = [{
            id: 999,
            label: sum.toString(),
            type: 'leaf',
            draggable: false,
            val: sum
        }];
        return { valid: true, message: 'Final sum achieved!', expectedValue: sum, expectedOp: '+' };
    }

    isComplete() { return this.finalMerged; }
}

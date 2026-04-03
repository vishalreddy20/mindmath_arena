class ASTEvaluator {
    static evaluate(userPathSteps, strategyController) {
        const userStepCount = userPathSteps.length;
        
        // Generate AST Step HTML
        let pathHtml = `<ul style="padding-left:20px;">`;
        if (userStepCount === 0) {
            pathHtml += `<li>Wait, did you even calculate anything?</li>`;
        } else {
            userPathSteps.forEach((s, idx) => {
                if (s.type === 'split') {
                    const splitExpression = Array.isArray(s.parts) && s.parts.length > 1
                        ? s.parts.join(` ${s.op} `)
                        : `${s.left} ${s.op} ${s.right}`;
                    pathHtml += `<li><span style="opacity:0.6">Step ${idx+1}:</span> Split <strong>${s.target}</strong> into <strong>${splitExpression}</strong></li>`;
                } else if (s.type === 'merge') {
                    pathHtml += `<li><span style="opacity:0.6">Step ${idx+1}:</span> Merged <strong>${s.left} ${s.op} ${s.right}</strong> to get <strong>${s.result}</strong></li>`;
                }
            });
        }
        pathHtml += `</ul>`;
        pathHtml += `<p style="margin-top:10px;">Total operations: <strong>${userStepCount}</strong></p>`;
        
        // Get optimal path
        let optimalHtml = 'Optimal path not defined for this strategy.';
        if (strategyController && strategyController.getOptimalPathText) {
            optimalHtml = strategyController.getOptimalPathText();
        } else if (strategyController && strategyController.currentHint) {
             // Fallback
             optimalHtml = strategyController.currentHint;
        }
        
        return {
            userPathHtml: pathHtml,
            optimalHtml: optimalHtml,
            isEfficient: userStepCount <= 3 // Arbitrary threshold for efficient path
        };
    }
}

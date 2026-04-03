function initNodeDrag(engine) {
    return d3.drag()
        .on("start", function(event, d) {
            if (window.AudioSys) window.AudioSys.play('drag');
            if (!d.data.draggable) return;
            
            // Bring to front
            d3.select(this).raise();
            
            d._originalX = d.x;
            d._originalY = d.y;
        })
        .on("drag", function(event, d) {
            if (!d.data.draggable) return;
            
            d.x += event.dx;
            d.y += event.dy;
            
            d3.select(this)
                .attr("transform", `translate(${d.x}, ${d.y})`);
                
            // Collision detection for target highlighting
            const nodes = engine.root.descendants();
            const hitRadius = 80; // generous hit zone for young kids
            let closest = null;
            let minDist = Infinity;
            
            nodes.forEach(n => {
                if(n.data.id === d.data.id) return;
                // Exclude self and non-targets based on strategy logic
                const dx = n.x - d.x;
                const dy = n.y - d.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                n._isTarget = false; // Reset
                
                if (dist < hitRadius && dist < minDist) {
                    minDist = dist;
                    closest = n;
                }
            });
            
            if (closest) {
                closest._isTarget = true;
            }
            
            // Fast re-render of nodes only to update strokes
            engine.container.selectAll("g.node").select("circle")
                .style("stroke-width", n => n._isTarget ? "6px" : "4px")
                .style("stroke", n => n._isTarget ? "var(--accent-emerald)" : "");
        })
        .on("end", function(event, d) {
            if (!d.data.draggable) return;
            
            const nodes = engine.root.descendants();
            let targetNode = null;
            
            // Find any marked as target
            nodes.forEach(n => {
                if (n._isTarget) {
                    targetNode = n;
                    n._isTarget = false; // Clear
                }
            });
            
            let merged = false;
            if (targetNode) {
                merged = engine.attemptMerge(d, targetNode);
            }
            
            if (!merged) {
                // Return to original position smoothly
                d.x = d._originalX;
                d.y = d._originalY;
                d3.select(this).transition().duration(300)
                    .attr("transform", `translate(${d.x}, ${d.y})`);
                    
                // Clear any leftover strokes
                engine.container.selectAll("g.node").select("circle")
                    .style("stroke-width", "4px")
                    .style("stroke", "");
            }
        });
}

class GamificationSystem {
    constructor() {
        this.toastQueue = [];
        this.isToasting = false;
    }

    showToast(title, message, icon = '🏆') {
        this.toastQueue.push({title, message, icon});
        this.processQueue();
    }
    
    processQueue() {
        if(this.isToasting || this.toastQueue.length === 0) return;
        
        this.isToasting = true;
        const current = this.toastQueue.shift();
        
        const container = document.getElementById('toast-container');
        if(!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast glass-panel';
        toast.innerHTML = `
            <div class="toast-icon">${current.icon}</div>
            <div class="toast-content">
                <h4>${current.title}</h4>
                <p>${current.message}</p>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Trigger reflow
        void toast.offsetWidth;
        toast.classList.add('show');
        
        if (window.AudioSys) window.AudioSys.play('start');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
                this.isToasting = false;
                this.processQueue();
            }, 300);
        }, 3000);
    }
    
    createMergeParticles(x, y) {
        // Simple DOM based particle effect
        const container = document.querySelector('.arena-play-area');
        if(!container) return;
        
        for(let i = 0; i < 10; i++) {
            const dot = document.createElement('div');
            dot.style.position = 'absolute';
            dot.style.left = `${x}px`;
            dot.style.top = `${y}px`;
            dot.style.width = '8px';
            dot.style.height = '8px';
            dot.style.borderRadius = '50%';
            dot.style.backgroundColor = 'var(--accent-cyan)';
            dot.style.pointerEvents = 'none';
            dot.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            dot.style.zIndex = '100';
            
            container.appendChild(dot);
            
            const angle = Math.random() * Math.PI * 2;
            const velocity = 20 + Math.random() * 30;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;
            
            setTimeout(() => {
                dot.style.transform = `translate(${tx}px, ${ty}px) scale(0)`;
                dot.style.opacity = '0';
            }, 10);
            
            setTimeout(() => dot.remove(), 600);
        }
    }
}

window.GamificationSys = new GamificationSystem();

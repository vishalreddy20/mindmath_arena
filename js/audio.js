class AudioSystem {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterVolume = this.ctx.createGain();
        this.masterVolume.gain.value = 0.3;
        this.masterVolume.connect(this.ctx.destination);
    }

    _playTone(freq, type, duration, volMod = 1) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volMod, this.ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.masterVolume);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    play(eventName) {
        switch(eventName) {
            case 'start':
                this._playTone(440, 'sine', 0.2, 0.5);
                setTimeout(() => this._playTone(554, 'sine', 0.4, 0.5), 150);
                break;
            case 'drag':
                this._playTone(200, 'triangle', 0.1, 0.2);
                break;
            case 'merge':
                this._playTone(600, 'sine', 0.1, 0.5);
                setTimeout(() => this._playTone(800, 'sine', 0.2, 0.5), 50);
                break;
            case 'error':
                // Wobble sound
                if (this.ctx.state === 'suspended') this.ctx.resume();
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, this.ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
                osc.connect(gain);
                gain.connect(this.masterVolume);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.3);
                break;
            case 'success':
                this._playTone(440, 'square', 0.1, 0.3);
                setTimeout(() => this._playTone(554, 'square', 0.1, 0.3), 100);
                setTimeout(() => this._playTone(659, 'square', 0.3, 0.3), 200);
                break;
            case 'levelup':
                this._playTone(523.25, 'triangle', 0.15, 0.5); // C5
                setTimeout(() => this._playTone(659.25, 'triangle', 0.15, 0.5), 150); // E5
                setTimeout(() => this._playTone(783.99, 'triangle', 0.15, 0.5), 300); // G5
                setTimeout(() => this._playTone(1046.50, 'triangle', 0.4, 0.5), 450); // C6
                break;
        }
    }
}

// Make accessible globally
window.AudioSys = new AudioSystem();

// Gamification UI helpers
window.GamificationSys = {
    showToast: function(title, message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast glass-panel';
        toast.innerHTML = `
            <div class="toast-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;
        container.appendChild(toast);
        
        // Trigger reflow to jumpstart transition
        void toast.offsetWidth;
        toast.classList.add('show');
        
        if (window.AudioSys) window.AudioSys.play('start');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};

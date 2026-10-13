
"use strict";

/* =====================================
   LUDO ROYALE - SOUND EFFECTS
   Using Web Audio API
===================================== */

const LudoSounds = {
    enabled: true,
    audioContext: null,

    init() {
        if (!this.enabled) return null;

        try {
            const AudioContextClass =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!AudioContextClass) return null;

            if (!this.audioContext) {
                this.audioContext = new AudioContextClass();
            }

            if (this.audioContext.state === "suspended") {
                this.audioContext.resume().catch(() => {});
            }

            return this.audioContext;
        } catch (error) {
            console.warn("Audio unavailable:", error);
            return null;
        }
    },

    tone(frequency, duration, type = "sine",
         volume = 0.12, delay = 0) {

        if (!this.enabled) return;

        const context = this.init();
        if (!context) return;

        const start = context.currentTime + delay;

        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(
            frequency,
            start
        );

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(
            volume,
            start + 0.01
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            start + duration
        );

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start(start);
        oscillator.stop(start + duration + 0.02);
    },

    dice() {
        if (!this.enabled) return;

        for (let i = 0; i < 5; i++) {
            this.tone(
                180 + i * 65,
                0.055,
                "triangle",
                0.075,
                i * 0.065
            );
        }
    },

    move() {
        this.tone(520, 0.08, "sine", 0.09);
        this.tone(680, 0.09, "sine", 0.07, 0.09);
    },

    six() {
        this.tone(523, 0.12, "sine", 0.12);
        this.tone(659, 0.12, "sine", 0.12, 0.13);
        this.tone(784, 0.20, "sine", 0.14, 0.26);
    },

    capture() {
        this.tone(550, 0.12, "square", 0.07);
        this.tone(380, 0.15, "square", 0.07, 0.12);
        this.tone(220, 0.22, "triangle", 0.10, 0.25);
    },

    finish() {
        this.tone(659, 0.14, "sine", 0.11);
        this.tone(784, 0.14, "sine", 0.11, 0.15);
        this.tone(1047, 0.25, "sine", 0.13, 0.30);
    },

    win() {
        const notes = [
            523, 659, 784, 1047,
            784, 1047, 1318
        ];

        notes.forEach((frequency, index) => {
            this.tone(
                frequency,
                0.22,
                "triangle",
                0.12,
                index * 0.18
            );
        });
    },

    toggle() {
        this.enabled = !this.enabled;

        if (this.enabled) {
            this.tone(880, 0.12, "sine", 0.1);
        }

        return this.enabled;
    }
};

import React from 'react';
import { useLanguage } from '../i18n';

interface SoundActivationOverlayProps {
    onActivate: () => void;
}

export function SoundActivationOverlay({ onActivate }: SoundActivationOverlayProps) {
    const { language } = useLanguage();
    const isHebrew = language === 'he';

    const handleTap = () => {
        // Try to play a silent sound and init speech to unlock AudioContext
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            gainNode.gain.value = 0; // Silent
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.001);

            // Also init speech synthesis
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance('');
                utterance.volume = 0;
                window.speechSynthesis.speak(utterance);
            }
        } catch (e) {
            // Ignore
        }
        onActivate();
    };

    return (
        <div style={styles.banner} onClick={handleTap}>
            <span style={styles.icon}>🔊</span>
            <span style={styles.text}>
                {isHebrew ? 'הקש להפעלת צלילים' : 'Tap to enable sounds'}
            </span>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    banner: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#2563eb',
        color: '#ffffff',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        zIndex: 9999,
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 500
    },
    icon: {
        fontSize: '20px'
    },
    text: {
        fontSize: '16px'
    }
};

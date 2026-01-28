import React from 'react';
import { useLanguage } from '../i18n';

interface AboutPageProps {
    onBack: () => void;
}

export function AboutPage({ onBack }: AboutPageProps) {
    const { t, language } = useLanguage();
    const isHebrew = language === 'he';

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={onBack} style={styles.backButton}>
                    ← {t('ui.back')}
                </button>
            </div>

            <div style={styles.content}>
                {isHebrew ? (
                    <>
                        <section style={styles.section}>
                            <h2 style={styles.sectionTitle}>אודות</h2>
                            <p style={styles.text}>
                                אתר זה הוא מיזם פרטי המציג מדד זמן להגעה למרחב מוגן,
                                בהתבסס על מידע פומבי של פיקוד העורף.
                            </p>
                            <p style={styles.text}>
                                האתר אינו שירות רשמי ואינו מופעל על ידי פיקוד העורף
                                או כל גורם חירום אחר.
                            </p>
                        </section>

                        <section style={styles.section}>
                            <h2 style={styles.sectionTitle}>אחריות</h2>
                            <p style={styles.text}>
                                המידע באתר נועד להצגה והמחשה בלבד.
                                אין לראות בו הנחיה, הוראה או תחליף להנחיות רשמיות.
                            </p>
                            <p style={styles.textBold}>
                                בכל מקרה יש לפעול אך ורק לפי הנחיות פיקוד העורף.
                            </p>
                        </section>
                    </>
                ) : (
                    <>
                        <section style={styles.section}>
                            <h2 style={styles.sectionTitle}>About</h2>
                            <p style={styles.text}>
                                This website is a private initiative that displays
                                a countdown timer to reach a protected space,
                                based on publicly available data from the
                                Israel Home Front Command.
                            </p>
                            <p style={styles.text}>
                                This website is not an official service and is not operated
                                by the Home Front Command or any emergency authority.
                            </p>
                        </section>

                        <section style={styles.section}>
                            <h2 style={styles.sectionTitle}>Disclaimer</h2>
                            <p style={styles.text}>
                                The information provided is for display purposes only.
                                It does not constitute instructions or official guidance.
                            </p>
                            <p style={styles.textBold}>
                                In all cases, users must follow the official
                                Home Front Command instructions.
                            </p>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1a1a2e',
        color: '#ffffff',
        padding: '20px',
        overflowY: 'auto'
    },
    header: {
        marginBottom: '24px'
    },
    backButton: {
        background: 'none',
        border: 'none',
        color: '#4ade80',
        fontSize: '16px',
        cursor: 'pointer',
        padding: '8px',
        display: 'flex',
        alignItems: 'center'
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        maxWidth: '600px',
        margin: '0 auto',
        width: '100%'
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    sectionTitle: {
        fontSize: '20px',
        fontWeight: 600,
        color: '#4ade80',
        margin: '0 0 8px 0',
        borderBottom: '1px solid #333',
        paddingBottom: '8px'
    },
    text: {
        fontSize: '16px',
        lineHeight: 1.6,
        margin: 0,
        color: '#e2e8f0'
    },
    textBold: {
        fontSize: '16px',
        lineHeight: 1.6,
        margin: 0,
        color: '#ffffff',
        fontWeight: 600
    }
};

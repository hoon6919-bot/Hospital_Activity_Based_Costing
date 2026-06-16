import React from 'react';
import styles from './FTE_Slider.module.css';

const FTE_Slider = ({ value, onChange, labelLeft, labelRight }) => {
    // value is 0 to 1 (e.g., 0.5)
    return (
        <div className={styles.container}>
            <div className={styles.labels}>
                <span className={styles.label}>{labelLeft} {(value * 100).toFixed(0)}%</span>
                <span className={styles.label}>{labelRight} {((1 - value) * 100).toFixed(0)}%</span>
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className={styles.slider}
            />
            <div className={styles.track} style={{ '--progress': `${value * 100}%` }}></div>
        </div>
    );
};

export default FTE_Slider;

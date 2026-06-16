import React from 'react';

const Stepper = ({ steps, currentStep }) => {
    return (
        <div className="stepper">
            {/* TODO: Implement Stepper UI */}
            {steps.map((step, index) => (
                <div key={index} className={index === currentStep ? 'active' : ''}>
                    {step}
                </div>
            ))}
        </div>
    );
};

export default Stepper;

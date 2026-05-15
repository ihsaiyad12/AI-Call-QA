'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Upload, MessageSquare, Target, Trophy } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const steps = [
  { id: 1, name: 'Setup', icon: Upload },
  { id: 2, name: 'Processing', icon: MessageSquare },
  { id: 3, name: 'Analysis', icon: Target },
  { id: 4, name: 'Results', icon: Trophy },
];

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, onStepClick }) => {
  const activeStep = currentStep === 3 ? 4 : currentStep;

  return (
    <div style={styles.container}>
      <div style={styles.stepsWrapper}>
        {steps.map((step, index) => {
          const isCompleted = activeStep > step.id;
          const isActive = activeStep === step.id;
          const Icon = step.icon;
          const isClickable = step.id === 1 && currentStep > 1;
          
          return (
            <React.Fragment key={step.id}>
              <div 
                style={{
                  ...styles.stepItem,
                  cursor: isClickable ? 'pointer' : 'default',
                }}
                onClick={() => isClickable && onStepClick && onStepClick(step.id)}
              >
                {/* Icon Container */}
                <motion.div 
                  initial={false}
                  animate={{
                    scale: isActive ? 1.15 : 1,
                    backgroundColor: isActive ? 'var(--color-primary)' : (isCompleted ? 'var(--color-green)' : 'var(--color-bg-card)'),
                    borderColor: isActive ? 'var(--color-primary)' : (isCompleted ? 'var(--color-green)' : 'var(--color-border)'),
                    boxShadow: isActive ? '0 10px 20px rgba(79, 70, 229, 0.2)' : 'none'
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  style={styles.iconCircle}
                >
                  <AnimatePresence mode="wait">
                    {isCompleted ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                      >
                        <Check size={18} color="white" strokeWidth={3} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="icon"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ display: 'flex' }}
                      >
                        <Icon 
                          size={18} 
                          color={isActive ? 'white' : 'var(--color-text-muted)'} 
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Pulsing Aura for Active Step */}
                  {isActive && (
                    <motion.div
                      layoutId="aura"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                      style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: '12px',
                        backgroundColor: 'var(--color-primary)',
                        zIndex: -1
                      }}
                    />
                  )}
                </motion.div>

                {/* Text Label */}
                <div style={styles.textWrapper}>
                  <motion.span 
                    animate={{
                      color: isActive ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                      y: isActive ? -2 : 0,
                    }}
                    style={{
                      ...styles.stepLabel,
                      fontWeight: isActive ? '700' : '500',
                    }}
                  >
                    {step.name}
                  </motion.span>
                  {isActive && (
                    <motion.div 
                      layoutId="activeIndicator"
                      style={styles.activeDot}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </div>
              </div>
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div style={styles.connector}>
                  <motion.div 
                    initial={{ width: '0%' }}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                    style={styles.connectorProgress} 
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    padding: '32px 0 48px',
    display: 'flex',
    justifyContent: 'center',
    overflow: 'visible'
  },
  stepsWrapper: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    maxWidth: '850px',
    padding: '0 40px',
  },
  stepItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    position: 'relative',
    zIndex: 10,
  },
  iconCircle: {
    position: 'relative',
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid',
  },
  textWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    height: '24px',
  },
  stepLabel: {
    fontSize: '13px',
    letterSpacing: '-0.3px',
    transition: 'color 0.3s',
  },
  activeDot: {
    width: '12px',
    height: '3px',
    borderRadius: '2px',
    backgroundColor: 'var(--color-primary)',
  },
  connector: {
    flex: 1,
    height: '4px',
    backgroundColor: 'var(--color-bg-app)',
    margin: '0 -15px',
    marginTop: '-32px',
    position: 'relative',
    borderRadius: '99px',
    overflow: 'hidden',
    zIndex: 1
  },
  connectorProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: 'var(--color-green)',
    boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)'
  }
};

export default StepIndicator;

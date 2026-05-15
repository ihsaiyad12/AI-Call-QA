import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ProcessingState } from '@/types';

interface Step2ProcessingProps {
  processingState: ProcessingState;
  onRetry: () => void;
  onCancel?: () => void;
}

const Step2_Processing: React.FC<Step2ProcessingProps> = ({ processingState, onRetry, onCancel }) => {
  const { type, progress, error } = processingState;

  const isInitializing = type === 'initializing';
  const isTranscribing = type === 'transcribing';
  const isScoring = type === 'scoring';
  const isSaving = type === 'saving';

  if (error) {
    return (
      <div className="card fade-in" style={{ ...styles.card, borderColor: 'var(--color-red)' }}>
        <div style={{ ...styles.iconCircle, backgroundColor: 'var(--color-red-bg)' }}>
          <AlertCircle size={24} color="var(--color-red)" />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginTop: '16px', textAlign: 'center' }}>Analysis Failed</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: '12px 0 24px', textAlign: 'center' }}>
          {error}
        </p>
        <button 
          className="primary-button" 
          onClick={onRetry}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <RefreshCw size={18} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="card fade-in" style={styles.card}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '32px', textAlign: 'center' }}>
        {isSaving ? 'Saving lead information...' : 'Processing your call...'}
      </h3>

      {/* Transcribing Progress */}
      <div style={styles.progressItem}>
        <div style={styles.labelRow}>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: '600',
            color: type === 'transcribing' ? 'var(--color-text-main)' : 'var(--color-text-muted)'
          }}>
            1. Transcribing audio
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {isTranscribing ? `${progress}%` : (isScoring || isSaving ? 'Done' : 'Waiting...')}
          </span>
        </div>
        <div style={styles.progressTrack}>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: type === 'transcribing' ? `${progress}%` : (isScoring || isSaving ? '100%' : 0) }}
            transition={{ duration: 0.5 }}
            style={{
              ...styles.progressBar,
              backgroundColor: isScoring || isSaving ? 'var(--color-green)' : 'var(--color-primary)',
            }}
          />
        </div>
      </div>

      {/* Scoring Progress */}
      <div style={{ ...styles.progressItem, marginTop: '24px' }}>
        <div style={styles.labelRow}>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: '600',
            color: type === 'scoring' ? 'var(--color-text-main)' : 'var(--color-text-muted)'
          }}>
            2. Scoring with AI
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {type === 'scoring' ? `${progress}%` : (isSaving ? 'Done' : 'Waiting...')}
          </span>
        </div>
        <div style={styles.progressTrack}>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: type === 'scoring' ? `${progress}%` : (isSaving ? '100%' : 0) }}
            transition={{ duration: 0.5 }}
            style={{
              ...styles.progressBar,
              backgroundColor: isSaving ? 'var(--color-green)' : 'var(--color-primary)',
            }}
          />
        </div>
      </div>

      <p style={{ 
        textAlign: 'center', 
        fontSize: '13px', 
        color: 'var(--color-text-muted)',
        marginTop: '32px'
      }}>
        {isSaving ? 'Securing your lead data in the database...' : (isTranscribing ? 'Listening to the recording and identifying speakers...' : 'Analyzing the conversation for intent and fit...')}
      </p>

      {onCancel && (
        <button 
          onClick={onCancel}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-red)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-red)';
          }}
          style={{
            marginTop: '32px',
            background: 'transparent',
            border: '1.5px solid var(--color-red)',
            color: 'var(--color-red)',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '12px 24px',
            textAlign: 'center',
            width: '100%',
            transition: 'all 0.2s ease',
          }}
        >
          Cancel Processing
        </button>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    maxWidth: '520px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 10px 30px var(--color-shadow)',
    border: '1px solid var(--color-border)',
  },
  progressItem: {
    width: '100%',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  progressTrack: {
    height: '10px',
    backgroundColor: 'var(--color-bg-app)',
    borderRadius: '99px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: '99px',
  },
  iconCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    boxShadow: '0 4px 12px var(--color-shadow)',
  }
};

export default Step2_Processing;

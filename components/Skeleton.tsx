'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '8px',
  className = '',
  style = {}
}) => {
  return (
    <div
      className={`skeleton-container ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--color-bg-card)',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      <motion.div
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, var(--color-bg-hover), transparent)',
        }}
      />
    </div>
  );
};

export const StatCardSkeleton: React.FC = () => {
  return (
    <div style={{
      backgroundColor: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flex: 1,
      boxShadow: '0 8px 30px var(--color-shadow)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={32} />
      </div>
      <Skeleton width={48} height={48} borderRadius="12px" />
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Table Header Shimmer */}
      <div style={{ display: 'flex', padding: '16px 24px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-sidebar)', gap: '24px' }}>
        <Skeleton width="15%" height={16} />
        <Skeleton width="25%" height={16} />
        <Skeleton width="20%" height={16} />
        <Skeleton width="15%" height={16} />
        <Skeleton width="15%" height={16} />
      </div>
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', padding: '20px 24px', borderBottom: '1px solid var(--color-border)', gap: '24px', alignItems: 'center' }}>
          <div style={{ width: '15%', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Skeleton width={28} height={28} borderRadius="50%" />
            <Skeleton width="60%" height={14} />
          </div>
          <div style={{ width: '25%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Skeleton width="80%" height={14} />
            <Skeleton width="50%" height={10} />
          </div>
          <div style={{ width: '20%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Skeleton width="90%" height={12} />
            <Skeleton width="60%" height={10} />
          </div>
          <div style={{ width: '15%' }}>
            <Skeleton width="70%" height={14} />
          </div>
          <div style={{ width: '15%', display: 'flex', justifyContent: 'flex-end' }}>
            <Skeleton width={80} height={32} borderRadius="8px" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
      {/* Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Filter Bar Skeleton */}
      <div style={{ display: 'flex', gap: '16px', padding: '20px 24px', backgroundColor: 'var(--color-bg-sidebar)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
        <Skeleton width="40%" height={48} borderRadius="12px" />
        <Skeleton width="15%" height={48} borderRadius="12px" />
        <Skeleton width="15%" height={48} borderRadius="12px" />
        <Skeleton width="15%" height={48} borderRadius="12px" />
      </div>

      {/* Table Section */}
      <div style={{ backgroundColor: 'var(--color-bg-card)', borderRadius: '16px', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 8px 30px var(--color-shadow)' }}>
        <TableSkeleton />
      </div>
    </div>
  );
};

export const AnalyticsSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* 6 KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ padding: '20px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton width="60%" height={12} />
              <Skeleton width={24} height={24} borderRadius="6px" />
            </div>
            <Skeleton width="40%" height={28} />
          </div>
        ))}
      </div>

      {/* Main Grid: 2:1 Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div style={{ padding: '24px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', height: '400px' }}>
          <Skeleton width="30%" height={20} style={{ marginBottom: '24px' }} />
          <Skeleton height={300} />
        </div>
        <div style={{ padding: '24px', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', height: '400px' }}>
          <Skeleton width="50%" height={20} style={{ marginBottom: '24px' }} />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <Skeleton width={180} height={180} borderRadius="50%" />
          </div>
          <Skeleton height={20} style={{ marginBottom: '12px' }} />
          <Skeleton height={20} style={{ marginBottom: '12px' }} />
        </div>
      </div>
    </div>
  );
};

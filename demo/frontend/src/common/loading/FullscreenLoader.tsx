/**
 * FullscreenLoader — center card with matching color glow background
 */
import {useEffect, useState} from 'react';

type Props = {
  loadingStep: number;
};

const STEPS = [
  {icon: '☁️', label: 'Video uploaded',           color: '#22c55e', bg: 'rgba(34,197,94,0.06)'},
  {icon: '🎞',  label: 'Decoding video frames',    color: '#6366f1', bg: 'rgba(99,102,241,0.06)'},
  {icon: '🤖', label: 'Initializing SAM 2',        color: '#8b5cf6', bg: 'rgba(139,92,246,0.06)'},
  {icon: '🎯', label: 'Starting session',           color: '#a78bfa', bg: 'rgba(167,139,250,0.06)'},
];

export default function FullscreenLoader({loadingStep}: Props) {
  const [visible, setVisible]   = useState<number[]>([0]);
  const [done, setDone]         = useState<Set<number>>(new Set());
  const [current, setCurrent]   = useState(0);

  // Step 0 done immediately
  useEffect(() => {
    const t = setTimeout(() => {
      setDone(d => new Set([...d, 0]));
      setCurrent(1);
    }, 500);
    return () => clearTimeout(t);
  }, []);

  // loadingStep 1 → steps 1,2 done
  useEffect(() => {
    if (loadingStep >= 1) {
      setDone(d => new Set([...d, 1, 2]));
      setCurrent(3);
      setVisible([0,1,2,3]);
    }
  }, [loadingStep >= 1]);

  // loadingStep 2 → step 3 done
  useEffect(() => {
    if (loadingStep >= 2) {
      setTimeout(() => {
        setDone(d => new Set([...d, 3]));
      }, 200);
    }
  }, [loadingStep >= 2]);

  const step = STEPS[current] ?? STEPS[0];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      // Background: blurred editor + color tint matching current step
      background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${step.color}18 0%, rgba(12,13,18,0.88) 70%)`,
      backdropFilter: 'blur(6px)',
      transition: 'background 0.6s ease',
    }}>
      <style>{`
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pop     { 0%{transform:scale(0.7)} 60%{transform:scale(1.1)} 100%{transform:scale(1)} }
        @keyframes glow    { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        @keyframes ring    { 0%{transform:rotate(0) scale(1);opacity:0.6} 100%{transform:rotate(360deg) scale(1.08);opacity:0.2} }
      `}</style>

      {/* Ambient glow rings behind card */}
      <div style={{
        position: 'absolute',
        width: 340, height: 340,
        borderRadius: '50%',
        border: `1px solid ${step.color}22`,
        animation: 'ring 4s linear infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: 260, height: 260,
        borderRadius: '50%',
        border: `1px solid ${step.color}33`,
        animation: 'ring 3s linear infinite reverse',
        pointerEvents: 'none',
      }} />

      {/* Center card */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 20,
        padding: '36px 44px',
        background: 'rgba(18,20,26,0.92)',
        border: `1px solid ${step.color}33`,
        borderRadius: 20,
        boxShadow: `0 0 0 1px ${step.color}11, 0 24px 60px rgba(0,0,0,0.5), 0 0 40px ${step.color}11`,
        minWidth: 280,
        maxWidth: 320,
        position: 'relative',
        zIndex: 1,
        transition: 'border-color 0.4s, box-shadow 0.4s',
        animation: 'fadeUp 0.3s ease',
      }}>

        {/* Icon with glow */}
        <div style={{
          width: 60, height: 60, borderRadius: 16,
          background: `linear-gradient(135deg, ${step.color}25, ${step.color}0a)`,
          border: `1px solid ${step.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
          boxShadow: `0 0 20px ${step.color}22`,
          transition: 'all 0.4s ease',
        }}>
          {step.icon}
        </div>

        {/* Label */}
        <div style={{textAlign: 'center'}}>
          <div style={{
            fontSize: 16, fontWeight: 700,
            color: '#F0F2F7',
            letterSpacing: '-0.2px',
            marginBottom: 4,
          }}>
            {step.label}
          </div>
          <div style={{
            fontSize: 11,
            color: done.has(current) ? step.color : 'rgba(240,242,247,0.35)',
            fontWeight: done.has(current) ? 600 : 400,
            transition: 'color 0.3s',
          }}>
            {done.has(current) ? '✓ Complete' : 'Processing...'}
          </div>
        </div>

        {/* Spinner or done */}
        <div style={{height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          {done.has(current) ? (
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: step.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: '#fff', fontWeight: 700,
              animation: 'pop 0.3s ease',
            }}>✓</div>
          ) : (
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              border: `2px solid ${step.color}33`,
              borderTopColor: step.color,
              animation: 'spin 0.7s linear infinite',
            }} />
          )}
        </div>

        {/* Step dots */}
        <div style={{display: 'flex', gap: 6, alignItems: 'center'}}>
          {STEPS.map((s, i) => (
            <div key={i} style={{
              height: 5,
              width: i === current ? 18 : done.has(i) ? 8 : 5,
              borderRadius: 99,
              background: done.has(i)
                ? s.color
                : i === current
                  ? `${s.color}88`
                  : 'rgba(255,255,255,0.1)',
              transition: 'all 0.35s ease',
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

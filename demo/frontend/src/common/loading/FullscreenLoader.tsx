/**
 * FullscreenLoader — center card with matching color glow + real progress
 */
import {sessionAtom} from '@/demo/atoms';
import {INFERENCE_API_ENDPOINT} from '@/demo/DemoConfig';
import {useAtomValue} from 'jotai';
import {useEffect, useRef, useState} from 'react';

type Props = {
  loadingStep: number;
};

const STEPS = [
  {icon: '☁️', label: 'Video uploaded',        color: '#22c55e'},
  {icon: '🎞',  label: 'Decoding frames',       color: '#6366f1'},
  {icon: '🤖', label: 'Initializing SAM 2',     color: '#8b5cf6'},
  {icon: '🎯', label: 'Encoding video frames',  color: '#a78bfa'},
];

export default function FullscreenLoader({loadingStep}: Props) {
  const [done, setDone]       = useState<Set<number>>(new Set());
  const [current, setCurrent] = useState(0);
  const [frameInfo, setFrameInfo] = useState<{loaded:number; total:number} | null>(null);
  const session = useAtomValue(sessionAtom);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Step 0 done immediately
  useEffect(() => {
    const t = setTimeout(() => { setDone(d => new Set([...d, 0])); setCurrent(1); }, 400);
    return () => clearTimeout(t);
  }, []);

  // loadingStep 1 → decode + init done, now session encoding
  useEffect(() => {
    if (loadingStep >= 1) {
      setDone(d => new Set([...d, 1, 2]));
      setCurrent(3);
    }
  }, [loadingStep >= 1]);

  // loadingStep 2 → fully done
  useEffect(() => {
    if (loadingStep >= 2) {
      setDone(d => new Set([...d, 3]));
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [loadingStep >= 2]);

  // Poll session progress when we have a session ID
  useEffect(() => {
    if (!session?.id || loadingStep >= 2) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${INFERENCE_API_ENDPOINT}/session_progress/${session.id}`);
        const d = await r.json();
        if (d.num_frames > 0) {
          setFrameInfo({loaded: d.loaded, total: d.num_frames});
        }
      } catch {}
    }, 1000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [session?.id, loadingStep >= 2]);

  const step = STEPS[current] ?? STEPS[0];

  // Progress 0→1 from frameInfo or step-based estimate
  const progress = frameInfo && frameInfo.total > 0
    ? Math.min(0.99, frameInfo.loaded / frameInfo.total)
    : [0.08, 0.35, 0.65, 0.85][current] ?? 0.08;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${step.color}18 0%, rgba(12,13,18,0.88) 70%)`,
      backdropFilter: 'blur(6px)',
      transition: 'background 0.6s ease',
    }}>
      <style>{`
        @keyframes spin  { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pop   { 0%{transform:scale(0.7)} 60%{transform:scale(1.1)} 100%{transform:scale(1)} }
        @keyframes ring  { 0%{transform:rotate(0) scale(1);opacity:0.6} 100%{transform:rotate(360deg) scale(1.08);opacity:0.2} }
      `}</style>

      {/* Ambient rings */}
      <div style={{position:'absolute',width:340,height:340,borderRadius:'50%',border:`1px solid ${step.color}22`,animation:'ring 4s linear infinite',pointerEvents:'none'}} />
      <div style={{position:'absolute',width:260,height:260,borderRadius:'50%',border:`1px solid ${step.color}33`,animation:'ring 3s linear infinite reverse',pointerEvents:'none'}} />

      {/* Card */}
      <div style={{
        display:'flex',flexDirection:'column',alignItems:'center',gap:18,
        padding:'36px 44px',
        background:'rgba(18,20,26,0.95)',
        border:`1px solid ${step.color}33`,
        borderRadius:20,
        boxShadow:`0 0 0 1px ${step.color}11, 0 24px 60px rgba(0,0,0,0.5)`,
        minWidth:300,maxWidth:340,
        position:'relative',zIndex:1,
        animation:'fadeUp 0.3s ease',
      }}>
        {/* Icon */}
        <div style={{
          width:60,height:60,borderRadius:16,
          background:`linear-gradient(135deg,${step.color}25,${step.color}0a)`,
          border:`1px solid ${step.color}44`,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:28,boxShadow:`0 0 20px ${step.color}22`,
          transition:'all 0.4s ease',
        }}>
          {step.icon}
        </div>

        {/* Label */}
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:16,fontWeight:700,color:'#F0F2F7',letterSpacing:'-0.2px',marginBottom:4}}>
            {step.label}
          </div>
          {/* Frame count */}
          {frameInfo && frameInfo.total > 0 && current === 3 ? (
            <div style={{fontSize:12,color:step.color,fontWeight:600}}>
              Frame {frameInfo.loaded} of {frameInfo.total}
            </div>
          ) : (
            <div style={{fontSize:11,color:done.has(current)?step.color:'rgba(240,242,247,0.35)',fontWeight:done.has(current)?600:400,transition:'color 0.3s'}}>
              {done.has(current) ? '✓ Complete' : 'Processing...'}
            </div>
          )}
        </div>

        {/* Spinner or done */}
        <div style={{height:24,display:'flex',alignItems:'center',justifyContent:'center'}}>
          {done.has(current) ? (
            <div style={{width:24,height:24,borderRadius:'50%',background:step.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#fff',fontWeight:700,animation:'pop 0.3s ease'}}>✓</div>
          ) : (
            <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${step.color}33`,borderTopColor:step.color,animation:'spin 0.7s linear infinite'}} />
          )}
        </div>

        {/* Real progress bar */}
        <div style={{width:'100%',height:3,background:'rgba(255,255,255,0.08)',borderRadius:99,overflow:'hidden'}}>
          <div style={{
            height:'100%',
            width:`${progress*100}%`,
            background:`linear-gradient(90deg,${step.color},${step.color}aa)`,
            borderRadius:99,
            transition:'width 0.8s ease',
          }} />
        </div>

        {/* ETA text for long videos */}
        {frameInfo && frameInfo.total > 500 && current === 3 && (
          <div style={{fontSize:11,color:'rgba(240,242,247,0.3)',textAlign:'center'}}>
            Large video — this may take a few minutes
          </div>
        )}

        {/* Dots */}
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          {STEPS.map((s,i) => (
            <div key={i} style={{height:5,width:i===current?18:done.has(i)?8:5,borderRadius:99,background:done.has(i)?s.color:i===current?`${s.color}88`:'rgba(255,255,255,0.1)',transition:'all 0.35s ease'}} />
          ))}
        </div>
      </div>
    </div>
  );
}

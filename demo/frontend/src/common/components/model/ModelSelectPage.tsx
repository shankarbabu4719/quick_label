/**
 * ModelSelectPage — shown before video upload
 * User selects tiny / small / base_plus model, then proceeds to upload
 */
import {INFERENCE_API_ENDPOINT} from '@/demo/DemoConfig';
import {useState} from 'react';

type ModelId = 'tiny' | 'small' | 'base_plus';

type Model = {
  id: ModelId;
  name: string;
  badge: string;
  badgeColor: string;
  size: string;
  speed: string;
  accuracy: string;
  desc: string;
  icon: string;
  recommended?: boolean;
};

const MODELS: Model[] = [
  {
    id: 'tiny',
    name: 'SAM 2.1 Tiny',
    badge: 'Fastest',
    badgeColor: '#22c55e',
    size: '149 MB',
    speed: '⚡⚡⚡',
    accuracy: '★★☆',
    icon: '🚀',
    desc: 'Best for quick prototyping and testing. Loads fast, low RAM usage. Great for short clips and simple objects.',
  },
  {
    id: 'small',
    name: 'SAM 2.1 Small',
    badge: 'Balanced',
    badgeColor: '#6366f1',
    size: '176 MB',
    speed: '⚡⚡☆',
    accuracy: '★★★',
    icon: '⚖️',
    recommended: true,
    desc: 'Best balance of speed and accuracy. Recommended for most use cases — people, objects, vehicles.',
  },
  {
    id: 'base_plus',
    name: 'SAM 2.1 Base+',
    badge: 'Most Accurate',
    badgeColor: '#f59e0b',
    size: '309 MB',
    speed: '⚡☆☆',
    accuracy: '★★★',
    icon: '🎯',
    desc: 'Highest accuracy for complex scenes, small objects, or fast motion. Requires more RAM and time to load.',
  },
];

type Props = {
  currentModel: string;
  onSelect: (model: ModelId) => void;
};

export default function ModelSelectPage({currentModel, onSelect}: Props) {
  const [selected, setSelected] = useState<ModelId>((currentModel as ModelId) || 'tiny');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleContinue() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${INFERENCE_API_ENDPOINT}/set_model`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({model: selected}),
      });
      if (!r.ok) throw new Error('Failed to set model');
      onSelect(selected);
    } catch (e) {
      setError('Could not switch model. Using current model.');
      onSelect(selected); // proceed anyway
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Section header */}
      <div style={{marginBottom: 20}}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 20, padding: '4px 12px',
          fontSize: 11, fontWeight: 700, color: '#818cf8',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          Step 1 of 2
        </div>
        <h2 style={{
          fontSize: 22, fontWeight: 800,
          color: '#F0F2F7', margin: '0 0 6px',
          letterSpacing: '-0.4px',
        }}>
          Choose AI Model
        </h2>
        <p style={{
          fontSize: 14, color: 'rgba(240,242,247,0.45)',
          margin: 0, lineHeight: 1.5,
        }}>
          Select the model that fits your needs. You can change this later.
        </p>
      </div>

      {/* Model cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 14,
        marginBottom: 20,
      }}>
        {MODELS.map(m => {
          const isSelected = selected === m.id;
          return (
            <div
              key={m.id}
              onClick={() => setSelected(m.id)}
              style={{
                position: 'relative',
                padding: '18px 18px',
                borderRadius: 14,
                border: `2px solid ${isSelected ? m.badgeColor : 'rgba(255,255,255,0.07)'}`,
                background: isSelected
                  ? `linear-gradient(145deg, ${m.badgeColor}0f, ${m.badgeColor}05)`
                  : 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? `0 0 0 1px ${m.badgeColor}22, 0 8px 24px rgba(0,0,0,0.3)` : 'none',
                transform: isSelected ? 'translateY(-2px)' : 'none',
              }}>

              {/* Recommended badge */}
              {m.recommended && (
                <div style={{
                  position: 'absolute', top: -1, right: 14,
                  fontSize: 10, fontWeight: 700,
                  background: m.badgeColor,
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '0 0 6px 6px',
                  letterSpacing: '0.05em',
                }}>
                  RECOMMENDED
                </div>
              )}

              {/* Top row */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${m.badgeColor}18`,
                    border: `1px solid ${m.badgeColor}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                  }}>
                    {m.icon}
                  </div>
                  <div>
                    <div style={{fontSize: 14, fontWeight: 700, color: '#F0F2F7'}}>{m.name}</div>
                    <div style={{
                      fontSize: 10, fontWeight: 700,
                      color: m.badgeColor,
                      letterSpacing: '0.05em',
                    }}>{m.badge}</div>
                  </div>
                </div>

                {/* Radio */}
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: `2px solid ${isSelected ? m.badgeColor : 'rgba(255,255,255,0.2)'}`,
                  background: isSelected ? m.badgeColor : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}>
                  {isSelected && <div style={{width: 6, height: 6, borderRadius: '50%', background: '#fff'}} />}
                </div>
              </div>

              {/* Stats */}
              <div style={{
                display: 'flex', gap: 16,
                marginBottom: 12,
                paddingBottom: 12,
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div>
                  <div style={{fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2}}>SIZE</div>
                  <div style={{fontSize: 12, fontWeight: 600, color: '#F0F2F7'}}>{m.size}</div>
                </div>
                <div>
                  <div style={{fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2}}>SPEED</div>
                  <div style={{fontSize: 12}}>{m.speed}</div>
                </div>
                <div>
                  <div style={{fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2}}>ACCURACY</div>
                  <div style={{fontSize: 12}}>{m.accuracy}</div>
                </div>
              </div>

              {/* Description */}
              <p style={{
                fontSize: 12,
                color: 'rgba(240,242,247,0.45)',
                margin: 0, lineHeight: 1.55,
              }}>
                {m.desc}
              </p>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{
          fontSize: 12, color: '#f87171', marginBottom: 12,
          padding: '8px 12px', background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8,
        }}>
          {error}
        </div>
      )}

      {/* Continue button */}
      <button
        onClick={handleContinue}
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px 20px',
          background: loading
            ? 'rgba(99,102,241,0.4)'
            : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none', borderRadius: 12,
          color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: loading ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8,
          boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
          transition: 'all 0.2s',
          letterSpacing: '-0.1px',
        }}>
        {loading ? (
          <>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              animation: 'spin 0.7s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Loading model...
          </>
        ) : (
          <>Continue with {MODELS.find(m => m.id === selected)?.name} →</>
        )}
      </button>
    </div>
  );
}

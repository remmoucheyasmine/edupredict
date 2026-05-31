import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'http://localhost:5000/api'

// ── Composants visuels ────────────────────────────────────────────────────────

function ScoreBar({ score }) {
  if (score == null) return <span style={{ color: '#ccc' }}>--</span>
  const pct = Math.min(Math.max((score / 20) * 100, 0), 100)
  const color = pct >= 70 ? '#16a34a' : pct >= 50 ? '#ca8a04' : '#dc2626'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 56, height: 5, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{Number(score).toFixed(2)}</span>
    </div>
  )
}

function SegmentBadge({ segment }) {
  if (!segment) return <span style={{ color: '#ccc' }}>--</span>
  const styles = {
    Excellent: { background: '#dcfce7', color: '#15803d' },
    Moyen:     { background: '#fef3c7', color: '#92400e' },
    Faible:    { background: '#fee2e2', color: '#991b1b' },
  }
  const s = styles[segment] || { background: '#f1f5f9', color: '#64748b' }
  return (
    <span style={{
      ...s, padding: '4px 14px', borderRadius: 999,
      fontSize: 13, fontWeight: 700, display: 'inline-block'
    }}>{segment}</span>
  )
}

function StatCard({ label, value, color = '#3b6ef0' }) {
  return (
    <div style={{
      background: '#f8faff', border: '1px solid #e8eef7',
      borderRadius: 12, padding: '14px 18px'
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value ?? '--'}</div>
      <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>{label}</div>
    </div>
  )
}

// ── Section : Scores prédits ──────────────────────────────────────────────────

function SectionPrediction({ enfant }) {
  const [tab, setTab] = useState('T1')

  const T1 = [
    { key: 'moy_math_t1_predit',     label: 'Mathématiques' },
    { key: 'moy_francais_t1_predit', label: 'Français' },
    { key: 'moy_arabe_t1_predit',    label: 'Arabe' },
    { key: 'moy_sciences_t1_predit', label: 'Sciences' },
    { key: 'moy_generale_t1_predit', label: 'Moyenne générale' },
  ]
  const T2 = [
    { key: 'moy_math_t2_predit',     label: 'Mathématiques' },
    { key: 'moy_francais_t2_predit', label: 'Français' },
    { key: 'moy_arabe_t2_predit',    label: 'Arabe' },
    { key: 'moy_sciences_t2_predit', label: 'Sciences' },
    { key: 'moy_generale_t2_predit', label: 'Moyenne générale' },
  ]

  const cols = tab === 'T1' ? T1 : T2
  const segment = tab === 'T1' ? enfant.segment_t1 : enfant.segment_t2
  const moy = tab === 'T1' ? enfant.moy_generale_t1_predit : enfant.moy_generale_t2_predit

  const moyColor = moy == null ? '#888' : moy >= 14 ? '#16a34a' : moy >= 10 ? '#ca8a04' : '#dc2626'

  return (
    <div>
      {/* Onglets T1 / T2 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['T1', 'T2'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: 999, border: 'none',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: tab === t ? '#3b6ef0' : '#f1f5f9',
            color: tab === t ? 'white' : '#64748b',
            transition: 'all .2s'
          }}>
            Scores prédits {t}
          </button>
        ))}
      </div>

      {/* Carte résumé */}
      <div style={{
        background: '#f8faff', border: '1.5px solid #dbeafe',
        borderRadius: 16, padding: '20px 24px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>
            Moyenne générale {tab}
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: moyColor, lineHeight: 1.1, marginTop: 4 }}>
            {moy != null ? Number(moy).toFixed(2) : '--'}
            <span style={{ fontSize: 16, color: '#aaa' }}>/20</span>
          </div>
        </div>
        <div style={{ width: 1, height: 60, background: '#e2e8f0', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
            Segment
          </div>
          <SegmentBadge segment={segment} />
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: '#888', fontStyle: 'italic' }}>
          Prédit par modèle XGBoost
        </div>
      </div>

      {/* Tableau des matières */}
      <div style={{
        background: 'white', border: '1px solid #e8eef7',
        borderRadius: 14, overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8faff', borderBottom: '1px solid #e8eef7' }}>
              <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .05 }}>
                Matière
              </th>
              <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, color: '#3b6ef0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .05 }}>
                Score prédit ★
              </th>
            </tr>
          </thead>
          <tbody>
            {cols.map((c, i) => {
              const isGenerale = c.key.includes('generale')
              return (
                <tr key={c.key} style={{
                  borderBottom: i < cols.length - 1 ? '1px solid #f0f0f0' : 'none',
                  background: isGenerale ? '#f8faff' : 'white'
                }}>
                  <td style={{
                    padding: '13px 20px', fontSize: 14,
                    fontWeight: isGenerale ? 700 : 400,
                    color: '#1a1a2e'
                  }}>
                    {isGenerale ? '📊 ' : ''}{c.label}
                  </td>
                  <td style={{ padding: '13px 20px' }}>
                    <ScoreBar score={enfant[c.key]} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Légende */}
      <div style={{
        marginTop: 16, background: '#f8faff', borderRadius: 12,
        padding: '14px 20px', display: 'flex', gap: 20, flexWrap: 'wrap'
      }}>
       
      </div>
    </div>
  )
}

// ── Section : Informations de l'enfant ───────────────────────────────────────

function SectionProfil({ enfant }) {
  const champs = [
    ['ID Élève',    enfant.id_eleve],
    ['Genre',       enfant.genre === 'M' ? '👨 Masculin' : '👩 Féminin'],
    ['Âge',         enfant.age ? `${enfant.age} ans` : '--'],
    ['Filière',     enfant.filiere],
    ['Échelon socio', enfant.echelon_socio],
    ['Taille classe', enfant.taille_classe ? `${enfant.taille_classe} élèves` : '--'],
    ['Distance (km)', enfant.distance_etablissement_km ? `${enfant.distance_etablissement_km} km` : '--'],
  ]

  return (
    <div style={{
      background: 'white', border: '1px solid #e8eef7',
      borderRadius: 14, padding: '20px 24px'
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 16 }}>
        Informations de l'élève
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {champs.map(([k, v]) => (
          <div key={k} style={{ background: '#f8faff', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600 }}>{k}</div>
            <div style={{ fontWeight: 700, color: '#1a1a2e', marginTop: 2 }}>{v ?? '--'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function DashboardParent() {
  const navigate = useNavigate()
  const stored   = JSON.parse(localStorage.getItem('user') || '{}')
  const user     = stored.user || stored
  const idParent = user.id_parent || user.id

  const [enfants,     setEnfants]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [enfantActif, setEnfantActif] = useState(null)
  const [onglet,      setOnglet]      = useState('prediction')

  const loadEnfants = useCallback(async () => {
    if (!idParent) return
    setLoading(true); setError(null)
    try {
      const res = await axios.get(`${API}/parent/enfants/${idParent}`)
      setEnfants(res.data)
      if (res.data.length && !enfantActif) {
        setEnfantActif(res.data[0].id_eleve)
      }
    } catch (e) {
      setError('Erreur de chargement : ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [idParent])

  useEffect(() => { loadEnfants() }, [loadEnfants])

  const enfant = enfants.find(e => e.id_eleve === enfantActif)

  const moyT1 = enfant?.moy_generale_t1_predit
  const moyT2 = enfant?.moy_generale_t2_predit

  return (
    <div style={{
      minHeight: '100vh', background: '#e8eef7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>

      {/* ── Navbar ── */}
      <div style={{
        background: 'white', borderBottom: '1px solid #f0f0f0',
        padding: '14px 28px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{
            background: 'none', border: 'none', color: '#3b6ef0',
            fontWeight: 600, fontSize: 13, cursor: 'pointer'
          }}>← Retour</button>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>
            Edu<span style={{ color: '#3b6ef0' }}>Predict</span>
          </span>
          <span style={{ fontSize: 13, color: '#aaa' }}>— Espace Parent</span>
        </div>
        <button onClick={() => { localStorage.clear(); window.location.href = '/login' }}
          style={{ background: 'none', border: 'none', color: '#e53e3e', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Se déconnecter
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>

        {/* ── Chargement ── */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
            Chargement...
          </div>
        )}

        {/* ── Erreur ── */}
        {error && (
          <div style={{
            background: '#fee2e2', border: '1px solid #fecaca',
            borderRadius: 12, padding: '16px 20px', color: '#dc2626',
            marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span>{error}</span>
            <button onClick={loadEnfants} style={{
              background: '#dc2626', color: 'white', border: 'none',
              borderRadius: 8, padding: '7px 14px', fontWeight: 700, cursor: 'pointer'
            }}>Réessayer</button>
          </div>
        )}

        {!loading && !error && enfants.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
            👨‍👩‍👧 Aucun enfant associé à ce compte parent.
          </div>
        )}

        {!loading && !error && enfants.length > 0 && (
          <>
            {/* ── Sélection enfant (si plusieurs) ── */}
            {enfants.length > 1 && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
                {enfants.map(e => (
                  <button key={e.id_eleve} onClick={() => { setEnfantActif(e.id_eleve); setOnglet('prediction') }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 20px', borderRadius: 12, cursor: 'pointer',
                      border: enfantActif === e.id_eleve ? '2px solid #3b6ef0' : '2px solid #e8eef7',
                      background: enfantActif === e.id_eleve ? '#eef2ff' : 'white',
                      color: enfantActif === e.id_eleve ? '#3b6ef0' : '#64748b',
                      fontWeight: 700, fontSize: 14
                    }}>
                    {e.genre === 'F' ? '👧' : '👦'}
                    <div style={{ textAlign: 'left' }}>
                      <div>{e.nom_eleve} {e.prenom_eleve}</div>
                      <div style={{ fontSize: 11, fontWeight: 400, opacity: .7 }}>{e.filiere}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {enfant && (
              <>
                {/* ── Carte récap enfant ── */}
                <div style={{
                  background: '#3b6ef0', borderRadius: 18,
                  padding: '24px 28px', marginBottom: 24,
                  display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap'
                }}>
                  <div style={{
                    width: 58, height: 58, borderRadius: 14,
                    background: 'rgba(255,255,255,.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, flexShrink: 0
                  }}>
                    {enfant.genre === 'F' ? '👧' : '👦'}
                  </div>

                  <div style={{ flex: 1, color: 'white' }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {enfant.nom_eleve} {enfant.prenom_eleve}
                    </div>
                    <div style={{ opacity: .75, fontSize: 13, marginTop: 3 }}>
                      {enfant.filiere} · {enfant.age} ans · ID {enfant.id_eleve}
                    </div>
                  </div>

                  {[
                    { label: 'MOY. T1', value: moyT1 != null ? Number(moyT1).toFixed(2) : '--', sub: '/20' },
                    { label: 'MOY. T2', value: moyT2 != null ? Number(moyT2).toFixed(2) : '--', sub: '/20' },
                  ].map(({ label, value, sub }) => (
                    <div key={label} style={{
                      background: 'rgba(255,255,255,.18)', borderRadius: 12,
                      padding: '12px 20px', textAlign: 'center', flexShrink: 0
                    }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', fontWeight: 700, letterSpacing: .5 }}>{label}</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: 'white', lineHeight: 1.1 }}>
                        {value}<span style={{ fontSize: 12, opacity: .7 }}>{sub}</span>
                      </div>
                    </div>
                  ))}

                  <div style={{
                    background: 'rgba(255,255,255,.18)', borderRadius: 12,
                    padding: '12px 20px', textAlign: 'center', flexShrink: 0
                  }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', fontWeight: 700, letterSpacing: .5, marginBottom: 6 }}>SEGMENT</div>
                    <SegmentBadge segment={enfant.segment_t1} />
                  </div>
                </div>

                {/* ── Stats rapides ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
                  <StatCard label="Filière"         value={enfant.filiere}         color="#3b6ef0" />
                  <StatCard label="Âge"             value={`${enfant.age} ans`}    color="#7c3aed" />
                  <StatCard label="Segment T1"      value={enfant.segment_t1}      color={enfant.segment_t1 === 'Excellent' ? '#16a34a' : enfant.segment_t1 === 'Moyen' ? '#ca8a04' : '#dc2626'} />
                  <StatCard label="Segment T2"      value={enfant.segment_t2}      color={enfant.segment_t2 === 'Excellent' ? '#16a34a' : enfant.segment_t2 === 'Moyen' ? '#ca8a04' : '#dc2626'} />
                </div>

                {/* ── Onglets ── */}
                <div style={{
                  display: 'flex', background: 'white',
                  borderRadius: 12, padding: 4, marginBottom: 20,
                  border: '1px solid #e8eef7', gap: 4
                }}>
                  {[
                    { key: 'prediction', label: '📊 Scores prédits' },
                    { key: 'profil',     label: '👤 Profil' },
                  ].map(t => (
                    <button key={t.key} onClick={() => setOnglet(t.key)} style={{
                      flex: 1, padding: '9px 16px', borderRadius: 9, border: 'none',
                      fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .2s',
                      background: onglet === t.key ? '#3b6ef0' : 'transparent',
                      color: onglet === t.key ? 'white' : '#64748b',
                    }}>{t.label}</button>
                  ))}
                </div>

                {/* ── Contenu onglet ── */}
                <div style={{ background: 'white', borderRadius: 16, padding: '24px', border: '1px solid #e8eef7' }}>
                  {onglet === 'prediction' && <SectionPrediction enfant={enfant} />}
                  {onglet === 'profil'     && <SectionProfil     enfant={enfant} />}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'

const API = 'http://localhost:5000/api'

async function apiFetch(path) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── Utilitaires ──────────────────────────────────────────────────────────────
const scoreColor = s => s >= 80 ? '#10b981' : s >= 60 ? '#3b82f6' : s >= 40 ? '#f59e0b' : '#ef4444'
const scoreLabel = s => s >= 80 ? 'Excellent' : s >= 60 ? 'Bien' : s >= 40 ? 'Passable' : 'Insuffisant'
const resultBadge = r => ({
  Distinction: { bg: '#d1fae5', color: '#059669', label: 'Distinction' },
  Pass:        { bg: '#dbeafe', color: '#2563eb', label: 'Admis'       },
  Fail:        { bg: '#fee2e2', color: '#dc2626', label: 'Échoué'      },
  Withdrawn:   { bg: '#f3f4f6', color: '#6b7280', label: 'Retiré'      },
}[r] || { bg: '#dbeafe', color: '#2563eb', label: r || '–' })

// ── Composants ───────────────────────────────────────────────────────────────
function Spinner({ size = 20, color = '#6366f1' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `3px solid #e2e8f0`, borderTop: `3px solid ${color}`,
      borderRadius: '50%', display: 'inline-block',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

const Badge = ({ label, bg, color, size = 12 }) => (
  <span style={{ background: bg, color, fontWeight: 700, fontSize: size,
    padding: '3px 10px', borderRadius: 999 }}>{label}</span>
)

const ScoreBar = ({ score }) => (
  <div style={{ background: '#f1f5f9', borderRadius: 999, height: 6, flex: 1, overflow: 'hidden' }}>
    <div style={{ height: '100%', width: `${Math.min(score, 100)}%`,
      background: scoreColor(score), borderRadius: 999, transition: 'width .7s ease' }} />
  </div>
)

const StatCard = ({ label, value, sub, color = '#6366f1' }) => (
  <div style={{ background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: 14, padding: '18px 20px', borderTop: `3px solid ${color}` }}>
    <div style={{ fontSize: 24, fontWeight: 900, color }}>{value}</div>
    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginTop: 2 }}>{label}</div>
    {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
  </div>
)

// ── Hook données ─────────────────────────────────────────────────────────────
function useNotes(idEnseignant) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    if (!idEnseignant) return
    setLoading(true); setError(null)
    try {
      const rows = await apiFetch(`/enseignant/notes/${idEnseignant}`)
      setData(rows)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [idEnseignant])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

// ── Vue détail étudiant ───────────────────────────────────────────────────────
function StudentDetail({ student, notes, onClose }) {
  const badge = resultBadge(student.final_result)
  const moyenne = notes.length
    ? notes.reduce((s, n) => s + Number(n.score), 0) / notes.length
    : 0

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: 32,
        width: '100%', maxWidth: 620, maxHeight: '85vh',
        overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)'
      }} onClick={e => e.stopPropagation()}>

        {/* En-tête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>
              {student.gender === 'F' ? '👧' : '👦'} Étudiant #{student.id_student}
            </div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
              {student.code_module} · {student.code_presentation} · {student.age_band}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: '#f1f5f9', border: 'none', borderRadius: 10,
            width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: '#64748b'
          }}>✕</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard label="Moyenne" value={`${moyenne.toFixed(1)}/100`} color="#6366f1" />
          <StatCard label="Évaluations" value={notes.length} color="#8b5cf6" />
          <StatCard label="Résultat final" value={
            <Badge label={badge.label} bg={badge.bg} color={badge.color} size={13} />
          } color="#10b981" />
        </div>

        {/* Liste des notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notes.map((n, i) => (
            <div key={i} style={{
              background: '#f8fafc', borderRadius: 12, padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 14
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 10, flexShrink: 0,
                background: scoreColor(n.score) + '18',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: scoreColor(n.score) }}>
                  {Number(n.score).toFixed(0)}
                </span>
                <span style={{ fontSize: 9, color: scoreColor(n.score), opacity: .7 }}>/100</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                    {n.assessment_type}
                  </span>
                  <Badge label={scoreLabel(n.score)}
                    bg={scoreColor(n.score) + '18'} color={scoreColor(n.score)} />
                  {n.is_banked === 1 &&
                    <Badge label="⚠ Banked" bg="#fef9c3" color="#ca8a04" />}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  Soumis : jour {n.date_submitted}
                  {n.date_evaluation != null && <> · Éval : jour {n.date_evaluation}</>}
                </div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ScoreBar score={n.score} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function DashboardEnseignant() {
  const stored      = JSON.parse(localStorage.getItem('user') || '{}')
  const idEnseignant = stored.id_enseignant || stored.id

  const { data: notes, loading, error, reload } = useNotes(idEnseignant)
  const [search,   setSearch]   = useState('')
  const [filterResult, setFilterResult] = useState('tous')
  const [selectedStudent, setSelectedStudent] = useState(null)

  // Regrouper les notes par étudiant
  const studentMap = notes.reduce((acc, n) => {
    if (!acc[n.id_student]) {
      acc[n.id_student] = {
        id_student: n.id_student, gender: n.gender,
        age_band: n.age_band, highest_education: n.highest_education,
        studied_credits: n.studied_credits, final_result: n.final_result,
        code_module: n.code_module, code_presentation: n.code_presentation,
        notes: []
      }
    }
    acc[n.id_student].notes.push(n)
    return acc
  }, {})

  const students = Object.values(studentMap).map(s => ({
    ...s,
    moyenne: s.notes.reduce((sum, n) => sum + Number(n.score), 0) / (s.notes.length || 1)
  }))

  // Filtres
  const filtered = students.filter(s => {
    const matchSearch = String(s.id_student).includes(search)
    const matchResult = filterResult === 'tous' || s.final_result === filterResult
    return matchSearch && matchResult
  })

  // Stats globales
  const moyenneGlobale = students.length
    ? students.reduce((s, st) => s + st.moyenne, 0) / students.length : 0
  const repartition = ['Pass', 'Distinction', 'Fail', 'Withdrawn'].reduce((acc, r) => {
    acc[r] = students.filter(s => s.final_result === r).length
    return acc
  }, {})

  const enseignantInfo = stored

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc',
      fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Navbar */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🎓</span>
          <span style={{ fontWeight: 900, fontSize: 20 }}>
            Edu<span style={{ color: '#6366f1' }}>Predict</span>
          </span>
          <span style={{ color: '#94a3b8', fontSize: 14, marginLeft: 8 }}>
            — Espace Enseignant
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>
            👤 {enseignantInfo.prenom_enseignat} {enseignantInfo.nom_enseignat}
          </span>
          <button onClick={() => {
            localStorage.clear(); window.location.href = '/login'
          }} style={{ border: 'none', background: 'none',
            color: '#ef4444', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            Se déconnecter
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px' }}>

        {/* Titre */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', margin: 0 }}>
            Notes de mes étudiants
          </h1>
          <p style={{ color: '#64748b', marginTop: 6, fontSize: 13 }}>
            Données issues de <code style={{ background: '#eef2ff', color: '#6366f1',
              padding: '2px 6px', borderRadius: 4 }}>enseignant_cours</code> ×{' '}
            <code style={{ background: '#eef2ff', color: '#6366f1',
              padding: '2px 6px', borderRadius: 4 }}>studentInfo</code> ×{' '}
            <code style={{ background: '#eef2ff', color: '#6366f1',
              padding: '2px 6px', borderRadius: 4 }}>studentAssessment</code>
          </p>
        </div>

        {/* Chargement */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Spinner size={40} />
            <div style={{ marginTop: 16, color: '#94a3b8' }}>
              Chargement des notes…
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 12, padding: '16px 20px', color: '#dc2626',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>⚠ Erreur</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>{error}</div>
            </div>
            <button onClick={reload} style={{
              background: '#dc2626', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer'
            }}>Réessayer</button>
          </div>
        )}

        {!loading && !error && students.length > 0 && (
          <>
            {/* Stats globales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
              gap: 14, marginBottom: 28 }}>
              <StatCard label="Total étudiants" value={students.length}
                sub={`${notes.length} évaluations`} color="#6366f1" />
              <StatCard label="Moyenne générale" value={`${moyenneGlobale.toFixed(1)}/100`}
                color="#8b5cf6" />
              <StatCard label="Taux de réussite"
                value={`${Math.round(((repartition.Pass||0)+(repartition.Distinction||0))/students.length*100)}%`}
                sub={`${(repartition.Pass||0)+(repartition.Distinction||0)} admis`}
                color="#10b981" />
              <StatCard label="Échecs"
                value={repartition.Fail || 0}
                sub={`${repartition.Withdrawn || 0} retirés`}
                color="#ef4444" />
            </div>

            {/* Barre de résultats */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: 14, padding: '18px 24px', marginBottom: 24,
              display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#64748b', fontSize: 13 }}>
                Répartition :
              </span>
              {[
                { key: 'Distinction', label: 'Distinction', bg: '#d1fae5', color: '#059669' },
                { key: 'Pass',        label: 'Admis',       bg: '#dbeafe', color: '#2563eb' },
                { key: 'Fail',        label: 'Échoués',     bg: '#fee2e2', color: '#dc2626' },
                { key: 'Withdrawn',   label: 'Retirés',     bg: '#f3f4f6', color: '#6b7280' },
              ].map(({ key, label, bg, color }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Badge label={label} bg={bg} color={color} />
                  <span style={{ fontWeight: 800, color, fontSize: 15 }}>
                    {repartition[key] || 0}
                  </span>
                </div>
              ))}
            </div>

            {/* Filtres */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <input
                placeholder="🔍 Rechercher par ID étudiant…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200, padding: '10px 16px',
                  border: '1px solid #e2e8f0', borderRadius: 10,
                  fontSize: 14, outline: 'none', background: '#fff' }}
              />
              <select value={filterResult} onChange={e => setFilterResult(e.target.value)}
                style={{ padding: '10px 16px', border: '1px solid #e2e8f0',
                  borderRadius: 10, fontSize: 14, background: '#fff', cursor: 'pointer' }}>
                <option value="tous">Tous les résultats</option>
                <option value="Pass">Admis</option>
                <option value="Distinction">Distinction</option>
                <option value="Fail">Échoués</option>
                <option value="Withdrawn">Retirés</option>
              </select>
            </div>

            {/* Tableau étudiants */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['Étudiant', 'Module', 'Évaluations', 'Moyenne', 'Résultat', 'Détail'].map(h => (
                      <th key={h} style={{ padding: '13px 16px', textAlign: 'left',
                        fontWeight: 700, color: '#64748b', fontSize: 12,
                        textTransform: 'uppercase', letterSpacing: .5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => {
                    const badge = resultBadge(s.final_result)
                    return (
                      <tr key={s.id_student} style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                        background: i % 2 === 0 ? '#fff' : '#fafafa',
                        transition: 'background .15s'
                      }}>
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10,
                              background: '#eef2ff', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', fontSize: 18
                            }}>
                              {s.gender === 'F' ? '👧' : '👦'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#1e293b' }}>
                                #{s.id_student}
                              </div>
                              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                {s.age_band}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '13px 16px', color: '#64748b' }}>
                          <div style={{ fontWeight: 600 }}>{s.code_module}</div>
                          <div style={{ fontSize: 12 }}>{s.code_presentation}</div>
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <Badge label={`${s.notes.length} éval.`}
                            bg="#f1f5f9" color="#64748b" />
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontWeight: 800, fontSize: 15,
                              color: scoreColor(s.moyenne), minWidth: 40 }}>
                              {s.moyenne.toFixed(1)}
                            </span>
                            <div style={{ width: 80 }}>
                              <ScoreBar score={s.moyenne} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <Badge label={badge.label} bg={badge.bg} color={badge.color} />
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <button onClick={() => setSelectedStudent(s)} style={{
                            background: '#eef2ff', color: '#6366f1',
                            border: 'none', borderRadius: 8,
                            padding: '7px 14px', fontWeight: 700,
                            cursor: 'pointer', fontSize: 13
                          }}>
                            Voir notes →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div style={{ padding: '48px 24px', textAlign: 'center',
                  color: '#94a3b8', fontWeight: 500 }}>
                  Aucun étudiant trouvé
                </div>
              )}
            </div>
          </>
        )}

        {!loading && !error && students.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 14, padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
            <div style={{ color: '#64748b', fontWeight: 500, fontSize: 16 }}>
              Aucun étudiant trouvé pour vos modules
            </div>
          </div>
        )}
      </div>

      {/* Modal détail étudiant */}
      {selectedStudent && (
        <StudentDetail
          student={selectedStudent}
          notes={selectedStudent.notes}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  )
}
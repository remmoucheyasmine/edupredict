import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

// ── Colonnes prédites à afficher ───────────────────────────────────────
const T1_COLS = [
  { key: 'moy_math_t1_predit',     label: 'Math T1' },
  { key: 'moy_francais_t1_predit', label: 'Français T1' },
  { key: 'moy_arabe_t1_predit',    label: 'Arabe T1' },
  { key: 'moy_sciences_t1_predit', label: 'Sciences T1' },
  { key: 'moy_generale_t1_predit', label: 'Moy. T1' },
]
const T2_COLS = [
  { key: 'moy_math_t2_predit',     label: 'Math T2' },
  { key: 'moy_francais_t2_predit', label: 'Français T2' },
  { key: 'moy_arabe_t2_predit',    label: 'Arabe T2' },
  { key: 'moy_sciences_t2_predit', label: 'Sciences T2' },
  { key: 'moy_generale_t2_predit', label: 'Moy. T2' },
]
const EMPTY_FORM = {
  nom_eleve: '',
  prenom_eleve: '',
  genre: 'M',
  age: '',
  filiere: '',

  echelon_socio: '',
  taille_classe: '',
  distance_etablissement_km: '',

  tendance_notes: '',
  nb_absences_s1_s8: '',
  nb_absences_s9_s16: '',
  nb_absences_total: '',
  taux_absences_inj: '',
  note_quiz_moy: ''
}

// ── Mini barre de score /20 ────────────────────────────────────────────
function ScoreBar({ score }) {
  if (score == null) return <span className="text-gray-300">--</span>
  const pct = Math.min(Math.max((score / 20) * 100, 0), 100)
  const color = pct >= 70 ? '#16a34a' : pct >= 50 ? '#ca8a04' : '#dc2626'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 52, height: 5, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color }}>{Number(score).toFixed(2)}</span>
    </div>
  )
}

// ── Badge segment ──────────────────────────────────────────────────────
function SegmentBadge({ segment }) {
  if (!segment) return <span className="text-gray-300">--</span>
  const cls
  = segment === 'Excellent'
    ? 'bg-green-100 text-green-700'
    : segment === 'Moyen'
    ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-700'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{segment}</span>
}

export default function DashboardAdminStudent() {
  const navigate = useNavigate()

  const [students,   setStudents]   = useState([])
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [search,     setSearch]     = useState('')
  const [searchInput,setSearchInput]= useState('')
  const [page,       setPage]       = useState(1)
  const PAGE_SIZE = 50

  // Onglet T1 / T2 pour les colonnes prédites
  const [predTab, setPredTab] = useState('T1')

  const [editStudent, setEditStudent] = useState(null)
  const [showCreate,  setShowCreate]  = useState(false)
  const [newForm,     setNewForm]     = useState(EMPTY_FORM)

  const [message,  setMessage]  = useState('')
  const [msgType,  setMsgType]  = useState('success')
  const [loading,  setLoading]  = useState(false)
  const [recalcId, setRecalcId] = useState(null)   // spinner par ligne

  const notify = (msg, type = 'success') => {
    setMessage(msg); setMsgType(type)
    setTimeout(() => setMessage(''), 4000)
  }

  // ─────────────────────────────────────────────
  // LOAD
  // ─────────────────────────────────────────────
  const loadStudents = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/students', {
        params: { page, limit: PAGE_SIZE, search }
      })
  console.log(res.data.data[1])


      setStudents(res.data.data || [])
      setTotal(res.data.total || 0)
      setTotalPages(res.data.totalPages || 1)
    } catch {
      notify('Erreur lors du chargement.', 'error')
    }
  }, [page, search])

  useEffect(() => { loadStudents() }, [loadStudents])

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // ─────────────────────────────────────────────
  // EDIT + RECALCUL
  // ─────────────────────────────────────────────
  const handleEdit = async () => {
  try {
    setRecalcId(editStudent.id_eleve)

    // 1. UPDATE DB (Node / server.js)
    await axios.put(
      `http://localhost:5000/api/admin/students/${editStudent.id_eleve}`,
      editStudent
    )

    // 2. 🔥 RE-CALCUL ML (Flask server.py)
    const res = await fetch("http://localhost:5001/update-student", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id_eleve: editStudent.id_eleve,
        updates: {
          genre: editStudent.genre,
          age: editStudent.age,
          filiere: editStudent.filiere,
          echelon_socio: editStudent.echelon_socio,
          taille_classe: editStudent.taille_classe,
          distance_etablissement_km: editStudent.distance_etablissement_km,
          tendance_notes: editStudent.tendance_notes,
          nb_absences_s1_s8: editStudent.nb_absences_s1_s8,
          nb_absences_s9_s16: editStudent.nb_absences_s9_s16,
          nb_absences_total: editStudent.nb_absences_total,
          taux_absences_inj: editStudent.taux_absences_inj,
          note_quiz_moy: editStudent.note_quiz_moy
        }
      })
    })

    const data = await res.json()

    // 3. UPDATE UI AVEC NOUVELLES PRÉDICTIONS
    setStudents(prev =>
      prev.map(s =>
        s.id_eleve === editStudent.id_eleve
          ? {
              ...s,
              ...editStudent,
              ...(data.predictions || {}),
              segment: data.segment
            }
          : s
      )
    )

    notify("✅ Étudiant modifié + recalcul effectué")
    setEditStudent(null)

  } catch (err) {
    notify("Erreur lors de la modification", "error")
  } finally {
    setRecalcId(null)
  }
}
  // ─────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────
  const handleCreate = async () => {
    setLoading(true)
    try {
      await axios.post('http://localhost:5000/api/admin/students', newForm)
      notify('✅ Étudiant créé avec succès')
      setShowCreate(false); setNewForm(EMPTY_FORM)
      loadStudents()


    } catch (err) {
      notify(err.response?.data?.error || 'Erreur création.', 'error')
    } finally { setLoading(false) }
  }

  // ─────────────────────────────────────────────
  // MODAL GÉNÉRIQUE
  // ─────────────────────────────────────────────
  const FormModal = ({ form, setForm, onSubmit, onCancel, title, submitLabel, submitColor = 'blue', isLoading }) => (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-8">
        <h2 className="text-lg font-bold mb-5">🎓 {title}</h2>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { field: 'nom_eleve',    label: 'Nom' },
            { field: 'prenom_eleve', label: 'Prénom' },
            { field: 'age',          label: 'Âge', type: 'number' },
            { field: 'filiere',      label: 'Filière' },
            { field: 'echelon_socio',label: 'Échelon socio', type: 'number' },
            { field: 'taille_classe',label: 'Taille classe', type: 'number' },
            { field: 'distance_etablissement_km', label: 'Distance (km)', type: 'number' },
          ].map(({ field, label, type = 'text' }) => (
            <label key={field} className="flex flex-col gap-1">
              <span className="text-gray-500 text-xs">{label}</span>
              <input
                type={type}
                value={form[field] ?? ''}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                className="border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </label>
          ))}

          <label className="flex flex-col gap-1">
            <span className="text-gray-500 text-xs">Genre</span>
            <select
              value={form.genre ?? 'M'}
              onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
              className="border rounded-lg px-3 py-1.5 focus:outline-none"
            >
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </label>
        </div>

        {/* Champs évaluation */}
        <p className="text-xs font-semibold text-gray-400 mt-5 mb-2 uppercase tracking-wider">
  Données académiques
</p>

<div className="grid grid-cols-3 gap-3 text-sm">

  {[
    { field: 'note_quiz_moy', label: 'Moyenne Quiz' },

    { field: 'tendance_notes', label: 'Tendance Notes' },

    { field: 'nb_absences_s1_s8', label: 'Absences S1-S8' },

    { field: 'nb_absences_s9_s16', label: 'Absences S9-S16' },

    { field: 'nb_absences_total', label: 'Absences Totales' },

    { field: 'taux_absences_inj', label: 'Taux Absences Injustifiées' }

  ].map(({ field, label }) => (

    <label key={field} className="flex flex-col gap-1">
      <span className="text-gray-500 text-xs">
        {label}
      </span>

      <input
        type="number"
        step="0.01"
        value={form[field] ?? ''}
        onChange={e =>
          setForm(f => ({
            ...f,
            [field]: e.target.value
          }))
        }
        className="border rounded-lg px-3 py-1.5"
      />
    </label>

  ))}
</div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onSubmit} disabled={isLoading}
            className={`flex-1 text-white rounded-lg py-2 text-sm font-medium bg-${submitColor}-500 hover:bg-${submitColor}-600 disabled:opacity-60`}
          >
            {isLoading ? '⏳ En cours...' : submitLabel}
          </button>
          <button onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg py-2 text-sm">
            Annuler
          </button>
        </div>
      </div>
    </div>
  )

  // Colonnes prédites selon l'onglet actif
  const activePredCols = predTab === 'T1' ? T1_COLS : T2_COLS

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <div className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard/admin')}
            className="text-sm text-blue-500 hover:underline">← Retour</button>
          <h1 className="text-xl font-bold">
            Edu<span className="text-blue-500">Predict</span>
            <span className="text-gray-400 font-normal text-sm ml-3">— Gestion des Étudiants</span>
          </h1>
        </div>
        <button onClick={() => { localStorage.clear(); window.location.href = '/login' }}
          className="text-sm text-red-500 hover:underline">Se déconnecter</button>
      </div>

      <div className="max-w-full mx-auto px-6 py-8">

        {/* MESSAGE */}
        {message && (
          <div className={`rounded-lg px-4 py-3 mb-6 text-sm ${msgType === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {message}
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Étudiants', value: total },
            { label: 'Excellent', value: students.filter(s => s.segment === 'Excellent').length },
            { label: 'Moyen',     value: students.filter(s => s.segment === 'Moyen').length },
            { label: 'Faible',    value: students.filter(s => s.segment === 'Faible').length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xl font-bold">{value}</p>
              <p className="text-gray-500 text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <input
            type="text" placeholder="🔍 Rechercher..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="border rounded-lg px-4 py-2 text-sm flex-1 min-w-48"
          />
          <button onClick={() => { setShowCreate(true); setNewForm(EMPTY_FORM) }}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg">
            + Ajouter
          </button>
          <button onClick={async () => {
            const r = await axios.post('http://localhost:5000/api/admin/reload-predictions')
            notify(`✅ ${r.data.total} scores rechargés depuis le fichier XLSX`)
            loadStudents()
          }}
            className="bg-indigo-50 text-indigo-600 border border-indigo-200 text-sm px-4 py-2 rounded-lg">
            🔄 Recharger scores
          </button>
        </div>

        {/* ONGLET T1 / T2 */}
        <div className="flex gap-2 mb-4">
          {['T1', 'T2'].map(t => (
            <button key={t}
              onClick={() => setPredTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition
                ${predTab === t ? 'bg-blue-500 text-white' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}>
              Scores prédits {t}
            </button>
          ))}
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Prénom</th>
                <th className="px-4 py-3 text-left">Genre</th>
                <th className="px-4 py-3 text-left">Âge</th>
                <th className="px-4 py-3 text-left">Filière</th>
          
                {/* Colonnes _predit dynamiques */}
                {activePredCols.map(c => (
                  <th key={c.key} className="px-4 py-3 text-left bg-blue-50 text-blue-600">{c.label} ★</th>
                ))}
                <th className="px-4 py-3 text-left">Segment</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.length > 0 ? students.map((s, i) => (
                <tr key={`${s.id_eleve}-${s.periode}-${i}`}
                  className={`hover:bg-gray-50 transition ${recalcId === s.id_eleve ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{s.id_eleve}</td>
                  <td className="px-4 py-3 font-medium">{s.nom_eleve}</td>
                  <td className="px-4 py-3">{s.prenom_eleve}</td>
                  <td className="px-4 py-3">{s.genre === 'M' ? '👨' : '👩'} {s.genre}</td>
                  <td className="px-4 py-3">{s.age}</td>
                  <td className="px-4 py-3">{s.filiere}</td>
                  
                  
                  
                  {/* Scores prédits T1 ou T2 */}
                  {activePredCols.map(c => (
                    <td key={c.key} className="px-4 py-3 bg-blue-50">
                      <ScoreBar score={s[c.key]} />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <SegmentBadge segment={
    predTab === 'T1'
      ? s.segment_t1
      : s.segment_t2
  } />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditStudent({ ...s })}
                      className="text-xs text-blue-500 hover:underline mr-2">
                      ✏️ Modifier
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="20" className="text-center py-10 text-gray-400">Aucun étudiant trouvé</td></tr>
              )}
            </tbody>
          </table>

          {/* PAGINATION */}
          <div className="flex items-center justify-between px-6 py-3 border-t text-sm text-gray-500">
            <span>{total.toLocaleString()} étudiant(s) • page {page}/{totalPages}</span>
            <div className="flex gap-2">
              {[
                { label: '«', action: () => setPage(1),             disabled: page === 1 },
                { label: '←', action: () => setPage(p => Math.max(1, p - 1)), disabled: page === 1 },
                { label: '→', action: () => setPage(p => Math.min(totalPages, p + 1)), disabled: page === totalPages },
                { label: '»', action: () => setPage(totalPages),    disabled: page === totalPages },
              ].map(({ label, action, disabled }) => (
                <button key={label} onClick={action} disabled={disabled}
                  className="px-3 py-1 rounded-lg border hover:bg-gray-50 disabled:opacity-40 transition">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editStudent && (
        <FormModal
          form={editStudent} setForm={setEditStudent}
          onSubmit={handleEdit} onCancel={() => setEditStudent(null)}
          title="Modifier l'étudiant" submitLabel="Enregistrer"
          submitColor="blue" isLoading={recalcId === editStudent?.id_eleve}
        />
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <FormModal
          form={newForm} setForm={setNewForm}
          onSubmit={handleCreate} onCancel={() => { setShowCreate(false); setNewForm(EMPTY_FORM) }}
          title="Ajouter un étudiant" submitLabel="Créer"
          submitColor="green" isLoading={loading}
        />
      )}
    </div>
  )
}

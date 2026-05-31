import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const ROLE_COLORS = {
  administrateur: 'bg-purple-100 text-purple-700',
  enseignant:     'bg-blue-100 text-blue-700',
  parent:         'bg-green-100 text-green-700',
}

const EMPTY_FORM = { nom: '', prenom: '', email: '', password: '' }

export default function DashboardAdmin() {

  const navigate = useNavigate()

  const [users,      setUsers]      = useState([])
  const [search,     setSearch]     = useState('')
  const [filterRole, setFilterRole] = useState('tous')
  const [editUser,   setEditUser]   = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newForm,    setNewForm]    = useState(EMPTY_FORM)
  const [message,    setMessage]    = useState('')
  const [msgType,    setMsgType]    = useState('success')
  const [loading,    setLoading]    = useState(false)

  const notify = (msg, type = 'success') => {
    setMessage(msg)
    setMsgType(type)
    setTimeout(() => setMessage(''), 4000)
  }

  const loadUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/users')
      setUsers(res.data)
    } catch {
      notify('Erreur lors du chargement des utilisateurs.', 'error')
    }
  }

  useEffect(() => { loadUsers() }, [])

  const filtered = users.filter(u => {
    const matchRole   = filterRole === 'tous' || u.role === filterRole
    const matchSearch = `${u.nom} ${u.prenom} ${u.email}`
                        .toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  const handleDelete = async (role, id) => {
    if (!window.confirm('Confirmer la suppression ?')) return
    try {
      await axios.delete(`http://localhost:5000/api/admin/users/${role}/${id}`)
      notify('✅ Utilisateur supprimé')
      loadUsers()
    } catch {
      notify('Erreur lors de la suppression.', 'error')
    }
  }

  const handleEdit = async () => {
    try {
      await axios.put(
        `http://localhost:5000/api/admin/users/${editUser.role}/${editUser.id}`,
        { nom: editUser.nom, prenom: editUser.prenom, email: editUser.email }
      )
      notify('✅ Utilisateur modifié')
      setEditUser(null)
      loadUsers()
    } catch {
      notify('Erreur lors de la modification.', 'error')
    }
  }

const handleCreate = async () => {
  if (!newForm.nom || !newForm.prenom || !newForm.email || !newForm.password) {
    notify('Veuillez remplir tous les champs.', 'error')
    return
  }

  setLoading(true)

  try {

    if (showCreate === 'admin') {

      await axios.post(
        'http://localhost:5000/api/register',
        { ...newForm, role: 'administrateur' }
      )

      notify('✅ Administrateur créé avec succès')

    } else {

      await axios.post(
        'http://localhost:5000/api/register',
        { ...newForm, role: 'enseignant' }
      )

      notify('✅ Enseignant créé avec succès')
    }

    setShowCreate(false)
    setNewForm(EMPTY_FORM)
    loadUsers()

  } catch (err) {

    notify(
      err.response?.data?.error || 'Erreur lors de la création.',
      'error'
    )

  } finally {
    setLoading(false)
  }
}

  const modalConfig = {
    admin:      { title: 'Créer un Administrateur', icon: '🛡️', color: 'purple' },
    enseignant: { title: 'Créer un Enseignant',     icon: '📚', color: 'blue'   },
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <div className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">
          Edu<span className="text-blue-500">Predict</span>
          <span className="text-gray-400 font-normal text-sm ml-3">
            — Dashboard Administrateur
          </span>
        </h1>
        <button
          onClick={() => { localStorage.clear(); window.location.href = '/login' }}
          className="text-sm text-red-500 hover:underline">
          Se déconnecter
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* MESSAGE */}
        {message && (
          <div className={`rounded-lg px-4 py-3 mb-6 text-sm flex justify-between items-center
            ${msgType === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {message}
            <button onClick={() => setMessage('')} className="ml-4 opacity-50 hover:opacity-100">✕</button>
          </div>
        )}

        {/* STATS + RACCOURCI ÉTUDIANTS côte à côte */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Administrateurs', role: 'administrateur', icon: '🛡️' },
            { label: 'Enseignants',     role: 'enseignant',     icon: '👨‍🏫' },
            { label: 'Parents',         role: 'parent',         icon: '👨‍👩‍👧' },
          ].map(({ label, role, icon }) => (
            <div key={role} className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
              <span className="text-3xl">{icon}</span>
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.role === role).length}</p>
                <p className="text-gray-500 text-sm">{label}</p>
              </div>
            </div>
          ))}

          {/* ✅ Bouton Gestion Étudiants — 4e carte, aligné avec les stats */}
          <button
            onClick={() => navigate('/dashboard/admin/students')}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-sm p-5
                       flex items-center gap-4 transition group text-left"
          >
            <span className="text-3xl">🎓</span>
            <div>
              <p className="font-bold text-base leading-tight">Gestion des</p>
              <p className="font-bold text-base leading-tight">Étudiants</p>
              <p className="text-blue-200 text-xs mt-1 group-hover:text-white transition">
                Voir la liste →
              </p>
            </div>
          </button>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text" placeholder="🔍 Rechercher..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-4 py-2 text-sm flex-1 min-w-48
                       focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <select
            value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="border rounded-lg px-4 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="tous">Tous les rôles</option>
            <option value="administrateur">Administrateur</option>
            <option value="enseignant">Enseignant</option>
            <option value="parent">Parent</option>
          </select>
          <button
            onClick={() => { setShowCreate('enseignant'); setNewForm(EMPTY_FORM) }}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg transition">
            + Créer un Enseignant
          </button>
          <button
            onClick={() => { setShowCreate('admin'); setNewForm(EMPTY_FORM) }}
            className="bg-purple-500 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded-lg transition">
            + Créer un Admin
          </button>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Nom</th>
                <th className="px-6 py-3 text-left">Prénom</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Rôle</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u, i) => (
                <tr key={i} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium">{u.nom}</td>
                  <td className="px-6 py-4">{u.prenom}</td>
                  <td className="px-6 py-4 text-gray-500">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button
                      onClick={() => setEditUser({ ...u })}
                      className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded-lg text-xs transition">
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(u.role, u.id)}
                      className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-lg text-xs transition">
                      🗑️ Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-400">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL MODIFIER */}
      {editUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
            <h2 className="text-lg font-bold mb-4">Modifier l'utilisateur</h2>
            {['nom', 'prenom', 'email'].map(field => (
              <input key={field}
                type={field === 'email' ? 'email' : 'text'}
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                value={editUser[field]}
                onChange={e => setEditUser({ ...editUser, [field]: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-sm mb-3
                           focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            ))}
            <div className="flex gap-3 mt-2">
              <button onClick={handleEdit}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2 text-sm transition">
                Enregistrer
              </button>
              <button onClick={() => setEditUser(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg py-2 text-sm transition">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉER */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">{modalConfig[showCreate].icon}</span>
              <h2 className="text-lg font-bold">{modalConfig[showCreate].title}</h2>
            </div>
            {[
              { key: 'nom',      label: 'Nom',           type: 'text'     },
              { key: 'prenom',   label: 'Prénom',        type: 'text'     },
              { key: 'email',    label: 'Adresse email', type: 'email'    },
              { key: 'password', label: 'Mot de passe',  type: 'password' },
            ].map(({ key, label, type }) => (
              <input key={key}
                type={type}
                placeholder={label}
                value={newForm[key]}
                onChange={e => setNewForm({ ...newForm, [key]: e.target.value })}
                className={`w-full border rounded-lg px-4 py-2 text-sm mb-3 focus:outline-none focus:ring-2
                  ${showCreate === 'admin' ? 'focus:ring-purple-200' : 'focus:ring-blue-200'}`}
              />
            ))}
            <div className="flex gap-3 mt-2">
              <button onClick={handleCreate} disabled={loading}
                className={`flex-1 text-white rounded-lg py-2 text-sm transition disabled:opacity-60
                  ${showCreate === 'admin' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                {loading ? 'Création...' : 'Créer'}
              </button>
              <button onClick={() => { setShowCreate(false); setNewForm(EMPTY_FORM) }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg py-2 text-sm transition">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

export default function Register() {
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (form.password !== form.confirmPassword) {
      return setError('Les mots de passe ne correspondent pas.')
    }
    if (form.password.length < 6) {
      return setError('Le mot de passe doit contenir au moins 6 caractères.')
    }

    setLoading(true)
    try {
      await axios.post('http://localhost:5000/api/register', {
        nom:      form.nom,
        prenom:   form.prenom,
        email:    form.email,
        password: form.password,
        role:     'parent',
      })
      setSuccess('Compte créé avec succès ! Redirection...')
      setTimeout(() => navigate('/login'), 1800)
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'inscription.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100
                    flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-6">
          <span className="text-3xl">🎓</span>
          <h1 className="text-2xl font-bold mt-2">
            Edu<span className="text-blue-500">Predict</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Créez votre compte</p>
        </div>

        {/* Feedback */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 text-sm rounded-lg p-3 mb-4">
            {success}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nom & Prénom */}
          <div className="flex gap-3">
            <input
              type="text"
              name="nom"
              placeholder="Nom"
              value={form.nom}
              onChange={handleChange}
              required
              className="w-1/2 border border-gray-200 rounded-xl px-4 py-3
                         text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <input
              type="text"
              name="prenom"
              placeholder="Prénom"
              value={form.prenom}
              onChange={handleChange}
              required
              className="w-1/2 border border-gray-200 rounded-xl px-4 py-3
                         text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {/* Email */}
          <input
            type="email"
            name="email"
            placeholder="Adresse email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3
                       text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          {/* Mot de passe */}
          <input
            type="password"
            name="password"
            placeholder="Mot de passe"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3
                       text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          {/* Confirmer mot de passe */}
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirmer le mot de passe"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3
                       text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          {/* Info rôle */}
          <div className="bg-blue-50 text-blue-500 text-xs rounded-lg px-4 py-2 text-center">
            👪 L'inscription publique est réservée aux <span className="font-semibold">parents</span>.
            Les comptes Enseignant et Admin sont créés par un administrateur.
          </div>

          {/* Bouton submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60
                       text-white font-semibold rounded-xl py-3 transition">
            {loading ? 'Création en cours...' : "Créer mon compte →"}
          </button>
        </form>

        {/* Lien vers login */}
        <div className="text-center mt-4 text-sm">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-blue-500 font-semibold">
            Se connecter
          </Link>
        </div>

        <Link
          to="/"
          className="block text-center mt-3 text-sm text-gray-400 hover:text-gray-600"
        >
          ← Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}

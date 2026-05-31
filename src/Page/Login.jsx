import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await axios.post('http://localhost:5000/api/login',
                                   { email, password })
localStorage.setItem('user', JSON.stringify(res.data.user))
localStorage.setItem('role', res.data.role)
      if      (res.data.role === 'administrateur') navigate('/dashboard/admin')
      else if (res.data.role === 'enseignant')     navigate('/dashboard/enseignant')
      else if (res.data.role === 'parent')         navigate('/dashboard/parent')

    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion')
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
          <p className="text-gray-500 text-sm mt-1">Accédez à votre espace</p>
        </div>

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3
                       text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3
                       text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white
                       font-semibold rounded-xl py-3 transition">
            Se connecter →
          </button>
        </form>

        {/* Rôles */}
        <div className="text-center mt-4 text-sm text-gray-400">
          Espace disponible pour :
          <div className="flex justify-center gap-2 mt-2">
            {['Admin', 'Enseignant', 'Parent'].map(r => (
              <span key={r}
                className="px-3 py-1 rounded-full text-xs font-medium
                           bg-blue-50 text-blue-600">
                {r}
              </span>
            ))}
          </div>
        </div>

        <div className="text-center mt-4 text-sm">
          Pas de compte ?{' '}
          <Link to="/register" className="text-blue-500 font-semibold">
            S'inscrire
          </Link>
        </div>

        <Link to="/"
          className="block text-center mt-3 text-sm text-gray-400 hover:text-gray-600">
          ← Retour à l'accueil
        </Link>

      </div>
    </div>
  )
}
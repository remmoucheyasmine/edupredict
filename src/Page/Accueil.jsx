import { useNavigate } from 'react-router-dom'

export default function Accueil() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col">

      {/* NAVBAR */}
      <nav className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <span className="text-xl font-bold">
            Edu<span className="text-blue-500">Predict</span>
          </span>
        </div>
        <div className="flex gap-6 text-sm text-gray-600">
          <a href="#"        className="hover:text-blue-500 transition">Accueil</a>
          <a href="#apropos" className="hover:text-blue-500 transition">À propos</a>
          <a href="#contact" className="hover:text-blue-500 transition">Contact</a>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm
                     px-4 py-2 rounded-lg transition">
          Se connecter
        </button>
      </nav>

      {/* HERO */}
      <section className="flex-1 flex flex-col items-center justify-center
                          bg-gradient-to-br from-blue-50 to-indigo-100
                          text-center px-4 py-20">
        <span className="text-6xl mb-6">🎓</span>
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Prédiction du décrochage scolaire
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mb-8">
          Une plateforme intelligente basée sur l'intelligence artificielle
          pour aider à détecter les élèves en difficulté.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold
                     px-8 py-3 rounded-xl text-lg transition shadow-md">
          Commencer →
        </button>
      </section>

      {/* CARDS */}
      <section className="bg-white py-16 px-8">
        <h2 className="text-2xl font-bold text-center text-gray-700 mb-10">
          Fonctionnalités principales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { icon: '📊', title: 'Analyse des données',
              desc: 'Suivi des activités et résultats de chaque étudiant en temps réel.' },
            { icon: '🤖', title: 'Prédiction IA',
              desc: 'Détection automatique des élèves à risque de décrochage scolaire.' },
            { icon: '👨‍👩‍👧', title: 'Espace famille',
              desc: 'Les parents suivent la progression de leurs enfants facilement.' },
          ].map((card, i) => (
            <div key={i}
              className="bg-blue-50 rounded-2xl p-6 text-center shadow-sm
                         hover:shadow-md transition">
              <div className="text-4xl mb-3">{card.icon}</div>
              <h3 className="font-semibold text-gray-700 mb-2">{card.title}</h3>
              <p className="text-gray-500 text-sm">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* APROPOS */}
      <section id="apropos"
        className="bg-indigo-50 py-16 px-8 text-center">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">À propos</h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          EduPredict est un système intelligent d'aide à la décision développé
          dans le cadre d'un Projet de Fin d'Études à l'Université de Jijel — SIAD.
          Il exploite le dataset OULAD pour analyser le comportement des étudiants
          et prédire leur réussite académique.
        </p>
      </section>

      {/* FOOTER */}
      <footer id="contact"
        className="bg-gray-800 text-white py-10 px-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-2">
              Edu<span className="text-blue-400">Predict</span>
            </h3>
            <p className="text-gray-400 text-sm">
              Système intelligent d'aide à la décision pour la réussite éducative.
            </p>
          </div>
          <div>
            <h3 className="font-bold mb-2">Liens Rapides</h3>
            <ul className="text-gray-400 text-sm space-y-1">
              <li><a href="#" className="hover:text-white">Conditions d'utilisation</a></li>
              <li><a href="#" className="hover:text-white">Politique de confidentialité</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-2">Contact</h3>
            <p className="text-gray-400 text-sm">Email: contact@edupredict.dz</p>
            <p className="text-gray-400 text-sm">Université de Jijel — SIAD</p>
          </div>
        </div>
        <p className="text-center text-gray-500 text-xs mt-8">
          © 2026 EduPredict | Projet de Fin d'Études (PFE)
        </p>
      </footer>

    </div>
  )
}
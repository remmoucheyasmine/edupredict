import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Accueil        from './Page/Accueil'
import Login          from './Page/Login'
import Register       from './Page/Register'
import DashboardAdmin from './Page/DashboardAdmin'
import DashboardAdminStudent from './Page/DashboardAdminStudent'

import DashboardParent from './Page/DashboardParent'
import DashboardEnseignant from './Page/DashboardEnseignant'


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                    element={<Accueil />} />
        <Route path="/login"               element={<Login />} />
        <Route path="/register"            element={<Register />} />
        <Route path="/dashboard/admin"     element={<DashboardAdmin />} />
        <Route path="/dashboard/enseignant" element={<DashboardEnseignant/>} />
        <Route path="/dashboard/parent"    element={<DashboardParent/>} />
        <Route path="/dashboard/admin/students" element={<DashboardAdminStudent />} />

      </Routes>
    </BrowserRouter>
  )
}
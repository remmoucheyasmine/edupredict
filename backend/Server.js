const express = require('express')
const mysql   = require('mysql2')
const cors    = require('cors')
const bcrypt  = require('bcryptjs')
const XLSX    = require('xlsx')
const fs      = require('fs')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args))

// ══════════════════════════════════════════════════════════════════════
// CHEMIN XLSX
// ══════════════════════════════════════════════════════════════════════
const XLSX_PATH = 'C:/Users/Lenovo/Desktop/PFE/ecole/ecole_dataset.xlsx'

const PREDIT_COLS = [
  'moy_math_t1_predit', 'moy_francais_t1_predit',
  'moy_arabe_t1_predit', 'moy_sciences_t1_predit', 'moy_generale_t1_predit',
  'moy_math_t2_predit', 'moy_francais_t2_predit',
  'moy_arabe_t2_predit', 'moy_sciences_t2_predit', 'moy_generale_t2_predit',
]

// ══════════════════════════════════════════════════════════════════════
// MAP EN MÉMOIRE
// ══════════════════════════════════════════════════════════════════════
const predictionMap = {}


function loadPredictionsFromXLSX() {
  Object.keys(predictionMap).forEach(k => delete predictionMap[k])

  if (!fs.existsSync(XLSX_PATH)) {
    console.warn('⚠️  XLSX introuvable :', XLSX_PATH)
    return
  }

  const wb   = XLSX.readFile(XLSX_PATH)
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws)

  for (const row of rows) {
    const id = String(row.id_eleve)
    const predictions = {}
    for (const col of PREDIT_COLS) {
      if (row[col] != null) predictions[col] = parseFloat(row[col])
    }
    const moy = predictions['moy_generale_t2_predit'] ?? predictions['moy_generale_t1_predit']
    const segment = moy != null
      ? (moy >= 14 ? 'Excellent' : moy >= 10 ? 'Moyen' : 'Faible')
      : null

    predictionMap[id] = { predictions, segment }
  }

  console.log(`✅ XLSX chargé : ${Object.keys(predictionMap).length} élèves`)
}

function updateStudentInXLSX(id_eleve, predictions) {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error('❌ XLSX introuvable pour la mise à jour')
    return
  }
  

  
  const wb   = XLSX.readFile(XLSX_PATH)
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws)

  const idx = rows.findIndex(r => String(r.id_eleve) === String(id_eleve))
  if (idx === -1) {
    console.warn(`⚠️  Élève ${id_eleve} introuvable dans XLSX`)
    return
  }

  for (const [col, val] of Object.entries(predictions)) {
    rows[idx][col] = val
  }

  const newWs = XLSX.utils.json_to_sheet(rows)
  wb.Sheets[wb.SheetNames[0]] = newWs
  XLSX.writeFile(wb, XLSX_PATH)

  console.log(`💾 XLSX mis à jour pour id_eleve=${id_eleve}`)
}

// ══════════════════════════════════════════════════════════════════════
// CONNEXION MySQL
// ══════════════════════════════════════════════════════════════════════
const db = mysql.createConnection({
  host: 'localhost', user: 'root', password: '', database: 'ecole'
})

db.connect(err => {
  if (err) console.error('❌ Erreur MySQL:', err)
  else {
    console.log('✅ MySQL connecté')
    loadPredictionsFromXLSX()
  }
})

// ── Recharger le XLSX sans redémarrer ───────────────────────────────
app.post('/api/admin/reload-predictions', (req, res) => {
  loadPredictionsFromXLSX()
  res.json({
    message: `✅ Scores rechargés depuis XLSX`,
    total: Object.keys(predictionMap).length
  })
})

// ══════════════════════════════════════════════════════════════════════
// AUTHENTIFICATION
// ══════════════════════════════════════════════════════════════════════
app.post('/api/register', async (req, res) => {
  const { nom, prenom, email, password, role } = req.body
  const hash = await bcrypt.hash(password, 10)
  let sql, params
  if (role === 'administrateur')      { sql = `INSERT INTO administrateur (nom_admin, prenom_admin, email, password) VALUES (?,?,?,?)`; params = [nom, prenom, email, hash] }
  else if (role === 'enseignant')     { sql = `INSERT INTO enseignant (nom_enseignat, prenom_enseignat, email, password) VALUES (?,?,?,?)`; params = [nom, prenom, email, hash] }
  else                                { sql = `INSERT INTO parent (nom_parent, prenom_parent, email, password) VALUES (?,?,?,?)`; params = [nom, prenom, email, hash] }
  db.query(sql, params, (err) => {
    if (err) return res.status(400).json({ error: 'Email déjà utilisé' })
    res.json({ message: 'Compte créé avec succès' })
  })
})

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body
  const tables = [
    { table: 'administrateur', role: 'administrateur' },
    { table: 'enseignant',     role: 'enseignant'     },
    { table: 'parent',         role: 'parent'         },
  ]
  try {
    for (const { table, role } of tables) {
      const [rows] = await db.promise().query(`SELECT * FROM ${table} WHERE email = ?`, [email])
      if (rows.length > 0) {
        const user = rows[0]
        const isBcrypt = user.password && user.password.startsWith('$2')
        const valid = isBcrypt ? await bcrypt.compare(password, user.password) : password === user.password
        if (!valid) return res.status(401).json({ error: 'Mot de passe incorrect' })
        return res.json({ message: 'Connecté', role, user: { ...user, id: user.id_parent || user.id_enseignant || user.id_admin } })
      }
    }
    res.status(404).json({ error: 'Email introuvable' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ══════════════════════════════════════════════════════════════════════
// ADMIN — UTILISATEURS
// ══════════════════════════════════════════════════════════════════════
app.get('/api/admin/users', async (req, res) => {
  try {
    const [admins]      = await db.promise().query("SELECT id_admin AS id, nom_admin AS nom, prenom_admin AS prenom, email, 'administrateur' AS role FROM administrateur")
    const [enseignants] = await db.promise().query("SELECT id_enseignant AS id, nom_enseignat AS nom, prenom_enseignat AS prenom, email, 'enseignant' AS role FROM enseignant")
    const [parents]     = await db.promise().query("SELECT id_parent AS id, nom_parent AS nom, prenom_parent AS prenom, email, 'parent' AS role FROM parent")
    res.json([...admins, ...enseignants, ...parents])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/admin/users/:role/:id', async (req, res) => {
  const { role, id } = req.params
  const { nom, prenom, email } = req.body
  let sql
  if (role === 'administrateur')  sql = "UPDATE administrateur SET nom_admin=?, prenom_admin=?, email=? WHERE id_admin=?"
  else if (role === 'enseignant') sql = "UPDATE enseignant SET nom_enseignat=?, prenom_enseignat=?, email=? WHERE id_enseignant=?"
  else                            sql = "UPDATE parent SET nom_parent=?, prenom_parent=?, email=? WHERE id_parent=?"
  try {
    await db.promise().query(sql, [nom, prenom, email, id])
    res.json({ message: 'Utilisateur modifié' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/admin/users/:role/:id', async (req, res) => {
  const { role, id } = req.params
  const table = role === 'administrateur' ? 'administrateur' : role === 'enseignant' ? 'enseignant' : 'parent'
  const idCol = role === 'administrateur' ? 'id_admin' : role === 'enseignant' ? 'id_enseignant' : 'id_parent'
  try {
    await db.promise().query(`DELETE FROM ${table} WHERE ${idCol} = ?`, [id])
    res.json({ message: 'Supprimé avec succès' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ══════════════════════════════════════════════════════════════════════
// ADMIN — ÉTUDIANTS
// ══════════════════════════════════════════════════════════════════════
app.get('/api/admin/students', async (req, res) => {
  try {
    const page   = Number(req.query.page) || 1
    const limit  = Number(req.query.limit) || 50
    const offset = (page - 1) * limit
    const search = req.query.search || ''

    const [rows] = await db.promise().query(`SELECT
  e.id_eleve,
  e.nom_eleve,
  e.prenom_eleve,
  e.genre,
  e.age,
  e.filiere,
  e.echelon_socio,
  e.taille_classe,
  e.distance_etablissement_km
FROM eleves e
      WHERE e.id_eleve LIKE ? OR e.nom_eleve LIKE ?
        OR e.prenom_eleve LIKE ? OR e.filiere LIKE ?
      ORDER BY e.id_eleve ASC
      LIMIT ? OFFSET ?
    `, [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, limit, offset])

    const [countRows] = await db.promise().query(`
      SELECT COUNT(*) AS total FROM eleves
      WHERE id_eleve LIKE ? OR nom_eleve LIKE ?
        OR prenom_eleve LIKE ? OR filiere LIKE ?
    `, [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`])

   const enriched = rows.map(s => {
  const key  = String(s.id_eleve)
  const pred = predictionMap[key] || null

  const predictions = pred ? pred.predictions : {}

  const moyT1 = predictions.moy_generale_t1_predit
const moyT2 = predictions.moy_generale_t2_predit

const getSegment = (moy) => {
  if (moy >= 14) return "Excellent"
  if (moy >= 10) return "Moyen"
  return "Faible"
}
  return {
    ...s,
    ...predictions,
    segment_t1: moyT1 != null ? getSegment(moyT1) : null,
  segment_t2: moyT2 != null ? getSegment(moyT2) : null
  }
})

    res.json({
      data: enriched,
      total: countRows[0].total,
      page,
      totalPages: Math.ceil(countRows[0].total / limit)
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/admin/students/:id', async (req, res) => {

  const { id } = req.params
  const body = req.body

  try {

    // =====================================================
    // MISE À JOUR TABLE ELEVES
    // =====================================================

    const eleveFields = [
      'nom_eleve',
      'prenom_eleve',
      'genre',
      'age',
      'filiere',
      'echelon_socio',
      'taille_classe',
      'distance_etablissement_km'
    ]

    const eleveSet = eleveFields.filter(
      f => body[f] !== undefined
    )

    if (eleveSet.length > 0) {

      const sql = `
        UPDATE eleves
        SET ${eleveSet.map(f => `${f}=?`).join(',')}
        WHERE id_eleve=?
      `

      await db.promise().query(
        sql,
        [
          ...eleveSet.map(f => body[f]),
          id
        ]
      )
    }

    // =====================================================
    // MISE À JOUR TABLE ABSENCES
    // =====================================================

    const absenceFields = [
      'nb_absences_s1_s8',
      'nb_absences_s9_s16',
      'nb_absences_total',
      'taux_absences_inj'
    ]

    const absenceSet = absenceFields.filter(
      f => body[f] !== undefined
    )

    if (absenceSet.length > 0) {

      const sql = `
        UPDATE absences
        SET ${absenceSet.map(f => `${f}=?`).join(',')}
        WHERE id_eleve=?
      `

      await db.promise().query(
        sql,
        [
          ...absenceSet.map(f => body[f]),
          id
        ]
      )
    }

    // =====================================================
    // MISE À JOUR TABLE EVALUATION
    // =====================================================

    if (body.periode) {

      const evalFields = [
        'note_quiz_moy',
        'tendance_notes',
        'label'
      ]

      const evalSet = evalFields.filter(
        f => body[f] !== undefined
      )

      if (evalSet.length > 0) {

        const sql = `
          UPDATE evaluation
          SET ${evalSet.map(f => `${f}=?`).join(',')}
          WHERE id_eleve=? AND periode=?
        `

        await db.promise().query(
          sql,
          [
            ...evalSet.map(f => body[f]),
            id,
            body.periode
          ]
        )
      }
    }

    // =====================================================
    // RÉCUPÉRATION DES DONNÉES COMPLÈTES
    // =====================================================

    const [studentRows] = await db.promise().query(`
      SELECT

        e.id_eleve,
        e.genre,
        e.age,
        e.filiere,
        e.echelon_socio,
        e.taille_classe,
        e.distance_etablissement_km,

        ev.note_quiz_moy,
        ev.tendance_notes,

        ab.nb_absences_s1_s8,
        ab.nb_absences_s9_s16,
        ab.nb_absences_total,
        ab.taux_absences_inj

      FROM eleves e

      LEFT JOIN evaluation ev
        ON e.id_eleve = ev.id_eleve

      LEFT JOIN absences ab
        ON e.id_eleve = ab.id_eleve

      WHERE e.id_eleve = ?

      LIMIT 1
    `, [id])

    if (studentRows.length === 0) {
      return res.status(404).json({
        error: 'Étudiant introuvable'
      })
    }

    const fullStudent = studentRows[0]

    // =====================================================
    // RECALCUL DES SCORES VIA FLASK
    // =====================================================

    let predictions = null
    let segment = null

    try {

      const flaskRes = await fetch(
        'http://localhost:5001/predict',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fullStudent)
        }
      )

      const flaskData = await flaskRes.json()

      console.log('Réponse Flask :', flaskData)

      if (!flaskData.error) {

        predictions = flaskData.predictions
        segment = flaskData.segment

        predictionMap[String(id)] = {
          predictions,
          segment
        }

        updateStudentInXLSX(
          id,
          predictions
        )

        console.log(
          `✅ Scores recalculés pour ${id}`
        )
      }

    } catch (flaskErr) {

      console.error(
        'Erreur Flask :',
        flaskErr.message
      )
    }

    res.json({
      message: 'Étudiant modifié avec succès',
      predictions,
      segment,
      score_recalculated: predictions !== null
    })

  } catch (err) {

    console.error(err)

    res.status(500).json({
      error: err.message
    })
  }
})
  
app.delete('/api/admin/students/:id', async (req, res) => {
  try {
    await db.promise().query(`DELETE FROM eleves WHERE id_eleve = ?`, [req.params.id])
    delete predictionMap[String(req.params.id)]
    res.json({ message: 'Étudiant supprimé' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/admin/students', async (req, res) => {
  const { nom_eleve, prenom_eleve, genre, age, filiere,
          echelon_socio, taille_classe, distance_etablissement_km } = req.body
  try {
    const [result] = await db.promise().query(
      `INSERT INTO eleves (nom_eleve, prenom_eleve, genre, age, filiere,
       echelon_socio, taille_classe, distance_etablissement_km)
       VALUES (?,?,?,?,?,?,?,?)`,
      [nom_eleve, prenom_eleve, genre, age, filiere,
       echelon_socio, taille_classe, distance_etablissement_km]
    )
    const newId = result.insertId
    await db.promise().query(
 `
 INSERT INTO evaluation (
   id_eleve,
   periode,
   moy_math,
   moy_francais,
   moy_arabe,
   moy_sciences,
   moy_generale,
   note_quiz_moy,
   tendance_notes,
   label
 )
 VALUES (?,?,?,?,?,?,?,?,?,?)
 `,
 [
   newId,
   req.body.periode,
   req.body.moy_math,
   req.body.moy_francais,
   req.body.moy_arabe,
   req.body.moy_sciences,
   req.body.moy_generale,
   req.body.note_quiz_moy,
   req.body.tendance_notes,
   req.body.label || null
 ]
)
    try {
      const flaskRes = await fetch('http://localhost:5001/predict', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_eleve: newId, ...req.body })
      })
      const flaskData = await flaskRes.json()
      if (!flaskData.error && flaskData.predictions) {
        predictionMap[String(newId)] = {
          predictions: flaskData.predictions,
          segment: flaskData.segment
        }
      }
    } catch (_) {}
    res.json({ message: 'Étudiant créé', id_eleve: newId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// ══════════════════════════════════════════════════════════════════════
// ENSEIGNANT
// ══════════════════════════════════════════════════════════════════════
app.get('/api/enseignant/etudiants/:id', async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT si.* FROM studentinfo si
      JOIN enseignant_cours ec ON si.code_module = ec.code_module AND si.code_presentation = ec.code_presentation
      WHERE ec.id_enseignant = ?`, [req.params.id])
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/enseignant/modules/:id', async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT code_module, code_presentation FROM enseignant_cours WHERE id_enseignant = ?", [req.params.id])
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/enseignant/notes/:id', async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT si.id_student, si.gender, si.age_band, si.highest_education, si.studied_credits,
             si.final_result, si.code_module, si.code_presentation,
             sa.score, sa.date_submitted, sa.is_banked,
             a.assessment_type, a.date AS date_evaluation
      FROM enseignant_cours ec
      JOIN studentinfo si       ON si.code_module = ec.code_module AND si.code_presentation = ec.code_presentation
      JOIN studentAssessment sa ON sa.id_student = si.id_student
      JOIN assessments a        ON a.id_assessment = sa.id_assessment AND a.code_module = ec.code_module AND a.code_presentation = ec.code_presentation
      WHERE ec.id_enseignant = ? ORDER BY si.id_student, a.assessment_type`, [req.params.id])
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ══════════════════════════════════════════════════════════════════════
// PARENT
// ══════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════
// PARENT — route à remplacer dans server.js
// Remplace l'ancienne route app.get('/api/parent/enfants/:id', ...)
// ══════════════════════════════════════════════════════════════════════

app.get('/api/parent/enfants/:id', async (req, res) => {
  try {
    const idParent = req.params.id

    // 1. Récupérer les id_eleve liés à ce parent via parent_eleve
    const [liens] = await db.promise().query(
      `SELECT id_eleve FROM parent_eleve WHERE id_parent = ?`,
      [idParent]
    )

    if (liens.length === 0) return res.json([])

    const ids = liens.map(l => l.id_eleve)

    // 2. Récupérer les infos de chaque élève
    const [eleves] = await db.promise().query(
      `SELECT
         id_eleve,
         nom_eleve,
         prenom_eleve,
         genre,
         age,
         filiere,
         echelon_socio,
         taille_classe,
         distance_etablissement_km
       FROM eleves
       WHERE id_eleve IN (?)`,
      [ids]
    )

    // 3. Enrichir avec les prédictions depuis predictionMap
    const enriched = eleves.map(e => {
      const key  = String(e.id_eleve)
      const pred = predictionMap[key] || null

      const predictions = pred ? pred.predictions : {}

      const moyT1 = predictions.moy_generale_t1_predit
      const moyT2 = predictions.moy_generale_t2_predit

      const getSegment = (moy) => {
        if (moy == null) return null
        if (moy >= 14) return 'Excellent'
        if (moy >= 10) return 'Moyen'
        return 'Faible'
      }

      return {
        ...e,
        ...predictions,
        segment_t1: getSegment(moyT1),
        segment_t2: getSegment(moyT2),
      }
    })

    res.json(enriched)

  } catch (err) {
    console.error('Erreur /api/parent/enfants:', err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/parent/resultats/:id_student', async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT sa.score, sa.date_submitted, sa.is_banked, a.assessment_type, a.date AS date_evaluation
      FROM studentAssessment sa JOIN assessments a ON sa.id_assessment = a.id_assessment
      WHERE sa.id_student = ?`, [req.params.id_student])
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/parent/activites/:id_student', async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT sv.date, sv.sum_click, v.activity_type FROM studentVle sv
      JOIN vle v ON sv.id_site = v.id_site WHERE sv.id_student = ?
      ORDER BY sv.date DESC LIMIT 20`, [req.params.id_student])
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ══════════════════════════════════════════════════════════════════════
// ML
// ══════════════════════════════════════════════════════════════════════
app.post('/api/predict', async (req, res) => {
  try {
    const flaskRes   = await fetch('http://localhost:5001/predict', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    })
    const prediction = await flaskRes.json()
    if (prediction.error) return res.status(500).json({ error: prediction.error })
    res.json(prediction)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ══════════════════════════════════════════════════════════════════════
// LANCEMENT
// ══════════════════════════════════════════════════════════════════════
const PORT = 5000
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`))
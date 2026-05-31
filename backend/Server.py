"""
Flask API — Prédiction des moyennes par matière (T1 & T2)
Dataset : ecole_dataset.xlsx
Modèles : xgb_model_{T1|T2}_{Maths|Français|Arabe|Sciences|Générale}.pkl
Features : xgb_features_{T1|T2}_{Maths|Français|Arabe|Sciences|Générale}.pkl
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
import os

app = Flask(__name__)
CORS(app)
# CHEMINS
MODEL_DIR   = r"C:\Users\Lenovo\Desktop\PFE\ecole"
DATASET_PATH = os.path.join(MODEL_DIR, "ecole_dataset.xlsx")

# Correspondance colonne → (période, suffixe fichier)
TARGETS = {
    "moy_math_t1_predit":      ("T1", "Maths"),
    "moy_francais_t1_predit":  ("T1", "Français"),
    "moy_arabe_t1_predit":     ("T1", "Arabe"),
    "moy_sciences_t1_predit":  ("T1", "Sciences"),
    "moy_generale_t1_predit":  ("T1", "Générale"),
    "moy_math_t2_predit":      ("T2", "Maths"),
    "moy_francais_t2_predit":  ("T2", "Français"),
    "moy_arabe_t2_predit":     ("T2", "Arabe"),
    "moy_sciences_t2_predit":  ("T2", "Sciences"),
    "moy_generale_t2_predit":  ("T2", "Générale"),
}
# CHARGER LES MODÈLES EN MÉMOIRE AU DÉMARRAGE
models = {}
features = {}

for col, (periode, suffix) in TARGETS.items():
    mp = os.path.join(MODEL_DIR, f"xgb_model_{periode}_{suffix}.pkl")
    fp = os.path.join(MODEL_DIR, f"xgb_features_{periode}_{suffix}.pkl")

    if os.path.exists(mp) and os.path.exists(fp):
        models[col] = joblib.load(mp)
        features[col] = joblib.load(fp)
        print(f"✅ Modèle chargé : {col}")
    else:
        print(f"⚠️ Modèle manquant : {col}")


def encode_df(df):
    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].astype("category").cat.codes
    return df


def update_excel_and_predict(id_eleve, updates=None):
    df = pd.read_excel(DATASET_PATH)

    idx = df.index[df["id_eleve"] == id_eleve]

    if len(idx) == 0:
        return None

    idx = idx[0]

    # 1. UPDATE DATA (si présent)
    if updates:
        for k, v in updates.items():
            if k in df.columns:
                df.at[idx, k] = v

    predictions = {}

    # 2. PREDICTION
    for col, (periode, suffix) in TARGETS.items():

        if col not in models:
            continue

        model = models[col]
        feat = features[col]

        row = df.loc[[idx]].copy()
        row = encode_df(row)

        X = row.reindex(columns=feat, fill_value=0)

        pred = round(float(model.predict(X)[0]), 2)

        predictions[col] = pred

        df.at[idx, col] = pred

    # 3. SAVE EXCEL
    df.to_excel(DATASET_PATH, index=False)

    return predictions


@app.route("/predict", methods=["POST"])
def predict():
    data = request.json

    if not data or "id_eleve" not in data:
        return jsonify({"error": "id_eleve requis"}), 400

    id_eleve = int(data["id_eleve"])

    updates = {k: v for k, v in data.items() if k != "id_eleve"}

    predictions = update_excel_and_predict(id_eleve, updates)

    if predictions is None:
        return jsonify({"error": "élève introuvable"}), 404

    # SEGMENT
    moy = predictions.get("moy_generale_t2_predit") or predictions.get("moy_generale_t1_predit")

    if moy is not None:
        if moy >= 14:
            segment = "Excellent"
        elif moy >= 10:
            segment = "Moyen"
        else:
            segment = "Faible"
    else:
        segment = None

    return jsonify({
        "id_eleve": id_eleve,
        "predictions": predictions,
        "segment": segment
    })


@app.route("/students/<int:id_eleve>", methods=["GET"])
def get_student(id_eleve):
    df = pd.read_excel(DATASET_PATH)

    row = df[df["id_eleve"] == id_eleve]

    if row.empty:
        return jsonify({"error": "introuvable"}), 404

    return jsonify(row.to_dict(orient="records")[0])


@app.route("/update-student", methods=["POST"])
def update_student():

    data = request.json
    id_eleve = data.get("id_eleve")
    updates = data.get("updates", {})

    # 1. charger excel
    df = pd.read_excel(DATASET_PATH)

    # 2. vérifier élève
    if id_eleve not in df["id_eleve"].astype(str).values:
        return jsonify({"error": "élève introuvable"}), 404

    idx = df.index[df["id_eleve"].astype(str) == id_eleve][0]

    # 3. appliquer modifications
    for k, v in updates.items():
        if k in df.columns:
            df.at[idx, k] = v

    # 4. recalcul prédictions
    predictions = {}

    for col, (periode, suffix) in TARGETS.items():

        model_path = os.path.join(MODEL_DIR, f"xgb_model_{periode}_{suffix}.pkl")
        feat_path = os.path.join(MODEL_DIR, f"xgb_features_{periode}_{suffix}.pkl")

        if not os.path.exists(model_path) or not os.path.exists(feat_path):
            continue

        model = joblib.load(model_path)
        features = joblib.load(feat_path)

        row = df.loc[[idx]].copy()

        # encodage LOCAL (important)
        for c in row.select_dtypes(include="object").columns:
            if c != "id_eleve":
                row[c] = row[c].astype("category").cat.codes

        X = row.reindex(columns=features, fill_value=0)

        pred = round(float(model.predict(X)[0]), 2)

        predictions[col] = pred
        df.at[idx, col ] = pred

    # 5. sauvegarde excel
    try:
        df.to_excel(DATASET_PATH, index=False)
    except PermissionError:
        return jsonify({"error": "Ferme Excel avant sauvegarde"}), 500

    # 6. segment
    moy = predictions.get("moy_generale_t2_predit") or predictions.get("moy_generale_t1_predit")

    if moy is not None:
        if moy >= 14:
            segment = "Excellent"
        elif moy >= 10:
            segment = "Moyen"
        else:
            segment = "Faible"
    else:
        segment = None

    return jsonify({
        "id_eleve": id_eleve,
        "predictions": predictions,
        "segment": segment
    })

if __name__ == "__main__":
    app.run(port=5001, debug=True)
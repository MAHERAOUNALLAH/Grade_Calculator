const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// Connexion Postgres
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "projetgenie",
    password: "Maher7**",
    port: 5432
});

// ---------------------------------------------------------
// 1. Enregistrer un étudiant
// ---------------------------------------------------------
app.post("/api/student", async (req, res) => {
    const { first_name, last_name, email } = req.body;

    try {
        const result = await pool.query(
            "INSERT INTO students (first_name, last_name, email) VALUES ($1, $2, $3) RETURNING id",
            [first_name, last_name, email]
        );

        res.json({
            success: true,
            studentId: result.rows[0].id
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur insertion étudiant" });
    }
});

// ---------------------------------------------------------
// 2. Enregistrer une note pour un ECUE spécifique
// ---------------------------------------------------------
app.post("/api/notes", async (req, res) => {
    const { studentId, ecueCode, cc, tp, exam } = req.body;

    if (!studentId || !ecueCode || cc === undefined || tp === undefined || exam === undefined) {
        return res.status(400).json({ error: "Données manquantes" });
    }

    // Calcul de la moyenne : CC*0.3 + TP*0.2 + Exam*0.5
    const moyenne = (cc * 0.3 + tp * 0.2 + exam * 0.5);

    // Mapping des codes ECUE vers les colonnes de la base
    const ecueColumns = {
        'ECUEF311': { cc: 'uef311_cc', tp: 'uef311_tp', exam: 'uef311_exam', moyenne: 'uef311_moyenne' },
        'ECUEF321': { cc: 'uef321_cc', tp: 'uef321_tp', exam: 'uef321_exam', moyenne: 'uef321_moyenne' },
        'ECUEF322': { cc: 'uef322_cc', tp: 'uef322_tp', exam: 'uef322_exam', moyenne: 'uef322_moyenne' },
        'ECUEF331': { cc: 'uef331_cc', tp: 'uef331_tp', exam: 'uef331_exam', moyenne: 'uef331_moyenne' },
        'ECUEF332': { cc: 'uef332_cc', tp: 'uef332_tp', exam: 'uef332_exam', moyenne: 'uef332_moyenne' },
        'ECUEF341': { cc: 'uef341_cc', tp: 'uef341_tp', exam: 'uef341_exam', moyenne: 'uef341_moyenne' },
        'ECUEF342': { cc: 'uef342_cc', tp: 'uef342_tp', exam: 'uef342_exam', moyenne: 'uef342_moyenne' },
        'ECUET311': { cc: 'uet311_cc', tp: 'uet311_tp', exam: 'uet311_exam', moyenne: 'uet311_moyenne' },
        'ECUET312': { cc: 'uet312_cc', tp: 'uet312_tp', exam: 'uet312_exam', moyenne: 'uet312_moyenne' },
        'ECUEO311': { cc: 'ueo311_cc', tp: 'ueo311_tp', exam: 'ueo311_exam', moyenne: 'ueo311_moyenne' },
        'ECUEO312': { cc: 'ueo312_cc', tp: 'ueo312_tp', exam: 'ueo312_exam', moyenne: 'ueo312_moyenne' }
    };

    const columns = ecueColumns[ecueCode];
    if (!columns) {
        return res.status(400).json({ error: "Code ECUE invalide" });
    }

    try {
        // INSERT ... ON CONFLICT UPDATE pour mettre à jour si l'étudiant existe déjà
        await pool.query(
            `INSERT INTO notes (student_id, ${columns.cc}, ${columns.tp}, ${columns.exam}, ${columns.moyenne})
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (student_id)
             DO UPDATE SET
                 ${columns.cc} = EXCLUDED.${columns.cc},
                 ${columns.tp} = EXCLUDED.${columns.tp},
                 ${columns.exam} = EXCLUDED.${columns.exam},
                 ${columns.moyenne} = EXCLUDED.${columns.moyenne}`,
            [studentId, cc, tp, exam, moyenne]
        );

        // Recalculer les moyennes UE et semestre
        await recalculateAverages(studentId);

        res.json({ success: true, message: "Note enregistrée avec succès" });
    } catch (err) {
        console.error("Erreur détaillée :", err);
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------
// 3. Récupérer les notes d'un étudiant
// ---------------------------------------------------------
app.get("/api/notes/student/:studentId", async (req, res) => {
    const { studentId } = req.params;

    try {
        const result = await pool.query(
            "SELECT * FROM notes WHERE student_id = $1",
            [studentId]
        );

        if (result.rows.length === 0) {
            return res.json([]);
        }

        const notes = result.rows[0];
        
        // Transformer les données en format lisible
        const notesArray = [];
        const ecues = [
            { code: 'ECUEF311', prefix: 'uef311', coef: 2 },
            { code: 'ECUEF321', prefix: 'uef321', coef: 1 },
            { code: 'ECUEF322', prefix: 'uef322', coef: 1 },
            { code: 'ECUEF331', prefix: 'uef331', coef: 1.5 },
            { code: 'ECUEF332', prefix: 'uef332', coef: 2 },
            { code: 'ECUEF341', prefix: 'uef341', coef: 1.5 },
            { code: 'ECUEF342', prefix: 'uef342', coef: 1 },
            { code: 'ECUET311', prefix: 'uet311', coef: 1 },
            { code: 'ECUET312', prefix: 'uet312', coef: 1 },
            { code: 'ECUEO311', prefix: 'ueo311', coef: 1.5 },
            { code: 'ECUEO312', prefix: 'ueo312', coef: 1.5 }
        ];

        ecues.forEach(ecue => {
            const cc = notes[`${ecue.prefix}_cc`];
            const tp = notes[`${ecue.prefix}_tp`];
            const exam = notes[`${ecue.prefix}_exam`];
            const moyenne = notes[`${ecue.prefix}_moyenne`];

            if (cc !== null || tp !== null || exam !== null) {
                notesArray.push({
                    ecueCode: ecue.code,
                    cc: cc || 0,
                    tp: tp || 0,
                    exam: exam || 0,
                    moyenne: moyenne || 0,
                    coefficient: ecue.coef
                });
            }
        });

        res.json(notesArray);
    } catch (err) {
        console.error("Erreur :", err);
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------
// Fonction pour recalculer les moyennes UE et semestre
// ---------------------------------------------------------
async function recalculateAverages(studentId) {
    const result = await pool.query(
        "SELECT * FROM notes WHERE student_id = $1",
        [studentId]
    );

    if (result.rows.length === 0) return;

    const notes = result.rows[0];
    
    // Coefficients des ECUEs
    const ecueCoeffs = {
        'uef311': 2,   // UEF310
        'uef321': 1,   // UEF320
        'uef322': 1,   // UEF320
        'uef331': 1.5, // UEF330
        'uef332': 2,   // UEF330
        'uef341': 1.5, // UEF340
        'uef342': 1,   // UEF340
        'uet311': 1,   // UET310
        'uet312': 1,   // UET310
        'ueo311': 1.5, // UEO310
        'ueo312': 1.5  // UEO310
    };

    // Groupement par UE
    const ueGroups = {
        'UEF310': ['uef311'],
        'UEF320': ['uef321', 'uef322'],
        'UEF330': ['uef331', 'uef332'],
        'UEF340': ['uef341', 'uef342'],
        'UET310': ['uet311', 'uet312'],
        'UEO310': ['ueo311', 'ueo312']
    };

    // Calcul des moyennes par UE
    const ueAverages = {};
    for (const [ue, prefixes] of Object.entries(ueGroups)) {
        let weightedSum = 0;
        let totalCoeff = 0;

        prefixes.forEach(prefix => {
            const moyenne = notes[`${prefix}_moyenne`];
            if (moyenne !== null) {
                const coeff = ecueCoeffs[prefix];
                weightedSum += moyenne * coeff;
                totalCoeff += coeff;
            }
        });

        ueAverages[ue] = totalCoeff > 0 ? weightedSum / totalCoeff : null;
    }

    // Calcul de la moyenne du semestre (moyenne simple des UEs)
    const ueValues = Object.values(ueAverages).filter(v => v !== null);
    const moyenneSemestre = ueValues.length > 0 
        ? ueValues.reduce((a, b) => a + b, 0) / ueValues.length 
        : null;

    // Mise à jour dans la base
    await pool.query(
        `UPDATE notes 
         SET moyenne_ue = $1, moyenne_semestre = $2 
         WHERE student_id = $3`,
        [JSON.stringify(ueAverages), moyenneSemestre, studentId]
    );
}


// ---------------------------------------------------------
// Lancer le serveur
// ---------------------------------------------------------
app.listen(5000, () => {
    console.log(`Backend running at http://localhost:5000`);

});

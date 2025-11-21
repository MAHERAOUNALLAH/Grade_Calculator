// Configuration de l'application
const CONFIG = {
    // Coefficients pour chaque ECUE
    coefficients: {
        uef311: 2,   // Probabilité et statistique
        uef321: 1,   // Théorie des langages
        uef322: 1,   // Graphes et optimisation
        uef331: 1.5, // Conception SI
        uef332: 2,   // Programmation Java
        uef341: 1.5, // Ingénierie BDD
        uef342: 1,   // Services Réseaux
        uet311: 1,   // Anglais 3
        uet312: 1,   // Gestion d'entreprise
        ueo311: 1.5, // Génie Logiciel
        ueo312: 1.5  // Design Graphique
    },
    // Pourcentages pour le calcul des notes ECUE
    percentages: {
        cc: 0.2,    // 20% Contrôle Continu
        tp: 0.1,    // 10% Travaux Pratiques
        exam: 0.7   // 70% Examen final
    },
    // Crédits ECTS par UE
    credits: {
        uef310: 4, // Probabilité
        uef320: 4, // Automates et Optimisation
        uef330: 7, // CPOO
        uef340: 5, // BDD et Réseaux
        uet310: 4, // Langue et Culture
        ueo310: 6  // Unité optionnelle
    }
};

// État global de l'étudiant
let studentData = {
    nom: '',
    prenom: '',
    email: '',
    notes: {}
};

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

function initializeApp() {
    loadStudentData();
    setupEventListeners();
    showNotification('Application prête ! Saisissez vos notes.', 'success');
}

function setupEventListeners() {
    document.getElementById('save-student-btn').addEventListener('click', saveStudentData);
    document.getElementById('calculate-all-btn').addEventListener('click', calculateAllAverages);
    document.getElementById('save-all-btn').addEventListener('click', saveAllNotes);
    document.getElementById('reset-btn').addEventListener('click', resetAllData);

    // Onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Calcul automatique à chaque saisie
    document.querySelectorAll('.grade-input').forEach(input => {
        input.addEventListener('input', function () {
            const eceueId = this.id.split('-')[0];
            calculateECUEAverage(eceueId);
        });
    });
}

// === Gestion des données étudiant ===
function saveStudentData() {
    const nom = document.getElementById('student-name').value.trim();
    const prenom = document.getElementById('student-firstname').value.trim();
    const email = document.getElementById('student-email').value.trim();

    if (!nom || !prenom || !email) {
        showNotification('Veuillez remplir tous les champs.', 'warning');
        return;
    }
    if (!/^[\w.-]+@[\w.-]+\.\w+$/.test(email)) {
        showNotification('Email invalide.', 'warning');
        return;
    }

    studentData.nom = nom;
    studentData.prenom = prenom;
    studentData.email = email;
    localStorage.setItem('studentData', JSON.stringify(studentData));
    showNotification('Informations enregistrées !', 'success');
}

function loadStudentData() {
    const saved = localStorage.getItem('studentData');
    if (saved) {
        studentData = JSON.parse(saved);
        document.getElementById('student-name').value = studentData.nom || '';
        document.getElementById('student-firstname').value = studentData.prenom || '';
        document.getElementById('student-email').value = studentData.email || '';
    }

    const savedNotes = localStorage.getItem('studentNotes');
    if (savedNotes) {
        studentData.notes = JSON.parse(savedNotes);
        loadSavedNotes();
    }
}

function loadSavedNotes() {
    Object.entries(studentData.notes).forEach(([id, notes]) => {
        if (notes.cc > 0) document.getElementById(`${id}-cc`).value = notes.cc;
        if (notes.tp > 0) document.getElementById(`${id}-tp`).value = notes.tp;
        if (notes.exam > 0) document.getElementById(`${id}-exam`).value = notes.exam;
        calculateECUEAverage(id);
    });
}

// === Calculs de notes ===
function calculateECUEAverage(eceueId) {
    const cc = parseFloat(document.getElementById(`${eceueId}-cc`).value) || 0;
    const tp = parseFloat(document.getElementById(`${eceueId}-tp`).value) || 0;
    const exam = parseFloat(document.getElementById(`${eceueId}-exam`).value) || 0;

    // Validation
    if ([cc, tp, exam].some(n => n < 0 || n > 20)) {
        showNotification('Les notes doivent être entre 0 et 20.', 'warning');
        return 0;
    }

    // ✔ moyenne réelle sur 20
    const moyenne = cc * CONFIG.percentages.cc +
                    tp * CONFIG.percentages.tp +
                    exam * CONFIG.percentages.exam;

    const resultEl = document.getElementById(`${eceueId}-average`);

    if (cc === 0 && tp === 0 && exam === 0) {
        resultEl.textContent = '-';
        resultEl.className = 'grade-result';
        return 0;
    } else {
        resultEl.textContent = moyenne.toFixed(2);
        resultEl.className = moyenne >= 10 ? 'grade-result passed' : 'grade-result failed';
        return moyenne;
    }
}



// Moyenne d'une UE (pondérée par coefficients ECUE)
function calculateUEAverage(ueId) {
    const eceues = getECUEsByUE(ueId);
    let totalPondere = 0;
    let totalCoef = 0;

    eceues.forEach(id => {
        const note = calculateECUEAverage(id); // note sur 20 (moyenne ECUE)
        const coef = CONFIG.coefficients[id] || 0;
        if (note > 0 && coef > 0) {
            totalPondere += note * coef; // <-- appliquer le coef ici
            totalCoef += coef;
        }
    });

    return totalCoef > 0 ? totalPondere / totalCoef : 0;
}

// CORRIGÉ : Moyenne du semestre PONDÉRÉE PAR LES CRÉDITS ECTS
function calculateSemesterAverage() {
    const ues = [
        { id: 'uef310', credit: 4 },
        { id: 'uef320', credit: 4 },
        { id: 'uef330', credit: 7 },
        { id: 'uef340', credit: 5 },
        { id: 'uet310', credit: 4 },
        { id: 'ueo310', credit: 6 }
    ];

    let totalPondere = 0;
    let totalCredits = 0;

    ues.forEach(ue => {
        const moyenneUE = calculateUEAverage(ue.id);
        if (moyenneUE > 0) {
            totalPondere += moyenneUE * ue.credit;
            totalCredits += ue.credit;
        }
    });

    return totalCredits > 0 ? totalPondere / totalCredits : 0;
}

function calculateAcquiredCredits() {
    const ues = [
        { id: 'uef310', credit: 4 },
        { id: 'uef320', credit: 4 },
        { id: 'uef330', credit: 7 },
        { id: 'uef340', credit: 5 },
        { id: 'uet310', credit: 4 },
        { id: 'ueo310', credit: 6 }
    ];

    return ues.reduce((acc, ue) => {
        const avg = calculateUEAverage(ue.id);
        return avg >= 10 ? acc + ue.credit : acc;
    }, 0);
}

function getMention(moyenne) {
    if (moyenne >= 16) return "Très Bien";
    if (moyenne >= 14) return "Bien";
    if (moyenne >= 12) return "Assez Bien";
    if (moyenne >= 10) return "Passable";
    return "Insuffisant";
}

// === Mise à jour affichage ===
function calculateAllAverages() {
    if (!studentData.nom || !studentData.prenom) {
        showNotification('Enregistrez d\'abord vos informations.', 'warning');
        return;
    }

    let hasNotes = false;
    document.querySelectorAll('.grade-input').forEach(input => {
        if (input.value) hasNotes = true;
    });

    if (!hasNotes) {
        showNotification('Saisissez au moins une note.', 'warning');
        return;
    }

    updateUEResults();
    updateSemesterResults();
    updateCalculationDetails();

    showNotification('Calcul terminé ! Moyenne générale corrigée et pondérée.', 'success');
}

function updateUEResults() {
    const container = document.getElementById('ue-results');
    container.innerHTML = '';

    const ues = [
        { id: 'uef310', code: 'UEF310', nom: 'Probabilité', credit: 4 },
        { id: 'uef320', code: 'UEF320', nom: 'Automates et Optimisation', credit: 4 },
        { id: 'uef330', code: 'UEF330', nom: 'CPOO', credit: 7 },
        { id: 'uef340', code: 'UEF340', nom: 'Bases de données et Réseaux', credit: 5 },
        { id: 'uet310', code: 'UET310', nom: 'Langue et Culture d\'Entreprise', credit: 4 },
        { id: 'ueo310', code: 'UEO310', nom: 'Unité optionnelle', credit: 6 }
    ];

    let hasData = false;

    ues.forEach(ue => {
        const avg = calculateUEAverage(ue.id);
        if (avg > 0) {
            hasData = true;
            const passed = avg >= 10;
            const row = document.createElement('div');
            row.className = 'ue-result-item fade-in';
            row.innerHTML = `
                <div class="ue-result-header">
                    <div class="ue-result-title">${ue.code} - ${ue.nom} (${ue.credit} crédits)</div>
                    <div class="ue-result-average ${passed ? 'passed' : 'failed'}">
                        ${avg.toFixed(2)}
                    </div>
                </div>
            `;
            container.appendChild(row);
        }
    });

    if (!hasData) container.innerHTML = '<div class="no-data">Aucune note saisie</div>';
}

function updateSemesterResults() {
    const el = document.getElementById('semester-result');
    const moyenne = calculateSemesterAverage();
    const creditsAcquis = calculateAcquiredCredits();
    const totalCredits = 30;
    const pourcentage = ((creditsAcquis / totalCredits) * 100).toFixed(1);
    const valide = moyenne >= 10;
    const mention = getMention(moyenne);

    if (moyenne === 0) {
        el.innerHTML = '<div class="no-data">Saisissez vos notes pour voir votre moyenne générale</div>';
        return;
    }

    el.innerHTML = `
        <div class="semester-result-card fade-in">
            <h3>Moyenne Générale du Semestre</h3>
            <div class="semester-average ${valide ? 'passed' : 'failed'}">
                ${moyenne.toFixed(2)}
                <small style="font-size:0.9em; opacity:0.9;"> — ${mention}</small>
            </div>
            <div class="semester-status">
                ${valide ? 'Semestre Validé !' : 'Semestre Non Validé'}
            </div>
            <div class="semester-details">
                <div class="semester-detail-item"><div>Crédits acquis</div><div class="semester-detail-value ${creditsAcquis === 30 ? 'text-success' : ''}">${creditsAcquis} / 30</div></div>
                <div class="semester-detail-item"><div>Pourcentage</div><div>${pourcentage}%</div></div>
            </div>
            <div class="calculation-info mt-2">
                <small><em>Moyenne pondérée par les crédits ECTS • CC 20% + TP 10% + Examen 70%</em></small>
            </div>
        </div>
    `;
}

function updateCalculationDetails() {
    const el = document.getElementById('calculation-details');
    let html = '';
    let hasData = false;

    const allECUE = ['uef311','uef321','uef322','uef331','uef332','uef341','uef342','uet311','uet312','ueo311','ueo312'];

    allECUE.forEach(id => {
        const cc = parseFloat(document.getElementById(`${id}-cc`).value) || 0;
        const tp = parseFloat(document.getElementById(`${id}-tp`).value) || 0;
        const exam = parseFloat(document.getElementById(`${id}-exam`).value) || 0;
        if (cc + tp + exam === 0) return;

        hasData = true;
        const coef = CONFIG.coefficients[id];
        const p1 = (cc * 0.2).toFixed(2);
        const p2 = (tp * 0.1).toFixed(2);
        const p3 = (exam * 0.7).toFixed(2);
        const somme = (cc*0.2 + tp*0.1 + exam*0.7).toFixed(2);
        const finale = (somme * coef).toFixed(2);
        const valide = parseFloat(finale) >= 10;

        html += `
            <div class="detail-item fade-in">
                <div class="detail-title">${getECUEName(id)} (coef ${coef})</div>
                <div class="detail-formula">
                    ${cc} × 20% = ${p1} │ ${tp} × 10% = ${p2} │ ${exam} × 70% = ${p3}<br>
                    <strong>(${p1} + ${p2} + ${p3}) × ${coef} = <span class="${valide?'text-success':'text-danger'}">${finale}</span></strong>
                    <span class="status-badge ${valide?'status-passed':'status-failed'}">${valide?'Validé':'Échoué'}</span>
                </div>
            </div>
        `;
    });

    el.innerHTML = hasData ? html : '<div class="no-data">Aucun détail disponible</div>';
}

function getECUEsByUE(ueId) {
    const map = {
        uef310: ['uef311'],
        uef320: ['uef321', 'uef322'],
        uef330: ['uef331', 'uef332'],
        uef340: ['uef341', 'uef342'],
        uet310: ['uet311', 'uet312'],
        ueo310: ['ueo311', 'ueo312']
    };
    return map[ueId] || [];
}

function getECUEName(id) {
    const noms = {
        uef311: 'ECUEF311 – Probabilité et statistique',
        uef321: 'ECUEF321 – Théorie des langages et Automates',
        uef322: 'ECUEF322 – Graphes et optimisation',
        uef331: 'ECUEF331 – Conception des Systèmes d\'Information',
        uef332: 'ECUEF332 – Programmation Java',
        uef341: 'ECUEF341 – Ingénierie des Bases de Données',
        uef342: 'ECUEF342 – Services des Réseaux',
        uet311: 'ECUET311 – Anglais 3',
        uet312: 'ECUET312 – Gestion d\'entreprise',
        ueo311: 'ECUEO311 – Génie Logiciel',
        ueo312: 'ECUEO312 – Design Graphique'
    };
    return noms[id] || id;
}

// === Sauvegarde et réinitialisation ===
function saveAllNotes() {
    if (!studentData.nom || !studentData.prenom) {
        showNotification('Enregistrez vos infos d\'abord.', 'warning');
        return;
    }

    const notes = {};
    let hasNote = false;

    document.querySelectorAll('.grade-input').forEach(input => {
        const value = parseFloat(input.value) || 0;
        if (value > 0) {
            const [id, type] = input.id.split('-');
            if (!notes[id]) notes[id] = { cc: 0, tp: 0, exam: 0 };
            notes[id][type] = value;
            hasNote = true;
        }
    });

    if (!hasNote) {
        showNotification('Aucune note à sauvegarder.', 'warning');
        return;
    }

    studentData.notes = notes;
    localStorage.setItem('studentNotes', JSON.stringify(notes));
    showNotification('Notes sauvegardées localement !', 'success');
}

function resetAllData() {
    if (!confirm('Êtes-vous sûr de vouloir tout effacer ?')) return;

    document.querySelectorAll('.grade-input').forEach(i => i.value = '');
    document.querySelectorAll('.grade-result').forEach(s => {
        s.textContent = '-';
        s.className = 'grade-result';
    });

    studentData.notes = {};
    localStorage.removeItem('studentNotes');

    updateUEResults();
    updateSemesterResults();
    updateCalculationDetails();

    showNotification('Tout a été réinitialisé.', 'info');
}

// === Onglets et notifications ===
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `notification notification-${type}`;
    notif.innerHTML = `<div class="notification-content"><i class="fas fa-info-circle"></i> <span>${message}</span></div>`;
    notif.style.cssText = `
        position:fixed; top:20px; right:20px; z-index:10000;
        background:${type==='success'?'#10B981':type==='warning'?'#F59E0B':type==='error'?'#EF4444':'#3B82F6'};
        color:white; padding:1rem 1.5rem; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.2);
        animation:slideInRight 0.4s ease;
    `;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => notif.remove(), 400);
    }, 5000);
}

// Animation CSS simple (tu peux l'ajouter dans ton <style>)
const anim = document.createElement('style');
anim.textContent = `
@keyframes slideInRight { from {transform:translateX(100%);opacity:0;} to {transform:translateX(0);opacity:1;} }
@keyframes slideOutRight { to {transform:translateX(100%);opacity:0;} }
.fade-in { animation: fadeIn 0.5s ease; }
@keyframes fadeIn { from {opacity:0; transform:translateY(10px);} to {opacity:1; transform:translateY(0);} }
`;
document.head.appendChild(anim);
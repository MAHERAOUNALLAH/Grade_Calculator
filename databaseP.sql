-- TABLE DES ÉTUDIANTS
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL
);

-- TABLE DES NOTES
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,

    -- NOTES PAR UNITÉ
    uef311 NUMERIC,
    uef321 NUMERIC,
    uef322 NUMERIC,
    uef331 NUMERIC,
    uef332 NUMERIC,
    uef341 NUMERIC,
    uef342 NUMERIC,
    uet311 NUMERIC,
    uet312 NUMERIC,
    ueo311 NUMERIC,
    ueo312 NUMERIC,

    -- MOYENNES
    moyenne_ue NUMERIC,
    moyenne_semestre NUMERIC,

    created_at TIMESTAMP DEFAULT NOW()
);


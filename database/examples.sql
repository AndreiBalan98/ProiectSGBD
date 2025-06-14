-- EXEMPLE DE UTILIZARE ȘI QUERY-URI

-- 1. ACTUALIZARE DATE TEST CU VÂRSTE
UPDATE USERS SET DATA_NASTERII = DATE '1990-05-15' WHERE USERNAME = 'admin';
UPDATE USERS SET DATA_NASTERII = DATE '1995-08-22' WHERE USERNAME = 'user1';
UPDATE USERS SET DATA_NASTERII = DATE '1988-12-03' WHERE USERNAME = 'user2';

-- Adăugare mai mulți utilizatori cu vârste pentru teste
INSERT INTO USERS (USERNAME, PASSWORD, EMAIL, ROLE, DATA_NASTERII) VALUES 
('user3', 'user123', 'user3@example.com', 'user', DATE '1992-03-10');
INSERT INTO USERS (USERNAME, PASSWORD, EMAIL, ROLE, DATA_NASTERII) VALUES 
('user4', 'user123', 'user4@example.com', 'user', DATE '1997-07-18');

-- 2. EXEMPLE DE UTILIZARE A VIEW-URILOR

-- Vizualizare evenimente complete
SELECT * FROM V_EVENTS_COMPLETE;

-- Statistici pe categorii
SELECT * FROM V_CATEGORY_STATS;

-- Top utilizatori activi
SELECT * FROM V_USER_ACTIVITY WHERE TOTAL_REGISTRATIONS > 0;

-- Evenimente populare
SELECT * FROM V_POPULAR_EVENTS;

-- Evenimente viitoare
SELECT * FROM V_UPCOMING_EVENTS;

-- 3. UTILIZAREA FUNCȚIILOR PL/SQL

-- Calcularea vârstei medii generale
SELECT GET_OVERALL_AVERAGE_AGE() as "Vârsta medie generală" FROM DUAL;

-- Calcularea vârstei medii pentru un eveniment specific
SELECT EVENT_MANAGER.GET_AVERAGE_AGE_FOR_EVENT(1) as "Vârsta medie eveniment 1" FROM DUAL;

-- Calcularea ratei de ocupare
SELECT EVENT_MANAGER.GET_OCCUPANCY_RATE(1) as "Rata ocupare eveniment 1" FROM DUAL;

-- Verificarea dacă un utilizator poate participa
SELECT 
    CASE 
        WHEN EVENT_MANAGER.CAN_USER_REGISTER(2, 1) THEN 'Poate participa'
        ELSE 'Nu poate participa'
    END as "Status participare"
FROM DUAL;

-- 4. GENERAREA RAPOARTELOR

-- Raport participare pentru un eveniment
SELECT EVENT_MANAGER.GENERATE_PARTICIPATION_REPORT(1) as "Raport Participare" FROM DUAL;

-- Raport complet (se afișează în DBMS_OUTPUT)
BEGIN
    DBMS_OUTPUT.ENABLE(1000000);
    EVENT_MANAGER.GENERATE_FULL_REPORT(1);
END;
/

-- 5. QUERY-URI COMPLEXE PENTRU ANALIZĂ

-- Top 5 cele mai populare evenimente
SELECT 
    TITLE,
    CATEGORY_NAME,
    VENUE_NAME,
    REGISTERED_COUNT,
    OCCUPANCY_RATE || '%' as OCCUPANCY
FROM V_POPULAR_EVENTS
WHERE ROWNUM <= 5;

-- Distribuția pe vârste a participanților
SELECT 
    CASE 
        WHEN AGE < 25 THEN '18-24'
        WHEN AGE < 35 THEN '25-34'
        WHEN AGE < 45 THEN '35-44'
        WHEN AGE >= 45 THEN '45+'
        ELSE 'Necunoscut'
    END as GRUPA_VARSTA,
    COUNT(*) as NUMAR_UTILIZATORI
FROM V_USER_ACTIVITY
GROUP BY 
    CASE 
        WHEN AGE < 25 THEN '18-24'
        WHEN AGE < 35 THEN '25-34'
        WHEN AGE < 45 THEN '35-44'
        WHEN AGE >= 45 THEN '45+'
        ELSE 'Necunoscut'
    END
ORDER BY 
    CASE 
        WHEN GRUPA_VARSTA = '18-24' THEN 1
        WHEN GRUPA_VARSTA = '25-34' THEN 2
        WHEN GRUPA_VARSTA = '35-44' THEN 3
        WHEN GRUPA_VARSTA = '45+' THEN 4
        ELSE 5
    END;

-- Performanța pe categorii cu vârsta medie
SELECT 
    c.NAME as CATEGORIA,
    c.TOTAL_EVENTS as EVENIMENTE_TOTALE,
    c.TOTAL_REGISTRATIONS as PARTICIPARI_TOTALE,
    ROUND(c.AVG_REGISTRATIONS_PER_EVENT, 2) as MEDIA_PARTICIPARI,
    ROUND(GET_AVERAGE_AGE_BY_CATEGORY(c.ID), 1) as VARSTA_MEDIE_PARTICIPANTI
FROM V_CATEGORY_STATS c
WHERE c.TOTAL_EVENTS > 0
ORDER BY c.TOTAL_REGISTRATIONS DESC;

-- Evenimente cu capacitate optimă (80-95% ocupare)
SELECT 
    TITLE,
    CATEGORY_NAME,
    VENUE_NAME,
    REGISTERED_COUNT,
    CAPACITY,
    OCCUPANCY_RATE
FROM V_EVENTS_COMPLETE
WHERE OCCUPANCY_RATE BETWEEN 80 AND 95
  AND STATUS = 'published'
ORDER BY OCCUPANCY_RATE DESC;

-- Analiza utilizatorilor inactivi
SELECT 
    USERNAME,
    EMAIL,
    AGE,
    CREATED_AT,
    MONTHS_BETWEEN(SYSDATE, CREATED_AT) as LUNI_DE_LA_INREGISTRARE
FROM V_USER_ACTIVITY
WHERE TOTAL_REGISTRATIONS = 0
  AND MONTHS_BETWEEN(SYSDATE, (SELECT CREATED_AT FROM USERS WHERE ID_USER = V_USER_ACTIVITY.ID_USER)) > 1
ORDER BY LUNI_DE_LA_INREGISTRARE DESC;

-- 6. TESTARE COMPREHENSIVĂ

-- Test complet pentru toate funcționalitățile
SELECT 'Test 1: Vârsta medie generală' as TEST, GET_OVERALL_AVERAGE_AGE() as REZULTAT FROM DUAL
UNION ALL
SELECT 'Test 2: Vârsta medie eveniment 1', EVENT_MANAGER.GET_AVERAGE_AGE_FOR_EVENT(1) FROM DUAL
UNION ALL
SELECT 'Test 3: Rata ocupare eveniment 1', EVENT_MANAGER.GET_OCCUPANCY_RATE(1) FROM DUAL
UNION ALL
SELECT 'Test 4: Poate utilizatorul 2 să se înregistreze la evenimentul 1', 
       CASE WHEN EVENT_MANAGER.CAN_USER_REGISTER(2, 1) THEN 'DA' ELSE 'NU' END FROM DUAL
UNION ALL
SELECT 'Test 5: Numărul total de evenimente', TO_CHAR(COUNT(*)) FROM EVENTS
UNION ALL
SELECT 'Test 6: Numărul total de utilizatori', TO_CHAR(COUNT(*)) FROM USERS;

-- 7. TESTARE PROCEDURI ȘI FUNCȚII AVANSATE

-- Test înregistrare utilizator la eveniment
BEGIN
    DBMS_OUTPUT.ENABLE(1000000);
    EVENT_MANAGER.REGISTER_USER_TO_EVENT(3, 1);
    DBMS_OUTPUT.PUT_LINE('Utilizatorul 3 a fost înregistrat la evenimentul 1');
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Eroare la înregistrare: ' || SQLERRM);
END;
/

-- Test anulare înregistrare
BEGIN
    DBMS_OUTPUT.ENABLE(1000000);
    EVENT_MANAGER.CANCEL_REGISTRATION(3, 1);
    DBMS_OUTPUT.PUT_LINE('Înregistrarea utilizatorului 3 la evenimentul 1 a fost anulată');
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Eroare la anulare: ' || SQLERRM);
END;
/

-- 8. RAPOARTE DETALIATE

-- Raport detaliat evenimente pe lună
SELECT 
    TO_CHAR(START_DATE, 'YYYY-MM') as LUNA,
    COUNT(*) as NUMAR_EVENIMENTE,
    SUM(REGISTERED_COUNT) as TOTAL_PARTICIPANTI,
    ROUND(AVG(OCCUPANCY_RATE), 2) as OCUPARE_MEDIE,
    MAX(OCCUPANCY_RATE) as OCUPARE_MAXIMA
FROM V_EVENTS_COMPLETE
WHERE START_DATE >= ADD_MONTHS(SYSDATE, -12)
GROUP BY TO_CHAR(START_DATE, 'YYYY-MM')
ORDER BY LUNA DESC;

-- Top venue-uri după popularitate
SELECT 
    v.NAME as VENUE_NAME,
    v.LOCATION,
    v.CAPACITY,
    COUNT(e.ID_EVENT) as NUMAR_EVENIMENTE,
    SUM(r.REGISTERED_COUNT) as TOTAL_PARTICIPANTI,
    ROUND(AVG(r.OCCUPANCY_RATE), 2) as OCUPARE_MEDIE
FROM VENUES v
LEFT JOIN EVENTS e ON v.ID_VENUE = e.ID_VENUE
LEFT JOIN (
    SELECT 
        ID_EVENT,
        COUNT(*) as REGISTERED_COUNT,
        ROUND((COUNT(*) * 100.0 / MAX(v2.CAPACITY)), 2) as OCCUPANCY_RATE
    FROM REGISTRATIONS r2
    JOIN EVENTS e2 ON r2.ID_EVENT = e2.ID_EVENT
    JOIN VENUES v2 ON e2.ID_VENUE = v2.ID_VENUE
    GROUP BY ID_EVENT
) r ON e.ID_EVENT = r.ID_EVENT
GROUP BY v.ID_VENUE, v.NAME, v.LOCATION, v.CAPACITY
HAVING COUNT(e.ID_EVENT) > 0
ORDER BY TOTAL_PARTICIPANTI DESC NULLS LAST;

-- 9. ANALIZE TEMPORALE

-- Evenimente pe zile din săptămână
SELECT 
    TO_CHAR(START_DATE, 'DAY') as ZIUA_SAPTAMANII,
    COUNT(*) as NUMAR_EVENIMENTE,
    ROUND(AVG(REGISTERED_COUNT), 2) as MEDIA_PARTICIPANTI
FROM V_EVENTS_COMPLETE
GROUP BY TO_CHAR(START_DATE, 'DAY'), TO_CHAR(START_DATE, 'D')
ORDER BY TO_CHAR(START_DATE, 'D');

-- Tendințe sezoniere
SELECT 
    CASE 
        WHEN EXTRACT(MONTH FROM START_DATE) IN (12, 1, 2) THEN 'Iarnă'
        WHEN EXTRACT(MONTH FROM START_DATE) IN (3, 4, 5) THEN 'Primăvară'
        WHEN EXTRACT(MONTH FROM START_DATE) IN (6, 7, 8) THEN 'Vară'
        WHEN EXTRACT(MONTH FROM START_DATE) IN (9, 10, 11) THEN 'Toamnă'
    END as SEZONUL,
    COUNT(*) as NUMAR_EVENIMENTE,
    SUM(REGISTERED_COUNT) as TOTAL_PARTICIPANTI,
    ROUND(AVG(OCCUPANCY_RATE), 2) as OCUPARE_MEDIE
FROM V_EVENTS_COMPLETE
GROUP BY 
    CASE 
        WHEN EXTRACT(MONTH FROM START_DATE) IN (12, 1, 2) THEN 'Iarnă'
        WHEN EXTRACT(MONTH FROM START_DATE) IN (3, 4, 5) THEN 'Primăvară'
        WHEN EXTRACT(MONTH FROM START_DATE) IN (6, 7, 8) THEN 'Vară'
        WHEN EXTRACT(MONTH FROM START_DATE) IN (9, 10, 11) THEN 'Toamnă'
    END
ORDER BY 
    CASE 
        WHEN SEZONUL = 'Primăvară' THEN 1
        WHEN SEZONUL = 'Vară' THEN 2
        WHEN SEZONUL = 'Toamnă' THEN 3
        WHEN SEZONUL = 'Iarnă' THEN 4
    END;

-- 10. VALIDĂRI ȘI VERIFICĂRI

-- Verificare integritate date
SELECT 'Verificare' as TIPUL_VERIFICARII, 'Evenimente fără categorie' as DESCRIEREA, COUNT(*) as NUMAR
FROM EVENTS WHERE ID_CATEGORY IS NULL
UNION ALL
SELECT 'Verificare', 'Evenimente fără venue', COUNT(*) FROM EVENTS WHERE ID_VENUE IS NULL
UNION ALL
SELECT 'Verificare', 'Utilizatori fără email', COUNT(*) FROM USERS WHERE EMAIL IS NULL
UNION ALL
SELECT 'Verificare', 'Înregistrări pentru evenimente inexistente', COUNT(*) 
FROM REGISTRATIONS r WHERE NOT EXISTS (SELECT 1 FROM EVENTS e WHERE e.ID_EVENT = r.ID_EVENT)
UNION ALL
SELECT 'Verificare', 'Înregistrări pentru utilizatori inexistenți', COUNT(*)
FROM REGISTRATIONS r WHERE NOT EXISTS (SELECT 1 FROM USERS u WHERE u.ID_USER = r.ID_USER);

-- Statistici generale finale
SELECT 
    'STATISTICI GENERALE' as SECTIUNEA,
    '' as DETALIU,
    '' as VALOARE
FROM DUAL
UNION ALL
SELECT '', 'Total utilizatori înregistrați:', TO_CHAR(COUNT(*)) FROM USERS
UNION ALL
SELECT '', 'Total evenimente create:', TO_CHAR(COUNT(*)) FROM EVENTS
UNION ALL
SELECT '', 'Total categorii disponibile:', TO_CHAR(COUNT(*)) FROM CATEGORIES
UNION ALL
SELECT '', 'Total venue-uri disponibile:', TO_CHAR(COUNT(*)) FROM VENUES
UNION ALL
SELECT '', 'Total înregistrări la evenimente:', TO_CHAR(COUNT(*)) FROM REGISTRATIONS
UNION ALL
SELECT '', 'Vârsta medie utilizatori:', TO_CHAR(ROUND(GET_OVERALL_AVERAGE_AGE(), 1)) || ' ani' FROM DUAL
UNION ALL
SELECT '', 'Rata medie de ocupare:', TO_CHAR(ROUND(AVG(OCCUPANCY_RATE), 2)) || '%' FROM V_EVENTS_COMPLETE;

-- 11. CLEANUP ȘI MENTENTANȚĂ (OPȚIONAL)

-- Comentează următoarele linii pentru a executa cleanup
/*
-- Ștergere înregistrări vechi (mai vechi de 2 ani)
DELETE FROM REGISTRATIONS 
WHERE ID_EVENT IN (
    SELECT ID_EVENT FROM EVENTS 
    WHERE END_DATE < ADD_MONTHS(SYSDATE, -24)
);

-- Ștergere evenimente vechi
DELETE FROM EVENTS WHERE END_DATE < ADD_MONTHS(SYSDATE, -24);

-- Resetare secvențe (dacă este necesar)
-- ALTER SEQUENCE SEQ_USERS RESTART START WITH 1;
-- ALTER SEQUENCE SEQ_EVENTS RESTART START WITH 1;
-- ALTER SEQUENCE SEQ_REGISTRATIONS RESTART START WITH 1;
*/

-- FIN SCRIPT TESTE ȘI EXEMPLE
COMMIT;
-- PACHET PL/SQL PENTRU MANAGEMENTUL EVENIMENTELOR

-- 1. SPECIFICAȚIA PACHETULUI
CREATE OR REPLACE PACKAGE EVENT_MANAGER AS
    
    -- Funcție pentru calcularea vârstei medii a participanților la un eveniment
    FUNCTION GET_AVERAGE_AGE_FOR_EVENT(p_event_id NUMBER) RETURN NUMBER;
    
    -- Funcție pentru generarea raportului de participare
    FUNCTION GENERATE_PARTICIPATION_REPORT(p_event_id NUMBER) RETURN VARCHAR2;
    
    -- Funcție pentru calcularea ratei de ocupare
    FUNCTION GET_OCCUPANCY_RATE(p_event_id NUMBER) RETURN NUMBER;
    
    -- Funcție pentru verificarea dacă un utilizator poate participa
    FUNCTION CAN_USER_REGISTER(p_user_id NUMBER, p_event_id NUMBER) RETURN BOOLEAN;
    
    -- Procedură pentru generarea raportului complet
    PROCEDURE GENERATE_FULL_REPORT(p_event_id NUMBER);
    
END EVENT_MANAGER;
/

-- 2. IMPLEMENTAREA PACHETULUI
CREATE OR REPLACE PACKAGE BODY EVENT_MANAGER AS

    -- Calcularea vârstei medii participanților
    FUNCTION GET_AVERAGE_AGE_FOR_EVENT(p_event_id NUMBER) RETURN NUMBER AS
        v_avg_age NUMBER;
    BEGIN
        SELECT AVG(FLOOR(MONTHS_BETWEEN(SYSDATE, u.DATA_NASTERII) / 12))
        INTO v_avg_age
        FROM REGISTRATIONS r
        JOIN USERS u ON r.USER_ID = u.ID_USER
        WHERE r.EVENT_ID = p_event_id
          AND u.DATA_NASTERII IS NOT NULL;
          
        RETURN NVL(v_avg_age, 0);
        
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN 0;
        WHEN OTHERS THEN
            RETURN -1;
    END GET_AVERAGE_AGE_FOR_EVENT;

    -- Generarea raportului de participare
    FUNCTION GENERATE_PARTICIPATION_REPORT(p_event_id NUMBER) RETURN VARCHAR2 AS
        v_report VARCHAR2(4000);
        v_event_title VARCHAR2(200);
        v_total_capacity NUMBER;
        v_registered_count NUMBER;
        v_avg_age NUMBER;
        v_venue_name VARCHAR2(200);
        v_category_name VARCHAR2(100);
        v_event_date DATE;
    BEGIN
        -- Obținerea informațiilor despre eveniment
        SELECT e.TITLE, e.CAPACITY, e.DATE_EVENT, 
               v.NAME, c.NAME
        INTO v_event_title, v_total_capacity, v_event_date,
             v_venue_name, v_category_name
        FROM EVENTS e
        LEFT JOIN VENUES v ON e.VENUE_ID = v.ID
        LEFT JOIN CATEGORIES c ON e.CATEGORY_ID = c.ID
        WHERE e.ID = p_event_id;
        
        -- Numărul de participanți înregistrați
        SELECT COUNT(*)
        INTO v_registered_count
        FROM REGISTRATIONS
        WHERE EVENT_ID = p_event_id;
        
        -- Vârsta medie
        v_avg_age := GET_AVERAGE_AGE_FOR_EVENT(p_event_id);
        
        -- Construirea raportului
        v_report := '=== RAPORT PARTICIPARE EVENIMENT ===' || CHR(10) ||
                   'Eveniment: ' || v_event_title || CHR(10) ||
                   'Data: ' || TO_CHAR(v_event_date, 'DD.MM.YYYY HH24:MI') || CHR(10) ||
                   'Locația: ' || NVL(v_venue_name, 'Nespecificată') || CHR(10) ||
                   'Categoria: ' || NVL(v_category_name, 'Nespecificată') || CHR(10) ||
                   'Capacitate totală: ' || v_total_capacity || CHR(10) ||
                   'Participanți înregistrați: ' || v_registered_count || CHR(10) ||
                   'Locuri disponibile: ' || (v_total_capacity - v_registered_count) || CHR(10) ||
                   'Rata de ocupare: ' || ROUND((v_registered_count / v_total_capacity) * 100, 2) || '%' || CHR(10) ||
                   'Vârsta medie participanți: ' || 
                   CASE 
                       WHEN v_avg_age > 0 THEN TO_CHAR(v_avg_age, '999.9') || ' ani'
                       ELSE 'Nu există date'
                   END || CHR(10) ||
                   '==================================';
        
        RETURN v_report;
        
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN 'Evenimentul cu ID ' || p_event_id || ' nu există.';
        WHEN OTHERS THEN
            RETURN 'Eroare la generarea raportului: ' || SQLERRM;
    END GENERATE_PARTICIPATION_REPORT;

    -- Calcularea ratei de ocupare
    FUNCTION GET_OCCUPANCY_RATE(p_event_id NUMBER) RETURN NUMBER AS
        v_capacity NUMBER;
        v_registered NUMBER;
        v_rate NUMBER;
    BEGIN
        SELECT e.CAPACITY, NVL(COUNT(r.ID), 0)
        INTO v_capacity, v_registered
        FROM EVENTS e
        LEFT JOIN REGISTRATIONS r ON e.ID = r.EVENT_ID
        WHERE e.ID = p_event_id
        GROUP BY e.CAPACITY;
        
        IF v_capacity > 0 THEN
            v_rate := (v_registered / v_capacity) * 100;
        ELSE
            v_rate := 0;
        END IF;
        
        RETURN ROUND(v_rate, 2);
        
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN -1;
        WHEN OTHERS THEN
            RETURN -1;
    END GET_OCCUPANCY_RATE;

    -- Verificarea dacă utilizatorul poate participa
    FUNCTION CAN_USER_REGISTER(p_user_id NUMBER, p_event_id NUMBER) RETURN BOOLEAN AS
        v_is_registered NUMBER;
        v_capacity NUMBER;
        v_registered_count NUMBER;
        v_event_status VARCHAR2(20);
        v_event_date DATE;
    BEGIN
        -- Verifică dacă utilizatorul este deja înregistrat
        SELECT COUNT(*)
        INTO v_is_registered
        FROM REGISTRATIONS
        WHERE USER_ID = p_user_id AND EVENT_ID = p_event_id;
        
        IF v_is_registered > 0 THEN
            RETURN FALSE; -- Deja înregistrat
        END IF;
        
        -- Verifică statusul și capacitatea evenimentului
        SELECT e.CAPACITY, e.STATUS, e.DATE_EVENT, NVL(COUNT(r.ID), 0)
        INTO v_capacity, v_event_status, v_event_date, v_registered_count
        FROM EVENTS e
        LEFT JOIN REGISTRATIONS r ON e.ID = r.EVENT_ID
        WHERE e.ID = p_event_id
        GROUP BY e.CAPACITY, e.STATUS, e.DATE_EVENT;
        
        -- Verificări
        IF v_event_status != 'published' THEN
            RETURN FALSE; -- Evenimentul nu este publicat
        END IF;
        
        IF v_event_date <= SYSDATE THEN
            RETURN FALSE; -- Evenimentul a trecut
        END IF;
        
        IF v_registered_count >= v_capacity THEN
            RETURN FALSE; -- Evenimentul este complet
        END IF;
        
        RETURN TRUE;
        
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN FALSE;
        WHEN OTHERS THEN
            RETURN FALSE;
    END CAN_USER_REGISTER;

    -- Procedură pentru raportul complet
    PROCEDURE GENERATE_FULL_REPORT(p_event_id NUMBER) AS
        v_report VARCHAR2(4000);
    BEGIN
        v_report := GENERATE_PARTICIPATION_REPORT(p_event_id);
        DBMS_OUTPUT.PUT_LINE(v_report);
        
        -- Adăugăm și lista participanților
        DBMS_OUTPUT.PUT_LINE(CHR(10) || '=== LISTA PARTICIPANȚILOR ===' || CHR(10));
        
        FOR participant IN (
            SELECT u.USERNAME, u.EMAIL, 
                   CASE 
                       WHEN u.DATA_NASTERII IS NOT NULL 
                       THEN FLOOR(MONTHS_BETWEEN(SYSDATE, u.DATA_NASTERII) / 12) || ' ani'
                       ELSE 'Vârstă necunoscută'
                   END as AGE,
                   r.REGISTERED_AT
            FROM REGISTRATIONS r
            JOIN USERS u ON r.USER_ID = u.ID_USER
            WHERE r.EVENT_ID = p_event_id
            ORDER BY r.REGISTERED_AT
        ) LOOP
            DBMS_OUTPUT.PUT_LINE('• ' || participant.USERNAME || 
                               ' (' || participant.EMAIL || ') - ' ||
                               participant.AGE ||
                               ' - Înregistrat: ' || TO_CHAR(participant.REGISTERED_AT, 'DD.MM.YYYY HH24:MI'));
        END LOOP;
        
    EXCEPTION
        WHEN OTHERS THEN
            DBMS_OUTPUT.PUT_LINE('Eroare la generarea raportului complet: ' || SQLERRM);
    END GENERATE_FULL_REPORT;

END EVENT_MANAGER;
/

-- 3. FUNCȚII STANDALONE PENTRU CALCULAREA VÂRSTEI MEDII

-- Funcție pentru vârsta medie generală (toți utilizatorii)
CREATE OR REPLACE FUNCTION GET_OVERALL_AVERAGE_AGE RETURN NUMBER AS
    v_avg_age NUMBER;
BEGIN
    SELECT AVG(FLOOR(MONTHS_BETWEEN(SYSDATE, DATA_NASTERII) / 12))
    INTO v_avg_age
    FROM USERS
    WHERE DATA_NASTERII IS NOT NULL
      AND ROLE = 'user';
      
    RETURN NVL(v_avg_age, 0);
    
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 0;
    WHEN OTHERS THEN
        RETURN -1;
END GET_OVERALL_AVERAGE_AGE;
/

-- Funcție pentru vârsta medie pe categorie de evenimente
CREATE OR REPLACE FUNCTION GET_AVERAGE_AGE_BY_CATEGORY(p_category_id NUMBER) RETURN NUMBER AS
    v_avg_age NUMBER;
BEGIN
    SELECT AVG(FLOOR(MONTHS_BETWEEN(SYSDATE, u.DATA_NASTERII) / 12))
    INTO v_avg_age
    FROM REGISTRATIONS r
    JOIN USERS u ON r.USER_ID = u.ID_USER
    JOIN EVENTS e ON r.EVENT_ID = e.ID
    WHERE e.CATEGORY_ID = p_category_id
      AND u.DATA_NASTERII IS NOT NULL;
      
    RETURN NVL(v_avg_age, 0);
    
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 0;
    WHEN OTHERS THEN
        RETURN -1;
END GET_AVERAGE_AGE_BY_CATEGORY;
/
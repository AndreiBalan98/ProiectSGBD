-- SCRIPT SQL COMBINAT - INSERARE DATE INIȚIALE
-- ================================================

-- 1. INSERAREA UTILIZATORILOR DE TEST
-- -----------------------------------
INSERT INTO USERS (USERNAME, PASSWORD, EMAIL, ROLE) VALUES 
('admin', 'admin123', 'admin@example.com', 'admin');

INSERT INTO USERS (USERNAME, PASSWORD, EMAIL, ROLE) VALUES 
('user1', 'user123', 'user1@example.com', 'user');

INSERT INTO USERS (USERNAME, PASSWORD, EMAIL, ROLE) VALUES 
('user2', 'user123', 'user2@example.com', 'user');

-- Verifică ID-urile generate pentru utilizatori
SELECT ID_USER, USERNAME FROM USERS;

-- 2. INSERAREA CATEGORIILOR
-- -------------------------
INSERT INTO CATEGORIES (NAME, DESCRIPTION, COLOR) VALUES 
('Tehnologie', 'Evenimente legate de IT și tehnologie', '#007bff');

INSERT INTO CATEGORIES (NAME, DESCRIPTION, COLOR) VALUES 
('Business', 'Conferințe și workshop-uri de business', '#28a745');

INSERT INTO CATEGORIES (NAME, DESCRIPTION, COLOR) VALUES 
('Educație', 'Seminarii și cursuri educaționale', '#ffc107');

INSERT INTO CATEGORIES (NAME, DESCRIPTION, COLOR) VALUES 
('Cultură', 'Evenimente culturale și artistice', '#e83e8c');

-- 3. INSERAREA LOCAȚIILOR (VENUES)
-- --------------------------------
INSERT INTO VENUES (NAME, ADDRESS, CITY, MAX_CAPACITY, FACILITIES, CONTACT_PHONE, CONTACT_EMAIL) VALUES 
('Sala Mare Universitatea Tehnică', 'Bd. Carol I nr. 11', 'Iași', 200, 
 '{"projector": true, "audio_system": true, "wifi": true, "parking": true}', 
 '0232-123456', 'sala.mare@tuiasi.ro');

INSERT INTO VENUES (NAME, ADDRESS, CITY, MAX_CAPACITY, FACILITIES, CONTACT_PHONE, CONTACT_EMAIL) VALUES 
('Laboratorul 5 Facultatea de Informatică', 'Bd. Carol I nr. 11, Corp C', 'Iași', 50, 
 '{"computers": 30, "projector": true, "wifi": true, "air_conditioning": true}', 
 '0232-123457', 'lab5@info.uaic.ro');

INSERT INTO VENUES (NAME, ADDRESS, CITY, MAX_CAPACITY, FACILITIES, CONTACT_PHONE, CONTACT_EMAIL) VALUES 
('Centrul de Conferințe Palas', 'Strada Palas nr. 7A', 'Iași', 300, 
 '{"projector": true, "audio_system": true, "wifi": true, "catering": true, "parking": true}', 
 '0232-123458', 'events@palas.ro');

-- 4. INSERAREA EVENIMENTELOR DE TEST
-- ----------------------------------
INSERT INTO EVENTS (TITLE, DESCRIPTION, DATE_EVENT, LOCATION, CAPACITY, ORGANIZER_ID) VALUES 
('Conferința Tech 2025', 'O conferință despre cele mai noi tehnologii', 
 TO_TIMESTAMP('2025-07-15 10:00', 'YYYY-MM-DD HH24:MI'), 
 'Sala Mare, Universitatea Tehnică', 100, 1);

INSERT INTO EVENTS (TITLE, DESCRIPTION, DATE_EVENT, LOCATION, CAPACITY, ORGANIZER_ID) VALUES 
('Workshop JavaScript', 'Workshop practic de JavaScript pentru începători', 
 TO_TIMESTAMP('2025-06-20 14:00', 'YYYY-MM-DD HH24:MI'), 
 'Laboratorul 5, Facultatea de Informatică', 30, 1);

-- 5. ACTUALIZAREA EVENIMENTELOR CU CATEGORII ȘI LOCAȚII
-- -----------------------------------------------------
-- Asociază evenimentele cu categoriile și locațiile corespunzătoare
UPDATE EVENTS SET CATEGORY_ID = 1, VENUE_ID = 1, STATUS = 'published' 
WHERE TITLE LIKE '%Tech%';

UPDATE EVENTS SET CATEGORY_ID = 1, VENUE_ID = 2, STATUS = 'published' 
WHERE TITLE LIKE '%JavaScript%';

-- 6. CONFIRMARE TOATE MODIFICĂRILE
-- --------------------------------
COMMIT;

-- 7. VERIFICARE FINALĂ A DATELOR INSERARE
-- ---------------------------------------
SELECT 'USERS' as TABLE_NAME, COUNT(*) as RECORDS FROM USERS
UNION ALL
SELECT 'CATEGORIES', COUNT(*) FROM CATEGORIES
UNION ALL
SELECT 'VENUES', COUNT(*) FROM VENUES
UNION ALL
SELECT 'EVENTS', COUNT(*) FROM EVENTS;
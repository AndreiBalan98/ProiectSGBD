-- ===================================================
-- SCRIPT DE ȘTERGERE COMPLETĂ A SCHEMEI DE EVENIMENTE
-- ===================================================

-- 1. Ștergerea trigger-elor
DROP TRIGGER trg_registrations_id;
DROP TRIGGER trg_events_id;
DROP TRIGGER trg_venues_id;
DROP TRIGGER trg_categories_id;
DROP TRIGGER trg_users_id;

-- 2. Ștergerea tabelelor în ordinea inversă a dependențelor
DROP TABLE REGISTRATIONS CASCADE CONSTRAINTS;
DROP TABLE EVENTS CASCADE CONSTRAINTS;
DROP TABLE VENUES CASCADE CONSTRAINTS;
DROP TABLE CATEGORIES CASCADE CONSTRAINTS;
DROP TABLE USERS CASCADE CONSTRAINTS;

-- 3. Ștergerea secvențelor
DROP SEQUENCE seq_registrations_id;
DROP SEQUENCE seq_events_id;
DROP SEQUENCE seq_venues_id;
DROP SEQUENCE seq_categories_id;
DROP SEQUENCE seq_users_id;

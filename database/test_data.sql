-- Inserarea utilizatorilor de test
INSERT INTO USERS (USERNAME, PASSWORD, EMAIL, ROLE) VALUES 
('admin', 'admin123', 'admin@example.com', 'admin');

INSERT INTO USERS (USERNAME, PASSWORD, EMAIL, ROLE) VALUES 
('user1', 'user123', 'user1@example.com', 'user');

INSERT INTO USERS (USERNAME, PASSWORD, EMAIL, ROLE) VALUES 
('user2', 'user123', 'user2@example.com', 'user');

-- Verifică ID-urile generate
SELECT ID_USER, USERNAME FROM USERS;

-- Inserarea unor evenimente de test (folosește ID-ul real al adminului)
INSERT INTO EVENTS (TITLE, DESCRIPTION, DATE_EVENT, LOCATION, CAPACITY, ORGANIZER_ID) VALUES 
('Conferința Tech 2025', 'O conferință despre cele mai noi tehnologii', 
 TO_TIMESTAMP('2025-07-15 10:00', 'YYYY-MM-DD HH24:MI'), 
 'Sala Mare, Universitatea Tehnică', 100, 1);

INSERT INTO EVENTS (TITLE, DESCRIPTION, DATE_EVENT, LOCATION, CAPACITY, ORGANIZER_ID) VALUES 
('Workshop JavaScript', 'Workshop practic de JavaScript pentru începători', 
 TO_TIMESTAMP('2025-06-20 14:00', 'YYYY-MM-DD HH24:MI'), 
 'Laboratorul 5, Facultatea de Informatică', 30, 1);

-- Confirmă inserarea
COMMIT;
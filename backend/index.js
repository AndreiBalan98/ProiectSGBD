const express = require('express');
const cors = require('cors');
const oracledb = require('oracledb');

const app = express();
app.use(cors());
app.use(express.json());

// Configurare DB
const dbConfig = {
    user: 'system',
    password: 'oracle',
    connectString: 'oracle-xe:1521/XE'
};

// Login
app.post('/login', async (req, res) => {
    const { username, password, role } = req.body;
    
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
        `SELECT ID_USER, USERNAME, ROLE FROM USERS 
         WHERE USERNAME = :username AND PASSWORD = :password AND ROLE = :role`,
        { username, password, role }
    );
    await connection.close();

    if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Credențiale invalide!' });
    }

    const user = result.rows[0];
    res.json({ id_user: user[0], username: user[1], role: user[2] });
});

// Signup
app.post('/signup', async (req, res) => {
    const { username, password, email, role } = req.body;
    
    const connection = await oracledb.getConnection(dbConfig);
    await connection.execute(
        `INSERT INTO USERS (USERNAME, PASSWORD, EMAIL, ROLE) 
         VALUES (:username, :password, :email, :role)`,
        { username, password, email, role },
        { autoCommit: true }
    );
    await connection.close();

    res.json({ message: 'Utilizator creat!' });
});

// Toate evenimentele
app.get('/events', async (req, res) => {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`
        SELECT e.ID, e.TITLE, e.DESCRIPTION, e.DATE_EVENT, e.LOCATION, e.CAPACITY,
               u.USERNAME as ORGANIZER_NAME, NVL(r.REGISTERED_COUNT, 0) as REGISTERED_COUNT
        FROM EVENTS e
        JOIN USERS u ON e.ORGANIZER_ID = u.ID_USER
        LEFT JOIN (
            SELECT EVENT_ID, COUNT(*) as REGISTERED_COUNT
            FROM REGISTRATIONS GROUP BY EVENT_ID
        ) r ON e.ID = r.EVENT_ID
        ORDER BY e.DATE_EVENT ASC
    `);
    await connection.close();

    const events = result.rows.map(row => ({
        id: row[0], title: row[1], description: row[2], date: row[3],
        location: row[4], capacity: row[5], organizer_name: row[6], registered_count: row[7]
    }));

    res.json(events);
});

// Evenimente admin
app.get('/admin/events', async (req, res) => {
    const { adminId } = req.query;
    
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`
        SELECT e.ID, e.TITLE, e.DESCRIPTION, e.DATE_EVENT, e.LOCATION, e.CAPACITY,
               NVL(r.REGISTERED_COUNT, 0) as REGISTERED_COUNT
        FROM EVENTS e
        LEFT JOIN (
            SELECT EVENT_ID, COUNT(*) as REGISTERED_COUNT
            FROM REGISTRATIONS GROUP BY EVENT_ID
        ) r ON e.ID = r.EVENT_ID
        WHERE e.ORGANIZER_ID = :adminId
        ORDER BY e.DATE_EVENT ASC
    `, { adminId });
    await connection.close();

    const events = result.rows.map(row => ({
        id: row[0], title: row[1], description: row[2], date: row[3],
        location: row[4], capacity: row[5], registered_count: row[6]
    }));

    res.json(events);
});

// Creare eveniment
app.post('/admin/events', async (req, res) => {
    const { title, description, date, location, capacity, organizerId } = req.body;
    
    const connection = await oracledb.getConnection(dbConfig);
    await connection.execute(`
        INSERT INTO EVENTS (TITLE, DESCRIPTION, DATE_EVENT, LOCATION, CAPACITY, ORGANIZER_ID)
        VALUES (:title, :description, TO_TIMESTAMP(:date, 'YYYY-MM-DD"T"HH24:MI'), :location, :capacity, :organizerId)
    `, { title, description, date, location, capacity, organizerId }, { autoCommit: true });
    await connection.close();

    res.json({ message: 'Eveniment creat!' });
});

// Actualizare eveniment
app.put('/admin/events/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, date, location, capacity } = req.body;
    
    const connection = await oracledb.getConnection(dbConfig);
    await connection.execute(`
        UPDATE EVENTS 
        SET TITLE = :title, DESCRIPTION = :description, DATE_EVENT = TO_TIMESTAMP(:date, 'YYYY-MM-DD"T"HH24:MI'), 
            LOCATION = :location, CAPACITY = :capacity
        WHERE ID = :id
    `, { title, description, date, location, capacity, id }, { autoCommit: true });
    await connection.close();

    res.json({ message: 'Eveniment actualizat!' });
});

// Ștergere eveniment
app.delete('/admin/events/:id', async (req, res) => {
    const { id } = req.params;
    
    const connection = await oracledb.getConnection(dbConfig);
    await connection.execute(`DELETE FROM REGISTRATIONS WHERE EVENT_ID = :id`, { id });
    await connection.execute(`DELETE FROM EVENTS WHERE ID = :id`, { id }, { autoCommit: true });
    await connection.close();

    res.json({ message: 'Eveniment șters!' });
});

// Înregistrare la eveniment
app.post('/register/:eventId', async (req, res) => {
    const { eventId } = req.params;
    const { userId } = req.body;
    
    const connection = await oracledb.getConnection(dbConfig);
    
    // Verificare capacitate
    const capacityCheck = await connection.execute(`
        SELECT e.CAPACITY, NVL(r.REGISTERED_COUNT, 0) as REGISTERED_COUNT
        FROM EVENTS e
        LEFT JOIN (
            SELECT EVENT_ID, COUNT(*) as REGISTERED_COUNT
            FROM REGISTRATIONS WHERE EVENT_ID = :eventId GROUP BY EVENT_ID
        ) r ON e.ID = r.EVENT_ID
        WHERE e.ID = :eventId
    `, { eventId });

    if (capacityCheck.rows.length === 0) {
        await connection.close();
        return res.status(404).json({ message: 'Eveniment inexistent!' });
    }

    const [capacity, registeredCount] = capacityCheck.rows[0];
    if (registeredCount >= capacity) {
        await connection.close();
        return res.status(400).json({ message: 'Eveniment complet!' });
    }

    try {
        await connection.execute(`
            INSERT INTO REGISTRATIONS (USER_ID, EVENT_ID) VALUES (:userId, :eventId)
        `, { userId, eventId }, { autoCommit: true });
        res.json({ message: 'Înregistrare reușită!' });
    } catch (error) {
        if (error.errorNum === 1) {
            res.status(400).json({ message: 'Deja înregistrat!' });
        } else {
            res.status(500).json({ message: 'Eroare!' });
        }
    }
    
    await connection.close();
});

// Renunțare la eveniment
app.delete('/unregister/:eventId', async (req, res) => {
    const { eventId } = req.params;
    const { userId } = req.body;
    
    const connection = await oracledb.getConnection(dbConfig);
    await connection.execute(`
        DELETE FROM REGISTRATIONS WHERE USER_ID = :userId AND EVENT_ID = :eventId
    `, { userId, eventId }, { autoCommit: true });
    await connection.close();

    res.json({ message: 'Renunțare reușită!' });
});

// Înregistrări utilizator
app.get('/user/registrations', async (req, res) => {
    const { userId } = req.query;
    
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`
        SELECT EVENT_ID, REGISTERED_AT FROM REGISTRATIONS WHERE USER_ID = :userId
    `, { userId });
    await connection.close();

    const registrations = result.rows.map(row => ({
        event_id: row[0], registered_at: row[1]
    }));

    res.json(registrations);
});

app.listen(3000, () => console.log('Server pe portul 3000'));
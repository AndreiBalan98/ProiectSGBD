const express = require('express');
const cors = require('cors');
const oracledb = require('oracledb');

oracledb.initOracleClient({ libDir: '/opt/oracle/instantclient' });

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

// 1. Endpoint pentru categorii
app.get('/categories', async (req, res) => {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`SELECT * FROM CATEGORIES ORDER BY NAME`);
    await connection.close();
    
    const categories = result.rows.map(row => ({
        id: row[0], name: row[1], description: row[2], color: row[3]
    }));
    res.json(categories);
});

// 2. Endpoint pentru venue-uri
app.get('/venues', async (req, res) => {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`SELECT * FROM VENUES ORDER BY NAME`);
    await connection.close();
    
    const venues = result.rows.map(row => ({
        id: row[0], name: row[1], address: row[2], city: row[3], 
        max_capacity: row[4], facilities: row[5]
    }));
    res.json(venues);
});

// Toate evenimentele (pentru utilizatori)
app.get('/events', async (req, res) => {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`
        SELECT e.ID, e.TITLE, e.DESCRIPTION, e.DATE_EVENT, e.LOCATION, e.CAPACITY,
               e.STATUS, u.USERNAME as ORGANIZER_NAME, 
               c.NAME as CATEGORY_NAME, c.COLOR as CATEGORY_COLOR,
               v.NAME as VENUE_NAME, v.ADDRESS as VENUE_ADDRESS,
               NVL(r.REGISTERED_COUNT, 0) as REGISTERED_COUNT
        FROM EVENTS e
        JOIN USERS u ON e.ORGANIZER_ID = u.ID_USER
        LEFT JOIN CATEGORIES c ON e.CATEGORY_ID = c.ID
        LEFT JOIN VENUES v ON e.VENUE_ID = v.ID
        LEFT JOIN (
            SELECT EVENT_ID, COUNT(*) as REGISTERED_COUNT
            FROM REGISTRATIONS GROUP BY EVENT_ID
        ) r ON e.ID = r.EVENT_ID
        WHERE e.STATUS = 'published'
        ORDER BY e.DATE_EVENT ASC
    `);
    await connection.close();

    const events = result.rows.map(row => ({
        id: row[0], title: row[1], description: row[2], date: row[3],
        location: row[4], capacity: row[5], status: row[6],
        organizer_name: row[7], category_name: row[8], category_color: row[9],
        venue_name: row[10], venue_address: row[11], registered_count: row[12]
    }));

    res.json(events);
});

// Evenimente admin
app.get('/admin/events', async (req, res) => {
    const { adminId } = req.query;
    
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`
        SELECT e.ID, e.TITLE, e.DESCRIPTION, e.DATE_EVENT, e.LOCATION, e.CAPACITY,
               e.STATUS, e.CATEGORY_ID, e.VENUE_ID, e.CREATED_AT,
               c.NAME as CATEGORY_NAME, v.NAME as VENUE_NAME,
               NVL(r.REGISTERED_COUNT, 0) as REGISTERED_COUNT
        FROM EVENTS e
        LEFT JOIN CATEGORIES c ON e.CATEGORY_ID = c.ID
        LEFT JOIN VENUES v ON e.VENUE_ID = v.ID
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
        location: row[4], capacity: row[5], status: row[6],
        category_id: row[7], venue_id: row[8], created_at: row[9],
        category_name: row[10], venue_name: row[11], registered_count: row[12]
    }));

    res.json(events);
});

// Creare eveniment
app.post('/admin/events', async (req, res) => {
    const { title, description, date, location, capacity, organizerId, categoryId, venueId, status = 'draft' } = req.body;
    
    try {
        const connection = await oracledb.getConnection(dbConfig);
        await connection.execute(`
            INSERT INTO EVENTS (TITLE, DESCRIPTION, DATE_EVENT, LOCATION, CAPACITY, 
                               ORGANIZER_ID, CATEGORY_ID, VENUE_ID, STATUS)
            VALUES (:title, :description, TO_TIMESTAMP(:date, 'YYYY-MM-DD"T"HH24:MI'), 
                    :location, :capacity, :organizerId, :categoryId, :venueId, :status)
        `, { 
            title, 
            description, 
            date, 
            location, 
            capacity, 
            organizerId, 
            categoryId: categoryId || null, 
            venueId: venueId || null, 
            status 
        }, { autoCommit: true });
        await connection.close();

        res.json({ message: 'Eveniment creat!' });
    } catch (error) {
        console.error('Eroare creare eveniment:', error);
        res.status(500).json({ message: 'Eroare la crearea evenimentului!' });
    }
});

// Actualizare eveniment
app.put('/admin/events/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, date, location, capacity, categoryId, venueId, status } = req.body;
    
    try {
        const connection = await oracledb.getConnection(dbConfig);
        await connection.execute(`
            UPDATE EVENTS 
            SET TITLE = :title, DESCRIPTION = :description, 
                DATE_EVENT = TO_TIMESTAMP(:date, 'YYYY-MM-DD"T"HH24:MI'), 
                LOCATION = :location, CAPACITY = :capacity,
                CATEGORY_ID = :categoryId, VENUE_ID = :venueId, STATUS = :status
            WHERE ID = :id
        `, { 
            title, 
            description, 
            date, 
            location, 
            capacity, 
            categoryId: categoryId || null,
            venueId: venueId || null,
            status,
            id 
        }, { autoCommit: true });
        await connection.close();

        res.json({ message: 'Eveniment actualizat!' });
    } catch (error) {
        console.error('Eroare actualizare eveniment:', error);
        res.status(500).json({ message: 'Eroare la actualizarea evenimentului!' });
    }
});

// Ștergere eveniment
app.delete('/admin/events/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const connection = await oracledb.getConnection(dbConfig);
        await connection.execute(`DELETE FROM REGISTRATIONS WHERE EVENT_ID = :id`, { id });
        await connection.execute(`DELETE FROM EVENTS WHERE ID = :id`, { id }, { autoCommit: true });
        await connection.close();

        res.json({ message: 'Eveniment șters!' });
    } catch (error) {
        console.error('Eroare ștergere eveniment:', error);
        res.status(500).json({ message: 'Eroare la ștergerea evenimentului!' });
    }
});

// Participanți la eveniment (pentru raport)
app.get('/admin/events/:id/participants', async (req, res) => {
    const { id } = req.params;
    
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(`
            SELECT u.USERNAME, u.EMAIL, u.DATA_NASTERII, r.REGISTERED_AT,
                   FLOOR(MONTHS_BETWEEN(SYSDATE, u.DATA_NASTERII) / 12) as AGE
            FROM REGISTRATIONS r
            JOIN USERS u ON r.USER_ID = u.ID_USER
            WHERE r.EVENT_ID = :eventId
            ORDER BY r.REGISTERED_AT ASC
        `, { eventId: id });
        await connection.close();

        const participants = result.rows.map(row => ({
            username: row[0],
            email: row[1],
            birth_date: row[2],
            registration_date: row[3],
            age: row[4]
        }));

        res.json(participants);
    } catch (error) {
        console.error('Eroare încărcare participanți:', error);
        res.status(500).json({ message: 'Eroare la încărcarea participanților!' });
    }
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

// 5. Raport participare folosind funcția din DB
app.get('/admin/events/:id/report', async (req, res) => {
    const { id } = req.params;
    
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`
        SELECT EVENT_MANAGER.GENERATE_PARTICIPATION_REPORT(:eventId) as REPORT
        FROM DUAL
    `, { eventId: id });
    await connection.close();

    res.json({ report: result.rows[0][0] });
});

// 6. Statistici vârstă medie
app.get('/admin/events/:id/average-age', async (req, res) => {
    const { id } = req.params;
    
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`
        SELECT EVENT_MANAGER.GET_AVERAGE_AGE_FOR_EVENT(:eventId) as AVG_AGE
        FROM DUAL
    `, { eventId: id });
    await connection.close();

    res.json({ average_age: result.rows[0][0] });
});

// 7. Verificare eligibilitate înregistrare
app.get('/events/:id/can-register/:userId', async (req, res) => {
    const { id, userId } = req.params;
    
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`
        SELECT EVENT_MANAGER.CAN_USER_REGISTER(:userId, :eventId) as CAN_REGISTER
        FROM DUAL
    `, { userId, eventId: id });
    await connection.close();

    res.json({ can_register: result.rows[0][0] === 1 });
});

// 8. View-uri pentru dashboard
app.get('/admin/dashboard-stats', async (req, res) => {
    const { adminId } = req.query;
    
    const connection = await oracledb.getConnection(dbConfig);
    
    // Statistici evenimente admin
    const eventsStats = await connection.execute(`
        SELECT COUNT(*) as TOTAL_EVENTS,
               SUM(CASE WHEN STATUS = 'published' THEN 1 ELSE 0 END) as PUBLISHED,
               SUM(CASE WHEN STATUS = 'draft' THEN 1 ELSE 0 END) as DRAFTS
        FROM EVENTS WHERE ORGANIZER_ID = :adminId
    `, { adminId });
    
    // Top categorii
    const topCategories = await connection.execute(`
        SELECT c.NAME, COUNT(*) as EVENT_COUNT
        FROM EVENTS e
        JOIN CATEGORIES c ON e.CATEGORY_ID = c.ID
        WHERE e.ORGANIZER_ID = :adminId
        GROUP BY c.NAME
        ORDER BY COUNT(*) DESC
    `, { adminId });
    
    await connection.close();
    
    res.json({
        events_stats: eventsStats.rows[0],
        top_categories: topCategories.rows
    });
});

// 9. Evenimente populare folosind view-ul
app.get('/popular-events', async (req, res) => {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`
        SELECT * FROM V_POPULAR_EVENTS
        WHERE ROWNUM <= 10
    `);
    await connection.close();

    res.json(result.rows);
});

// 10. Statistici categorii
app.get('/category-stats', async (req, res) => {
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`SELECT * FROM V_CATEGORY_STATS`);
    await connection.close();

    res.json(result.rows);
});

app.listen(3000, () => console.log('Server pe portul 3000'));
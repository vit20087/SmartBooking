const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const sanitizeUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    photoUrl: user.photoUrl,
    bio: user.bio
});

// ======================
// ДОПОМІЖНІ ФУНКЦІЇ
// ======================

// Перевірка, чи належить послуга майстру (userId)
const isServiceOwnedByMaster = async (serviceId, masterId) => {
    const service = await prisma.service.findUnique({
        where: { id: parseInt(serviceId) }
    });
    return service && service.masterId === parseInt(masterId);
};

// ======================
// ЕНДПОІНТИ
// ======================

// ---- Послуги ----
app.get('/api/services', async (req, res) => {
    const services = await prisma.service.findMany({
        include: { master: true },
        orderBy: { id: 'desc' }
    });
    res.json(services);
});

app.post('/api/services', async (req, res) => {
    const { name, description, price, durationMin, masterId, category } = req.body;
    try {
        const service = await prisma.service.create({
            data: {
                name,
                description: description || "Послуга від майстра",
                price: parseFloat(price),
                durationMin: parseInt(durationMin),
                masterId: parseInt(masterId),
                category: category || null
            }
        });
        res.json(service);
    } catch (error) {
        res.status(500).json({ error: 'Помилка створення послуги' });
    }
});

// Оновлення послуги (тільки власник)
app.put('/api/services/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, price, durationMin, category, masterId } = req.body;

    // Перевірка прав: masterId має співпадати з власником послуги
    if (!(await isServiceOwnedByMaster(id, masterId))) {
        return res.status(403).json({ error: 'Недостатньо прав' });
    }

    try {
        const updated = await prisma.service.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description,
                price: parseFloat(price),
                durationMin: parseInt(durationMin),
                category
            }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Помилка оновлення послуги' });
    }
});

// Видалення послуги (тільки власник)
app.delete('/api/services/:id', async (req, res) => {
    const { id } = req.params;
    const { masterId } = req.query; // очікуємо masterId у query параметрах

    if (!(await isServiceOwnedByMaster(id, masterId))) {
        return res.status(403).json({ error: 'Недостатньо прав' });
    }

    try {
        // Видалити послугу (якщо каскадне видалення налаштоване, бронювання видаляться автоматично)
        await prisma.service.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Помилка видалення послуги' });
    }
});

// ---- Майстри ----
app.get('/api/masters', async (req, res) => {
    const masters = await prisma.user.findMany({
        where: { role: 'MASTER' },
        include: { services: true }
    });
    res.json(masters);
});

// ---- Бронювання ----
app.post('/api/bookings', async (req, res) => {
    const { userId, serviceId, date, time } = req.body;
    const bookingDate = new Date(`${date}T${time}:00`);
    if (bookingDate <= new Date()) return res.status(400).json({ error: "Дата має бути в майбутньому!" });

    const booking = await prisma.booking.create({
        data: {
            userId: parseInt(userId),
            serviceId: parseInt(serviceId),
            date: bookingDate,
            status: 'pending'
        }
    });
    res.json(booking);
});

// Доступні слоти для послуги на дату
app.get('/api/bookings/availability', async (req, res) => {
    const { serviceId, date } = req.query;
    if (!serviceId || !date) return res.status(400).json({ error: 'serviceId та date обовʼязкові' });

    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    const bookings = await prisma.booking.findMany({
        where: {
            serviceId: parseInt(serviceId),
            date: {
                gte: startOfDay,
                lte: endOfDay
            },
            status: { not: 'cancelled' }
        },
        select: { date: true }
    });

    // Форматуємо час у "HH:MM"
    const bookedSlots = bookings.map(b => {
        const d = new Date(b.date);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    });

    res.json({ bookedSlots });
});

// Отримати бронювання для конкретного майстра
app.get('/api/masters/:masterId/bookings', async (req, res) => {
    const { masterId } = req.params;
    const bookings = await prisma.booking.findMany({
        where: {
            service: {
                masterId: parseInt(masterId)
            }
        },
        include: {
            service: true,
            user: true
        },
        orderBy: { date: 'asc' }
    });
    res.json(bookings);
});

// Оновити статус бронювання (підтвердити/завершити/скасувати)
app.patch('/api/bookings/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Некоректний статус' });
    }

    try {
        const updated = await prisma.booking.update({
            where: { id: parseInt(id) },
            data: { status }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Помилка оновлення статусу' });
    }
});

// Скасування бронювання (вже є, але залишимо)
app.delete('/api/bookings/:id', async (req, res) => {
    await prisma.booking.update({
        where: { id: parseInt(req.params.id) },
        data: { status: 'cancelled' }
    });
    res.json({ success: true });
});

// ---- Користувачі ----
app.get('/api/users/:id/bookings', async (req, res) => {
    const bookings = await prisma.booking.findMany({
        where: { userId: parseInt(req.params.id) },
        include: { service: { include: { master: true } } },
        orderBy: { date: 'desc' }
    });
    res.json(bookings);
});

// ---- Відгуки ----
app.post('/api/reviews', async (req, res) => {
    const { bookingId, rating, comment } = req.body;
    const booking = await prisma.booking.findUnique({
        where: { id: parseInt(bookingId) },
        include: { service: true }
    });
    if (!booking) return res.status(404).json({ error: "Бронювання не знайдено" });

    const review = await prisma.review.create({
        data: {
            bookingId: parseInt(bookingId),
            userId: booking.userId,
            masterId: booking.service.masterId,
            rating: parseInt(rating),
            comment
        }
    });
    res.json(review);
});

app.get('/api/services/:id/reviews', async (req, res) => {
    const reviews = await prisma.review.findMany({
        where: { booking: { serviceId: parseInt(req.params.id) } },
        include: { user: true },
        orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
});

// ---- Авторизація ----
app.post('/api/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || name.trim().length < 2) return res.status(400).json({ error: "Ім'я мінімум 2 символи." });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Некоректний email." });
    if (password.length < 8) return res.status(400).json({ error: "Пароль мінімум 8 символів." });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email вже зареєстрований!" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { name, email, password: hashed, role: role === 'MASTER' ? 'MASTER' : 'CLIENT' }
    });
    res.json(sanitizeUser(user));
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Невірний email або пароль." });
    }
    res.json(sanitizeUser(user));
});

app.listen(3000, () => console.log('🚀 SmartBooking сервер запущено на 3000'));
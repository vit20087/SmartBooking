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
// ЕНДПОІНТИ
// ======================

app.get('/api/services', async (req, res) => {
    const services = await prisma.service.findMany({
        include: { master: true },
        orderBy: { id: 'desc' }
    });
    res.json(services);
});

app.post('/api/services', async (req, res) => {
    const { name, description, price, durationMin, masterId } = req.body;
    const service = await prisma.service.create({
        data: {
            name,
            description: description || "Послуга від майстра",
            price: parseFloat(price),
            durationMin: parseInt(durationMin),
            masterId: parseInt(masterId)
        }
    });
    res.json(service);
});

app.get('/api/masters', async (req, res) => {
    const masters = await prisma.user.findMany({
        where: { role: 'MASTER' },
        include: { services: true }
    });
    res.json(masters);
});

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

app.post('/api/bookings', async (req, res) => {
    const { userId, serviceId, date, time } = req.body; // time = "10:00"
    const bookingDate = new Date(`${date}T${time}:00`);
    if (bookingDate <= new Date()) return res.status(400).json({ error: "Дата має бути в майбутньому!" });

    const booking = await prisma.booking.create({
        data: { userId: parseInt(userId), serviceId: parseInt(serviceId), date: bookingDate }
    });
    res.json(booking);
});

app.get('/api/users/:id/bookings', async (req, res) => {
    const bookings = await prisma.booking.findMany({
        where: { userId: parseInt(req.params.id) },
        include: { service: { include: { master: true } } },
        orderBy: { date: 'desc' }
    });
    res.json(bookings);
});

app.delete('/api/bookings/:id', async (req, res) => {
    await prisma.booking.update({
        where: { id: parseInt(req.params.id) },
        data: { status: 'cancelled' }
    });
    res.json({ success: true });
});

app.post('/api/reviews', async (req, res) => {
    const { bookingId, rating, comment } = req.body;
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: "Бронювання не знайдено" });

    const review = await prisma.review.create({
        data: {
            bookingId,
            userId: booking.userId,
            masterId: (await prisma.service.findUnique({ where: { id: booking.serviceId } })).masterId,
            rating: parseInt(rating),
            comment
        }
    });
    res.json(review);
});

app.get('/api/services/:id/reviews', async (req, res) => {
    const reviews = await prisma.review.findMany({
        where: { booking: { serviceId: parseInt(req.params.id) } },
        include: { user: true }
    });
    res.json(reviews);
});

app.listen(3000, () => console.log('🚀 SmartBooking сервер запущено на 3000'));
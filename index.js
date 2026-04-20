const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
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

// Допоміжна функція перевірки власника послуги
const isServiceOwnedByMaster = async (serviceId, masterId) => {
    const service = await prisma.service.findUnique({
        where: { id: parseInt(serviceId) }
    });
    return service && service.masterId === parseInt(masterId);
};

// Налаштування тестового SMTP (ethereal)
let transporter;
nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error('Failed to create test account:', err);
        return;
    }
    transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
            user: account.user,
            pass: account.pass
        }
    });
    console.log('📧 Test email account ready. Emails will be logged to console.');
});

// ====================== ЕНДПОІНТИ ======================

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

app.put('/api/services/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, price, durationMin, category, masterId } = req.body;

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

app.delete('/api/services/:id', async (req, res) => {
    const { id } = req.params;
    const { masterId } = req.query;

    if (!(await isServiceOwnedByMaster(id, masterId))) {
        return res.status(403).json({ error: 'Недостатньо прав' });
    }

    try {
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

    const service = await prisma.service.findUnique({
        where: { id: parseInt(serviceId) }
    });
    if (!service) return res.status(404).json({ error: "Послугу не знайдено" });

    // Заборона майстру бронювати власну послугу
    if (parseInt(userId) === service.masterId) {
        return res.status(403).json({ error: "Ви не можете забронювати власну послугу." });
    }

    const startOfMinute = new Date(bookingDate);
    const endOfMinute = new Date(bookingDate);
    endOfMinute.setMinutes(endOfMinute.getMinutes() + 1);

    // 1. Перевірка майстра
    const masterBusy = await prisma.booking.findFirst({
        where: {
            service: { masterId: service.masterId },
            date: { gte: startOfMinute, lt: endOfMinute },
            status: { not: 'cancelled' }
        }
    });
    if (masterBusy) {
        return res.status(409).json({ error: "Майстер уже зайнятий у цей час." });
    }

    // 2. Перевірка клієнта
    const clientBusy = await prisma.booking.findFirst({
        where: {
            userId: parseInt(userId),
            date: { gte: startOfMinute, lt: endOfMinute },
            status: { not: 'cancelled' }
        }
    });
    if (clientBusy) {
        return res.status(409).json({ error: "У вас уже є запис на цей час." });
    }

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

app.get('/api/bookings/availability', async (req, res) => {
    const { serviceId, date, userId } = req.query;
    if (!serviceId || !date) return res.status(400).json({ error: 'serviceId та date обовʼязкові' });

    const service = await prisma.service.findUnique({
        where: { id: parseInt(serviceId) }
    });
    if (!service) return res.status(404).json({ error: 'Послугу не знайдено' });

    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    // Зайняті слоти майстра
    const masterBookings = await prisma.booking.findMany({
        where: {
            service: { masterId: service.masterId },
            date: { gte: startOfDay, lte: endOfDay },
            status: { not: 'cancelled' }
        },
        select: { date: true }
    });

    const bookedSlots = masterBookings.map(b => {
        const d = new Date(b.date);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    });

    // Якщо передано userId, додаємо його власні бронювання
    if (userId) {
        const userBookings = await prisma.booking.findMany({
            where: {
                userId: parseInt(userId),
                date: { gte: startOfDay, lte: endOfDay },
                status: { not: 'cancelled' }
            },
            select: { date: true }
        });

        const userSlots = userBookings.map(b => {
            const d = new Date(b.date);
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        });

        userSlots.forEach(slot => {
            if (!bookedSlots.includes(slot)) {
                bookedSlots.push(slot);
            }
        });
    }

    res.json({ bookedSlots });
});

app.get('/api/masters/:masterId/bookings', async (req, res) => {
    const { masterId } = req.params;
    const bookings = await prisma.booking.findMany({
        where: { service: { masterId: parseInt(masterId) } },
        include: { service: true, user: true },
        orderBy: { date: 'asc' }
    });
    res.json(bookings);
});

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

// ---- Відновлення паролю ----
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email обовʼязковий' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return res.json({ message: 'Якщо email зареєстровано, на нього надіслано інструкції з відновлення.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 година

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    await prisma.passwordResetToken.create({
        data: {
            token,
            userId: user.id,
            expiresAt
        }
    });

    const resetUrl = `http://localhost:5173/reset-password?token=${token}`;

    if (transporter) {
        const info = await transporter.sendMail({
            from: '"SmartBooking" <noreply@smartbooking.com>',
            to: email,
            subject: 'Відновлення паролю SmartBooking',
            text: `Перейдіть за посиланням, щоб скинути пароль: ${resetUrl}`,
            html: `<p>Перейдіть за посиланням, щоб скинути пароль:</p><a href="${resetUrl}">${resetUrl}</a><p>Посилання дійсне 1 годину.</p>`
        });
        console.log('📧 Preview URL: %s', nodemailer.getTestMessageUrl(info));
    } else {
        console.log(`🔗 Reset link for ${email}: ${resetUrl}`);
    }

    res.json({ message: 'Якщо email зареєстровано, на нього надіслано інструкції з відновлення.' });
});

app.post('/api/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Токен та новий пароль обовʼязкові' });
    if (password.length < 8) return res.status(400).json({ error: 'Пароль має містити щонайменше 8 символів' });

    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true }
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Токен недійсний або прострочений' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashed }
    });

    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });

    res.json({ message: 'Пароль успішно змінено. Тепер ви можете увійти.' });
});

app.listen(3000, () => console.log('🚀 SmartBooking сервер запущено на 3000'));
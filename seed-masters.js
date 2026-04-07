const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedMasters() {
    console.log('🚀 Оновлюємо майстрів...');

    const mastersData = [
        {
            id: 1,
            name: "Анна Кравченко",
            email: "anna.kravchenko@example.com",
            photoUrl: "https://picsum.photos/id/1011/600/400",
            bio: "Топ-стиліст з 8 роками досвіду. Спеціалізуюсь на жіночих стрижках, балаяжі та голлівудських локонах. Переможець конкурсу «Кращий стиліст Львова 2023».",
            rating: 4.9,
            reviewCount: 87
        },
        {
            id: 2,
            name: "Дмитро Шевчук",
            email: "dmytro.shevchuk@example.com",
            photoUrl: "https://picsum.photos/id/1005/600/400",
            bio: "Професійний барбер та майстер чоловічих стрижок з 6 роками досвіду. Член Barber Union Ukraine. Спеціаліст з класичних та сучасних технік.",
            rating: 5.0,
            reviewCount: 64
        },
        {
            id: 3,
            name: "Олена Мороз",
            email: "olena.moroz@example.com",
            photoUrl: "https://picsum.photos/id/1009/600/400",
            bio: "Майстер манікюру, педикюру та дизайну нігтів з 7 роками практики. Працює виключно з преміум матеріалами CND та OPI. Сертифікований nail-технік.",
            rating: 4.8,
            reviewCount: 112
        },
        {
            id: 4,
            name: "Ігор Петренко",
            email: "igor.petrenko@example.com",
            photoUrl: "https://picsum.photos/id/1015/600/400",
            bio: "Сертифікований масажист з медичною освітою. Спеціалізуюсь на антицелюлітному, лімфодренажному та релакс-масажі. 10 років досвіду.",
            rating: 4.9,
            reviewCount: 53
        },
        {
            id: 5,
            name: "Софія Лисенко",
            email: "sofia.lysenko@example.com",
            photoUrl: "https://picsum.photos/id/1027/600/400",
            bio: "Колористка преміум-класу з 9 роками досвіду. Експерт з фарбування, блонду, AirTouch та кольорових технік. Пройшла навчання у Парижі та Мілані.",
            rating: 5.0,
            reviewCount: 94
        }
    ];

    for (const m of mastersData) {
        await prisma.user.upsert({
            where: { id: m.id },
            update: {
                name: m.name,
                photoUrl: m.photoUrl,
                bio: m.bio,
                rating: m.rating,
                reviewCount: m.reviewCount
            },
            create: {
                id: m.id,
                name: m.name,
                email: m.email,
                password: "$2a$10$examplehash1234567890",
                role: "MASTER",
                photoUrl: m.photoUrl,
                bio: m.bio,
                rating: m.rating,
                reviewCount: m.reviewCount
            }
        });
        console.log(`✅ Майстер ${m.name} оновлений`);
    }

    console.log('🎉 Майстри успішно оновлені!');
    process.exit(0);
}

seedMasters().catch(console.error);
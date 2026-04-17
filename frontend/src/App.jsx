import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const API = 'http://localhost:3000/api';

// Зображення для послуг за категорією
const CATEGORY_IMAGES = {
  'Стрижка':      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80',
  'Фарбування':   'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
  'Укладка':      'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&q=80',
  'Манікюр':      'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80',
  'Педикюр':      'https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?w=600&q=80',
  'Масаж':        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80',
  'Брови та вії': 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=600&q=80',
  'Епіляція':     'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80',
  'Макіяж':       'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80',
  'Догляд':       'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&q=80',
};

function getServiceImage(service) {
  if (service.imageUrl) return service.imageUrl;
  return CATEGORY_IMAGES[service.category] || `https://picsum.photos/seed/${service.id}/600/400`;
}

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('smartbooking_user')); }
    catch { return null; }
  });
  const [services, setServices] = useState([]);

  useEffect(() => {
    axios.get(`${API}/services`).then(res => setServices(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem('smartbooking_user', JSON.stringify(user));
    else localStorage.removeItem('smartbooking_user');
  }, [user]);

  const handleLogout = () => {
    setUser(null);
    window.location.href = '/';
  };

  return (
      <BrowserRouter>
        <nav className="navbar">
          <Link to="/" className="logo">Smart<span>Booking</span></Link>
          <div className="nav-links">
            <Link to="/" className="nav-link">Каталог</Link>
            <Link to="/masters" className="nav-link">Майстри</Link>
            {user ? (
                <>
                  {user.role === 'MASTER' && <Link to="/admin" className="nav-link">Панель майстра</Link>}
                  <Link to="/profile" className="nav-link">👤 {user.name}</Link>
                  <button onClick={handleLogout} className="btn-book" style={{ background: '#dc3545' }}>Вийти</button>
                </>
            ) : (
                <Link to="/login" className="btn-book">Увійти / Реєстрація</Link>
            )}
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<HomePage services={services} user={user} />} />
          <Route path="/masters" element={<MastersPage user={user} />} />
          <Route path="/login" element={user ? <Navigate to="/" /> : <AuthPage setUser={setUser} />} />
          <Route path="/profile" element={user ? <ProfilePage user={user} /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user?.role === 'MASTER' ? <AdminPage user={user} services={services} setServices={setServices} /> : <Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
  );
}

/* ─────────── ГОЛОВНА СТОРІНКА ─────────── */
function HomePage({ services, user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Всі');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(2500);
  const [selectedService, setSelectedService] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('favorites') || '[]'); }
    catch { return []; }
  });

  const CATEGORIES = ['Всі', 'Стрижка', 'Фарбування', 'Укладка', 'Манікюр', 'Педикюр', 'Масаж', 'Брови та вії', 'Епіляція', 'Макіяж', 'Догляд'];

  const filtered = services.filter(s => {
    const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.master?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    // Фільтр по категорії — використовуємо поле category
    const matchCat = category === 'Всі' || s.category === category;
    const matchPrice = s.price >= minPrice && s.price <= maxPrice;
    return matchSearch && matchCat && matchPrice;
  });

  const toggleFavorite = (id) => {
    const newFav = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(newFav);
    localStorage.setItem('favorites', JSON.stringify(newFav));
  };

  return (
      <>
        <header className="hero">
          <h1>Знайди свого майстра</h1>
          <p>Понад 80 послуг від перевірених професіоналів Львова</p>
          <div className="search-bar">
            <input
                type="text"
                placeholder="Послуга, майстер або опис..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
            <button className="search-btn">Знайти</button>
          </div>
        </header>

        <div className="categories-nav">
          {CATEGORIES.map(cat => (
              <button
                  key={cat}
                  className={`category-pill ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
          ))}
        </div>

        <main className="services-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              {category === 'Всі' ? 'Всі послуги' : category} ({filtered.length})
            </h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 14, color: '#555' }}>
                Ціна від:{' '}
                <input
                    type="number"
                    value={minPrice}
                    onChange={e => setMinPrice(+e.target.value)}
                    style={{ width: 70, padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd' }}
                />
              </label>
              <label style={{ fontSize: 14, color: '#555' }}>
                до:{' '}
                <input
                    type="number"
                    value={maxPrice}
                    onChange={e => setMaxPrice(+e.target.value)}
                    style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd' }}
                />
                {' '}₴
              </label>
            </div>
          </div>

          {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <h3>Нічого не знайдено</h3>
                <p>Спробуй змінити фільтри або пошуковий запит</p>
              </div>
          ) : (
              <div className="services-grid">
                {filtered.map(service => {
                  const isFav = favorites.includes(service.id);
                  const rating = service.master?.rating || 4.8;
                  const reviewCount = service.master?.reviewCount || 0;
                  return (
                      <div className="service-card" key={service.id}>
                        <img src={getServiceImage(service)} alt={service.name} className="service-image" />

                        {/* Бейдж категорії */}
                        <div style={{
                          position: 'relative',
                          marginTop: -32,
                          marginLeft: 16,
                          display: 'inline-block',
                          background: '#00a3a6',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: 20,
                          zIndex: 2
                        }}>
                          {service.category}
                        </div>

                        <div className="service-content">
                          <div className="service-header">
                            <h3 className="service-title">{service.name}</h3>
                            <span className="service-price">{service.price} ₴</span>
                          </div>
                          <p className="service-desc">{service.description}</p>
                          {service.master && (
                              <p style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
                                👤 <strong>{service.master.name}</strong>
                              </p>
                          )}
                          <div className="service-meta">
                            <span>⏱ {service.durationMin} хв</span>
                            <span>⭐ {rating.toFixed(1)}</span>
                            {reviewCount > 0 && <span style={{ color: '#aaa' }}>({reviewCount} відгуків)</span>}
                          </div>
                          <div className="service-actions" style={{ display: 'flex', gap: 10 }}>
                            <button className="btn-book" style={{ flex: 1 }} onClick={() => setSelectedService(service)}>
                              Забронювати
                            </button>
                            <button
                                onClick={() => toggleFavorite(service.id)}
                                title={isFav ? 'Прибрати з обраного' : 'Додати в обране'}
                                style={{
                                  background: isFav ? '#ff4081' : '#f0f0f0',
                                  color: isFav ? '#fff' : '#999',
                                  width: 46,
                                  borderRadius: 8,
                                  border: 'none',
                                  fontSize: 18,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                            >
                              ❤️
                            </button>
                          </div>
                        </div>
                      </div>
                  );
                })}
              </div>
          )}
        </main>

        {selectedService && (
            <BookingModal service={selectedService} user={user} onClose={() => setSelectedService(null)} />
        )}
      </>
  );
}

/* ─────────── МОДАЛКА БРОНЮВАННЯ ─────────── */
function BookingModal({ service, user, onClose }) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('10:00');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  const today = new Date().toISOString().split('T')[0];

  const handleBook = async () => {
    if (!user) {
      if (window.confirm('Для бронювання потрібно увійти в акаунт. Перейти до сторінки входу?')) {
        navigate('/login');
      }
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/bookings`, {
        userId: user.id,
        serviceId: service.id,
        date,
        time
      });
      alert(`✅ Запис успішно створено!\n\n📋 ${service.name}\n📅 ${date} о ${time}\n👤 ${service.master?.name}`);
      onClose();
    } catch {
      alert('❌ Помилка при бронюванні. Спробуйте ще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666' }}>✕</button>

          <h3 style={{ fontSize: 20, marginBottom: 8 }}>{service.name}</h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
            <span style={{ color: '#00a3a6', fontSize: 22, fontWeight: 700 }}>{service.price} ₴</span>
            <span style={{ color: '#888', fontSize: 14 }}>⏱ {service.durationMin} хв</span>
            {service.category && (
                <span style={{ background: '#f0f0f0', padding: '2px 10px', borderRadius: 20, fontSize: 12 }}>
              {service.category}
            </span>
            )}
          </div>

          {service.master && (
              <p style={{ color: '#555', marginBottom: 20, fontSize: 14 }}>
                Майстер: <strong>{service.master.name}</strong>
                {service.master.rating > 0 && ` · ⭐ ${service.master.rating.toFixed(1)}`}
              </p>
          )}

          <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 6 }}>Оберіть дату</label>
          <input
              type="date"
              value={date}
              min={today}
              onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', marginBottom: 16, borderRadius: 8, border: '1px solid #ddd', fontSize: 15 }}
          />

          <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>Оберіть час</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 24 }}>
            {timeSlots.map(t => (
                <button
                    key={t}
                    onClick={() => setTime(t)}
                    style={{
                      padding: '8px 0',
                      borderRadius: 8,
                      border: `2px solid ${time === t ? '#00a3a6' : '#eee'}`,
                      background: time === t ? '#00a3a6' : '#fff',
                      color: time === t ? '#fff' : '#333',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: 13,
                      transition: 'all 0.15s'
                    }}
                >
                  {t}
                </button>
            ))}
          </div>

          <button
              className="btn-primary"
              onClick={handleBook}
              disabled={loading}
              style={{ width: '100%', marginBottom: 10, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Обробка...' : 'Підтвердити запис'}
          </button>
          <button onClick={onClose} style={{ width: '100%', padding: '12px', background: 'none', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 15 }}>
            Скасувати
          </button>
        </div>
      </div>
  );
}

/* ─────────── СТОРІНКА МАЙСТРІВ ─────────── */
function MastersPage({ user }) {
  const [masters, setMasters] = useState([]);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/masters`)
        .then(res => { setMasters(res.data); setLoading(false); })
        .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80, color: '#888' }}>Завантаження майстрів...</div>;
  }

  return (
      <div style={{ padding: '40px 5%', maxWidth: 1200, margin: '0 auto' }}>
        <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 10 }}>Наші майстри</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: 40, fontSize: 18 }}>
          Професіонали, яким довіряють тисячі клієнтів у Львові
        </p>

        {masters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
              <p>Майстрів ще не додано. Запустіть seed-masters.js</p>
            </div>
        ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 30 }}>
              {masters.map(master => (
                  <div key={master.id} style={{
                    background: '#fff', borderRadius: 16, overflow: 'hidden',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                       onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 16px 35px rgba(0,0,0,0.13)'; }}
                       onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)'; }}
                  >
                    <img src={master.photoUrl} alt={master.name} style={{ width: '100%', height: 240, objectFit: 'cover' }} />

                    <div style={{ padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <h3 style={{ margin: 0, fontSize: 20 }}>{master.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          ⭐ <strong>{master.rating ? master.rating.toFixed(1) : '5.0'}</strong>
                          <span style={{ fontSize: 13, color: '#888' }}>({master.reviewCount || 0})</span>
                        </div>
                      </div>

                      <p style={{ color: '#555', margin: '0 0 16px', lineHeight: 1.5, fontSize: 14 }}>{master.bio}</p>

                      {/* Послуги майстра */}
                      {master.services && master.services.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                            {master.services.slice(0, 4).map(s => (
                                <span key={s.id} style={{
                                  background: '#f0f0f0', padding: '4px 12px',
                                  borderRadius: 30, fontSize: 12, whiteSpace: 'nowrap'
                                }}>
                        {s.name}
                      </span>
                            ))}
                            {master.services.length > 4 && (
                                <span style={{ background: '#e8f7f7', color: '#00a3a6', padding: '4px 12px', borderRadius: 30, fontSize: 12 }}>
                        +{master.services.length - 4} ще
                      </span>
                            )}
                          </div>
                      )}

                      <button
                          onClick={() => setSelectedMaster(master)}
                          className="btn-primary"
                          style={{ width: '100%', padding: 14, fontSize: 15 }}
                      >
                        Записатися до майстра
                      </button>
                    </div>
                  </div>
              ))}
            </div>
        )}

        {/* Модалка вибору послуги майстра */}
        {selectedMaster && (
            <MasterBookingModal master={selectedMaster} user={user} onClose={() => setSelectedMaster(null)} />
        )}
      </div>
  );
}

/* Модалка для запису до конкретного майстра */
function MasterBookingModal({ master, user, onClose }) {
  const [selectedService, setSelectedService] = useState(null);
  const navigate = useNavigate();

  if (selectedService) {
    return <BookingModal service={{ ...selectedService, master }} user={user} onClose={onClose} />;
  }

  return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666' }}>✕</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <img src={master.photoUrl} alt={master.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
            <div>
              <h3 style={{ margin: 0 }}>{master.name}</h3>
              <span style={{ color: '#888', fontSize: 13 }}>⭐ {master.rating?.toFixed(1) || '5.0'} · {master.reviewCount || 0} відгуків</span>
            </div>
          </div>

          <p style={{ fontWeight: 600, marginBottom: 12 }}>Оберіть послугу:</p>
          {master.services && master.services.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                {master.services.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setSelectedService(s)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 16px', borderRadius: 10,
                          border: '1px solid #eee', background: '#fafafa',
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#00a3a6'; e.currentTarget.style.background = '#f0fafa'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#eee'; e.currentTarget.style.background = '#fafafa'; }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                        <div style={{ color: '#888', fontSize: 12 }}>⏱ {s.durationMin} хв</div>
                      </div>
                      <span style={{ color: '#00a3a6', fontWeight: 700, fontSize: 16 }}>{s.price} ₴</span>
                    </button>
                ))}
              </div>
          ) : (
              <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>У цього майстра ще немає послуг</p>
          )}
        </div>
      </div>
  );
}

/* ─────────── ПРОФІЛЬ ─────────── */
function ProfilePage({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/users/${user.id}/bookings`)
        .then(res => { setBookings(res.data); setLoading(false); })
        .catch(() => setLoading(false));
  }, [user.id]);

  const cancelBooking = async (id) => {
    if (!window.confirm('Скасувати запис?')) return;
    await axios.delete(`${API}/bookings/${id}`);
    setBookings(bookings.filter(b => b.id !== id));
  };

  const leaveReview = async (bookingId) => {
    const rating = prompt('Оцінка від 1 до 5:');
    if (!rating || isNaN(rating) || rating < 1 || rating > 5) return alert('Некоректна оцінка');
    const comment = prompt('Ваш коментар (необов\'язково):');
    try {
      await axios.post(`${API}/reviews`, { bookingId, rating: +rating, comment });
      alert('Дякуємо за відгук! 🙏');
    } catch {
      alert('Помилка при відправці відгуку');
    }
  };

  const STATUS_LABELS = {
    pending:   { label: 'Очікується', color: '#f59e0b' },
    confirmed: { label: 'Підтверджено', color: '#10b981' },
    completed: { label: 'Завершено', color: '#6366f1' },
    cancelled: { label: 'Скасовано', color: '#ef4444' },
  };

  return (
      <div className="profile-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <img src={user.photoUrl || 'https://i.pravatar.cc/80'} alt={user.name}
               style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <h1 style={{ margin: 0 }}>Привіт, {user.name}!</h1>
            <p style={{ color: '#888', margin: 0 }}>{user.email}</p>
          </div>
        </div>

        <h2 style={{ marginBottom: 16 }}>Мої записи</h2>

        {loading ? <p style={{ color: '#888' }}>Завантаження...</p> : null}

        {!loading && bookings.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
              <p>У вас ще немає записів</p>
            </div>
        )}

        {bookings.map(b => {
          const st = STATUS_LABELS[b.status] || { label: b.status, color: '#888' };
          return (
              <div key={b.id} style={{
                background: '#fff', padding: 20, marginBottom: 12,
                borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
              }}>
                <div>
                  <strong style={{ fontSize: 16 }}>{b.service?.name}</strong>
                  {b.service?.master && <span style={{ color: '#888', fontSize: 14 }}> · {b.service.master.name}</span>}
                  <br />
                  <small style={{ color: '#666' }}>
                    {new Date(b.date).toLocaleString('uk-UA')}
                    {' · '}
                    <span style={{ color: st.color, fontWeight: 600 }}>{st.label}</span>
                  </small>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {b.status !== 'cancelled' && b.status !== 'completed' && (
                      <button
                          onClick={() => cancelBooking(b.id)}
                          style={{ background: '#dc3545', color: '#fff', padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13 }}
                      >
                        Скасувати
                      </button>
                  )}
                  {b.status === 'completed' && !b.review && (
                      <button
                          onClick={() => leaveReview(b.id)}
                          style={{ background: '#00a3a6', color: '#fff', padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13 }}
                      >
                        Залишити відгук
                      </button>
                  )}
                </div>
              </div>
          );
        })}
      </div>
  );
}

/* ─────────── ПАНЕЛЬ МАЙСТРА ─────────── */
function AdminPage({ user, services, setServices }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState(60);
  const [category, setCategory] = useState('Стрижка');
  const [description, setDescription] = useState('');

  const CATEGORIES = ['Стрижка', 'Фарбування', 'Укладка', 'Манікюр', 'Педикюр', 'Масаж', 'Брови та вії', 'Епіляція', 'Макіяж', 'Догляд'];

  const addService = async (e) => {
    e.preventDefault();
    if (!description) return alert('Додайте опис послуги');
    try {
      const res = await axios.post(`${API}/services`, {
        name, price: +price, durationMin: +duration, masterId: user.id, category, description
      });
      setServices([res.data, ...services]);
      setName(''); setPrice(''); setDescription(''); setDuration(60);
      alert('✅ Послугу додано!');
    } catch {
      alert('Помилка при додаванні послуги');
    }
  };

  const myServices = services.filter(s => s.masterId === user.id);

  return (
      <div style={{ padding: '40px 5%', maxWidth: 800, margin: '0 auto' }}>
        <h2>Панель майстра — {user.name}</h2>

        <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 32 }}>
          <h3 style={{ marginBottom: 16 }}>Додати нову послугу</h3>
          <form onSubmit={addService} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="input-field" placeholder="Назва послуги" value={name} onChange={e => setName(e.target.value)} required />
            <select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <textarea
                className="input-field"
                placeholder="Опис послуги (детально, що входить, матеріали, результат...)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                required
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <input className="input-field" type="number" placeholder="Ціна (₴)" value={price} onChange={e => setPrice(e.target.value)} required />
              <input className="input-field" type="number" placeholder="Тривалість (хв)" value={duration} onChange={e => setDuration(e.target.value)} />
            </div>
            <button className="btn-primary" type="submit">Додати послугу</button>
          </form>
        </div>

        <h3>Мої послуги ({myServices.length})</h3>
        {myServices.length === 0 ? (
            <p style={{ color: '#888' }}>У вас ще немає доданих послуг</p>
        ) : (
            myServices.map(s => (
                <div key={s.id} style={{
                  padding: '14px 18px', background: '#fff', marginBottom: 10,
                  borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    {s.category && <span style={{ marginLeft: 8, fontSize: 12, background: '#f0f0f0', padding: '2px 8px', borderRadius: 12 }}>{s.category}</span>}
                    <br />
                    <small style={{ color: '#888' }}>⏱ {s.durationMin} хв</small>
                  </div>
                  <strong style={{ color: '#00a3a6', fontSize: 16 }}>{s.price} ₴</strong>
                </div>
            ))
        )}
      </div>
  );
}

/* ─────────── АВТОРИЗАЦІЯ ─────────── */
function AuthPage({ setUser }) {
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CLIENT');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const url = isLoginMode ? `${API}/login` : `${API}/register`;
    const body = isLoginMode ? { email, password } : { name, email, password, role };
    try {
      const res = await axios.post(url, body);
      setUser(res.data);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.error || 'Помилка при авторизації');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 20px', minHeight: '100vh', background: '#f8f9fa' }}>
        <div style={{ background: '#fff', padding: 40, borderRadius: 15, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', width: '100%', maxWidth: 420 }}>
          <h2 style={{ textAlign: 'center', marginBottom: 24 }}>{isLoginMode ? 'Вхід в акаунт' : 'Реєстрація'}</h2>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!isLoginMode && (
                <input className="input-field" placeholder="Ваше ім'я" value={name} onChange={e => setName(e.target.value)} required />
            )}
            {!isLoginMode && (
                <select className="input-field" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="CLIENT">Клієнт</option>
                  <option value="MASTER">Майстер</option>
                </select>
            )}
            <input className="input-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input className="input-field" type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Завантаження...' : (isLoginMode ? 'Увійти' : 'Зареєструватися')}
            </button>
          </form>
          <p
              onClick={() => setIsLoginMode(!isLoginMode)}
              style={{ textAlign: 'center', marginTop: 20, color: '#00a3a6', cursor: 'pointer', fontSize: 14 }}
          >
            {isLoginMode ? '← Немає акаунту? Зареєструватись' : 'Вже є акаунт? Увійти →'}
          </p>
        </div>
      </div>
  );
}

export default App;
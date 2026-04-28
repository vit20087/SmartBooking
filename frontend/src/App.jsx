import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate, useSearchParams } from 'react-router-dom';
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
    if (window.confirm('Ви впевнені, що хочете вийти?')) {
      setUser(null);
      window.location.href = '/';
    }
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
          <Route path="/profile" element={user ? <ProfilePage user={user} setUser={setUser} /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user?.role === 'MASTER' ? <AdminPage user={user} services={services} setServices={setServices} /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
  );
}

/* ─────────── Сторінка 404 ─────────── */
function NotFound() {
  return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <h1 style={{ fontSize: 64, marginBottom: 20 }}>404</h1>
        <p style={{ fontSize: 20, marginBottom: 30 }}>Сторінку не знайдено</p>
        <Link to="/" className="btn-primary" style={{ padding: '12px 30px' }}>На головну</Link>
      </div>
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
                  const isOwnService = user && user.id === service.masterId;

                  return (
                      <div className="service-card" key={service.id}>
                        <img src={getServiceImage(service)} alt={service.name} className="service-image" loading="lazy" />

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
                            <span className="rating-link" onClick={() => setSelectedService({...service, showReviews: true})}>
                              ⭐ {rating.toFixed(1)}
                            </span>
                            {reviewCount > 0 && <span style={{ color: '#aaa' }}>({reviewCount} відгуків)</span>}
                          </div>
                          <div className="service-actions">
                            <button
                                className="btn-book"
                                style={{ flex: 1 }}
                                onClick={() => !isOwnService && setSelectedService(service)}
                                disabled={isOwnService}
                                title={isOwnService ? 'Ви не можете забронювати власну послугу' : 'Забронювати'}
                            >
                              Забронювати
                            </button>
                            <button
                                onClick={() => toggleFavorite(service.id)}
                                title={isFav ? 'Прибрати з обраного' : 'Додати в обране'}
                                className="favorite-btn"
                                style={{
                                  background: isFav ? '#ff4081' : '#f0f0f0',
                                  color: isFav ? '#fff' : '#999',
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

        {selectedService && !selectedService.showReviews && (
            <BookingModal service={selectedService} user={user} onClose={() => setSelectedService(null)} />
        )}
        {selectedService && selectedService.showReviews && (
            <ReviewsModal service={selectedService} onClose={() => setSelectedService(null)} />
        )}
      </>
  );
}

/* ─────────── МОДАЛКА ВІДГУКІВ ─────────── */
function ReviewsModal({ service, onClose }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/services/${service.id}/reviews`)
        .then(res => { setReviews(res.data); setLoading(false); })
        .catch(() => setLoading(false));
  }, [service.id]);

  return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
          <button onClick={onClose} className="modal-close-btn">✕</button>
          <h3 style={{ marginBottom: 10 }}>Відгуки про "{service.name}"</h3>
          <p style={{ color: '#666', marginBottom: 20 }}>
            ⭐ Середній рейтинг: {service.master?.rating?.toFixed(1) || '5.0'} ({reviews.length})
          </p>
          {loading ? <p>Завантаження...</p> : reviews.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center' }}>Ще немає відгуків</p>
          ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {reviews.map(r => (
                    <div key={r.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{r.user?.name || 'Клієнт'}</strong>
                        <span>⭐ {r.rating}</span>
                      </div>
                      <p style={{ margin: '8px 0 4px' }}>{r.comment}</p>
                      <small style={{ color: '#aaa' }}>{new Date(r.createdAt).toLocaleDateString('uk-UA')}</small>
                    </div>
                ))}
              </div>
          )}
          <button onClick={onClose} className="btn-secondary" style={{ marginTop: 20, width: '100%' }}>Закрити</button>
        </div>
      </div>
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
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const navigate = useNavigate();

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!date) return;
    const fetchBooked = async () => {
      setLoadingSlots(true);
      try {
        const params = { serviceId: service.id, date };
        if (user) params.userId = user.id;
        const res = await axios.get(`${API}/bookings/availability`, { params });
        setBookedSlots(res.data.bookedSlots || []);
      } catch {
        setBookedSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchBooked();
  }, [date, service.id, user]);

  const handleBook = async () => {
    if (!user) {
      if (window.confirm('Для бронювання потрібно увійти в акаунт. Перейти до сторінки входу?')) {
        navigate('/login');
      }
      return;
    }
    if (bookedSlots.includes(time)) {
      alert('Цей час уже зайнятий. Оберіть інший.');
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
    } catch (error) {
      if (error.response?.status === 409 || error.response?.status === 403) {
        const message = error.response?.data?.error || 'Цей час уже зайнятий.';
        alert(`❌ ${message}`);
        const params = { serviceId: service.id, date };
        if (user) params.userId = user.id;
        const res = await axios.get(`${API}/bookings/availability`, { params });
        setBookedSlots(res.data.bookedSlots || []);
        if (res.data.bookedSlots.includes(time)) {
          setTime('');
        }
      } else {
        alert('❌ Помилка при бронюванні. Спробуйте ще раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="modal-close-btn">✕</button>

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
          {loadingSlots ? (
              <p>Перевірка зайнятості...</p>
          ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 24 }}>
                {timeSlots.map(t => {
                  const isBooked = bookedSlots.includes(t);
                  return (
                      <button
                          key={t}
                          onClick={() => !isBooked && setTime(t)}
                          disabled={isBooked}
                          style={{
                            padding: '8px 0',
                            borderRadius: 8,
                            border: `2px solid ${time === t ? '#00a3a6' : '#eee'}`,
                            background: isBooked ? '#f0f0f0' : (time === t ? '#00a3a6' : '#fff'),
                            color: isBooked ? '#aaa' : (time === t ? '#fff' : '#333'),
                            fontWeight: 600,
                            cursor: isBooked ? 'not-allowed' : 'pointer',
                            fontSize: 13,
                            transition: 'all 0.15s',
                            textDecoration: isBooked ? 'line-through' : 'none'
                          }}
                      >
                        {t}
                      </button>
                  );
                })}
              </div>
          )}

          <button
              className="btn-primary"
              onClick={handleBook}
              disabled={loading || loadingSlots}
              style={{ width: '100%', marginBottom: 10, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Обробка...' : 'Підтвердити запис'}
          </button>
          <button onClick={onClose} className="btn-secondary" style={{ width: '100%' }}>
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
            <div className="masters-grid">
              {masters.map(master => {
                const isSelf = user && user.id === master.id;
                return (
                    <div key={master.id} className="master-card">
                      <img src={master.photoUrl} alt={master.name} loading="lazy" />
                      <div className="master-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <h3 style={{ margin: 0, fontSize: 20 }}>{master.name}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            ⭐ <strong>{master.rating ? master.rating.toFixed(1) : '5.0'}</strong>
                            <span style={{ fontSize: 13, color: '#888' }}>({master.reviewCount || 0})</span>
                          </div>
                        </div>
                        <p className="master-bio">{master.bio}</p>
                        {master.services && master.services.length > 0 && (
                            <div className="master-tags">
                              {master.services.slice(0, 4).map(s => (
                                  <span key={s.id} className="service-tag">{s.name}</span>
                              ))}
                              {master.services.length > 4 && (
                                  <span className="service-tag more">+{master.services.length - 4} ще</span>
                              )}
                            </div>
                        )}
                        <div className="master-actions">
                          <button
                              onClick={() => !isSelf && setSelectedMaster(master)}
                              className="btn-primary"
                              disabled={isSelf}
                              style={{ width: '100%', padding: 14, fontSize: 15 }}
                              title={isSelf ? 'Це ваш власний профіль' : 'Записатися до майстра'}
                          >
                            {isSelf ? 'Це ви' : 'Записатися до майстра'}
                          </button>
                        </div>
                      </div>
                    </div>
                );
              })}
            </div>
        )}

        {selectedMaster && (
            <MasterBookingModal master={selectedMaster} user={user} onClose={() => setSelectedMaster(null)} />
        )}
      </div>
  );
}

/* Модалка для запису до конкретного майстра */
function MasterBookingModal({ master, user, onClose }) {
  const [selectedService, setSelectedService] = useState(null);
  const isSelf = user && user.id === master.id;

  if (selectedService) {
    return <BookingModal service={{ ...selectedService, master }} user={user} onClose={onClose} />;
  }

  return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="modal-close-btn">✕</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <img src={master.photoUrl} alt={master.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
            <div>
              <h3 style={{ margin: 0 }}>{master.name}</h3>
              <span style={{ color: '#888', fontSize: 13 }}>⭐ {master.rating?.toFixed(1) || '5.0'} · {master.reviewCount || 0} відгуків</span>
            </div>
          </div>
          <p style={{ fontWeight: 600, marginBottom: 12 }}>Оберіть послугу:</p>
          {master.services && master.services.length > 0 ? (
              <div className="service-list">
                {master.services.map(s => (
                    <button
                        key={s.id}
                        onClick={() => !isSelf && setSelectedService(s)}
                        disabled={isSelf}
                        className="service-select-btn"
                        title={isSelf ? 'Ви не можете забронювати власну послугу' : ''}
                        style={{ opacity: isSelf ? 0.6 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}
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
function ProfilePage({ user, setUser }) {
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(user.photoUrl || 'https://i.pravatar.cc/150');
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('favorites') || '[]'); }
    catch { return []; }
  });
  const [allServices, setAllServices] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/users/${user.id}/bookings`)
        .then(res => { setBookings(res.data); setLoadingBookings(false); })
        .catch(() => setLoadingBookings(false));
  }, [user.id]);

  useEffect(() => {
    axios.get(`${API}/services`)
        .then(res => setAllServices(res.data))
        .catch(() => {});
  }, []);

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

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };
//Не хендлиться зображення ,постійно збивається
//  TODO: Пофіксити завантаження автару ,зробити підвантаження в DB .Зображення постійно підтягується з посилань ,навіть якщо це профіль.
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Будь ласка, виберіть зображення.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Файл завеликий. Максимальний розмір — 2 МБ.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setAvatarUrl(dataUrl);
      const updatedUser = { ...user, photoUrl: dataUrl };
      setUser(updatedUser);
      localStorage.setItem('smartbooking_user', JSON.stringify(updatedUser));
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const removeFavorite = (serviceId) => {
    const newFav = favorites.filter(id => id !== serviceId);
    setFavorites(newFav);
    localStorage.setItem('favorites', JSON.stringify(newFav));
  };

  const favoriteServices = allServices.filter(s => favorites.includes(s.id));

  const STATUS_LABELS = {
    pending:   { label: 'Очікується', color: '#f59e0b' },
    confirmed: { label: 'Підтверджено', color: '#10b981' },
    completed: { label: 'Завершено', color: '#6366f1' },
    cancelled: { label: 'Скасовано', color: '#ef4444' },
  };

  return (
      <div className="profile-page">
        <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleFileChange}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 40 }}>
          <img
              src={avatarUrl}
              alt={user.name}
              className="profile-avatar"
              onClick={handleAvatarClick}
              title="Натисніть, щоб завантажити нове фото"
          />
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>Привіт, {user.name}!</h1>
            <p style={{ color: '#666', margin: '4px 0 0' }}>{user.email}</p>
          </div>
        </div>

        <h2 className="section-title" style={{ marginBottom: 20 }}>Мої записи</h2>
        {loadingBookings ? (
            <p style={{ color: '#888' }}>Завантаження...</p>
        ) : bookings.length === 0 ? (
            <div className="empty-state">
              <div>📅</div>
              <p>У вас ще немає записів</p>
            </div>
        ) : (
            <div style={{ marginBottom: 40 }}>
              {bookings.map(b => {
                const st = STATUS_LABELS[b.status] || { label: b.status, color: '#888' };
                return (
                    <div key={b.id} className="booking-item">
                      <div className="booking-info">
                        <strong style={{ fontSize: 16 }}>{b.service?.name}</strong>
                        {b.service?.master && <span style={{ color: '#888', fontSize: 14 }}> · {b.service.master.name}</span>}
                        <br />
                        <small style={{ color: '#666' }}>
                          {new Date(b.date).toLocaleString('uk-UA', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          {' · '}
                          <span style={{ color: st.color, fontWeight: 600 }}>{st.label}</span>
                        </small>
                      </div>
                      <div className="booking-actions">
                        {b.status !== 'cancelled' && b.status !== 'completed' && (
                            <button onClick={() => cancelBooking(b.id)} className="btn-danger">
                              Скасувати
                            </button>
                        )}
                        {b.status === 'completed' && !b.review && (
                            <button onClick={() => leaveReview(b.id)} className="btn-primary">
                              Залишити відгук
                            </button>
                        )}
                      </div>
                    </div>
                );
              })}
            </div>
        )}

        <h2 className="section-title" style={{ marginBottom: 20 }}>Збережені послуги</h2>
        {favoriteServices.length === 0 ? (
            <div className="empty-state">
              <div>❤️</div>
              <p>Ви ще не додали жодної послуги в обране</p>
            </div>
        ) : (
            <div className="favorites-grid">
              {favoriteServices.map(service => (
                  <div key={service.id} className="favorite-card">
                    <img src={getServiceImage(service)} alt={service.name} loading="lazy" />
                    <h3>{service.name}</h3>
                    <p className="favorite-desc">{service.description?.slice(0, 60)}...</p>
                    <div className="favorite-card-footer">
                      <span className="price">{service.price} ₴</span>
                      <button onClick={() => removeFavorite(service.id)} className="remove-fav-btn" title="Видалити з обраного">
                        ❤️
                      </button>
                    </div>
                  </div>
              ))}
            </div>
        )}
      </div>
  );
}

/* ─────────── ПАНЕЛЬ МАЙСТРА ─────────── */
function AdminPage({ user, services, setServices }) {
  const [activeTab, setActiveTab] = useState('services');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState(60);
  const [category, setCategory] = useState('Стрижка');
  const [description, setDescription] = useState('');
  const [editingService, setEditingService] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const CATEGORIES = ['Стрижка', 'Фарбування', 'Укладка', 'Манікюр', 'Педикюр', 'Масаж', 'Брови та вії', 'Епіляція', 'Макіяж', 'Догляд'];

  const myServices = services.filter(s => s.masterId === user.id);

  useEffect(() => {
    if (activeTab === 'bookings') {
      setLoadingBookings(true);
      axios.get(`${API}/masters/${user.id}/bookings`)
          .then(res => setBookings(res.data))
          .catch(() => {})
          .finally(() => setLoadingBookings(false));
    }
  }, [activeTab, user.id]);

  const resetForm = () => {
    setName('');
    setPrice('');
    setDuration(60);
    setCategory('Стрижка');
    setDescription('');
    setEditingService(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description) return alert('Додайте опис послуги');
    try {
      if (editingService) {
        const res = await axios.put(`${API}/services/${editingService.id}`, {
          name, price: +price, durationMin: +duration, category, description, masterId: user.id
        });
        setServices(services.map(s => s.id === editingService.id ? res.data : s));
        alert('✅ Послугу оновлено!');
      } else {
        const res = await axios.post(`${API}/services`, {
          name, price: +price, durationMin: +duration, masterId: user.id, category, description
        });
        setServices([res.data, ...services]);
        alert('✅ Послугу додано!');
      }
      resetForm();
    } catch {
      alert('Помилка при збереженні послуги');
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setName(service.name);
    setPrice(service.price);
    setDuration(service.durationMin);
    setCategory(service.category);
    setDescription(service.description);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Видалити послугу? Це також скасує всі майбутні записи.')) return;
    try {
      await axios.delete(`${API}/services/${id}`, { params: { masterId: user.id } });
      setServices(services.filter(s => s.id !== id));
      alert('Послугу видалено');
    } catch {
      alert('Помилка видалення');
    }
  };

  const handleBookingStatus = async (bookingId, status) => {
    try {
      await axios.patch(`${API}/bookings/${bookingId}`, { status });
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status } : b));
    } catch {
      alert('Помилка оновлення статусу');
    }
  };

  return (
      <div className="admin-page">
        <h2>Панель майстра — {user.name}</h2>

        <div className="admin-tabs">
          <button className={activeTab === 'services' ? 'active' : ''} onClick={() => setActiveTab('services')}>
            Мої послуги
          </button>
          <button className={activeTab === 'bookings' ? 'active' : ''} onClick={() => setActiveTab('bookings')}>
            Записи клієнтів
          </button>
        </div>

        {activeTab === 'services' && (
            <>
              <div className="admin-form-card">
                <h3>{editingService ? 'Редагувати послугу' : 'Додати нову послугу'}</h3>
                <form onSubmit={handleSubmit} className="admin-form">
                  <input className="input-field" placeholder="Назва послуги" value={name} onChange={e => setName(e.target.value)} required />
                  <select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <textarea
                      className="input-field"
                      placeholder="Опис послуги"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      required
                  />
                  <div style={{ display: 'flex', gap: 12 }}>
                    <input className="input-field" type="number" placeholder="Ціна (₴)" value={price} onChange={e => setPrice(e.target.value)} required />
                    <input className="input-field" type="number" placeholder="Тривалість (хв)" value={duration} onChange={e => setDuration(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-primary" type="submit">{editingService ? 'Оновити' : 'Додати'}</button>
                    {editingService && <button type="button" className="btn-secondary" onClick={resetForm}>Скасувати</button>}
                  </div>
                </form>
              </div>

              <h3>Мої послуги ({myServices.length})</h3>
              {myServices.length === 0 ? (
                  <p style={{ color: '#888' }}>У вас ще немає доданих послуг</p>
              ) : (
                  myServices.map(s => (
                      <div key={s.id} className="admin-service-item">
                        <div>
                          <span className="service-name">{s.name}</span>
                          {s.category && <span className="service-category-badge">{s.category}</span>}
                          <br />
                          <small>⏱ {s.durationMin} хв</small>
                        </div>
                        <strong className="service-price">{s.price} ₴</strong>
                        <div className="service-actions-admin">
                          <button className="btn-icon" onClick={() => handleEdit(s)} title="Редагувати">✏️</button>
                          <button className="btn-icon" onClick={() => handleDelete(s.id)} title="Видалити">🗑️</button>
                        </div>
                      </div>
                  ))
              )}
            </>
        )}

        {activeTab === 'bookings' && (
            <div>
              <h3>Записи клієнтів</h3>
              {loadingBookings ? <p>Завантаження...</p> : bookings.length === 0 ? (
                  <div className="empty-state">
                    <div>📋</div>
                    <p>Немає активних записів</p>
                  </div>
              ) : (
                  <div className="bookings-list">
                    {bookings.map(b => (
                        <div key={b.id} className="admin-booking-item">
                          <div>
                            <strong>{b.service?.name}</strong>
                            <div style={{ fontSize: 14, color: '#555' }}>
                              Клієнт: {b.user?.name || '—'} | {new Date(b.date).toLocaleString('uk-UA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ fontSize: 13, marginTop: 4 }}>
                              Статус: <span style={{ fontWeight: 600, color: b.status === 'pending' ? '#f59e0b' : b.status === 'confirmed' ? '#10b981' : '#888' }}>
                                {b.status === 'pending' ? 'Очікує' : b.status === 'confirmed' ? 'Підтверджено' : b.status}
                              </span>
                            </div>
                          </div>
                          <div className="booking-actions">
                            {b.status === 'pending' && (
                                <>
                                  <button className="btn-confirm" onClick={() => handleBookingStatus(b.id, 'confirmed')}>Підтвердити</button>
                                  <button className="btn-reject" onClick={() => handleBookingStatus(b.id, 'cancelled')}>Відхилити</button>
                                </>
                            )}
                            {b.status === 'confirmed' && (
                                <button className="btn-complete" onClick={() => handleBookingStatus(b.id, 'completed')}>Завершити</button>
                            )}
                          </div>
                        </div>
                    ))}
                  </div>
              )}
            </div>
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
      <div className="auth-container">
        <div className="auth-card">
          <h2>{isLoginMode ? 'Вхід в акаунт' : 'Реєстрація'}</h2>
          <form onSubmit={handleAuth}>
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
          <p style={{ textAlign: 'center', marginTop: 10 }}>
            <Link to="/forgot-password" style={{ color: '#00a3a6', textDecoration: 'none', fontSize: 14 }}>
              Забули пароль?
            </Link>
          </p>
          <p className="auth-toggle" onClick={() => setIsLoginMode(!isLoginMode)}>
            {isLoginMode ? '← Немає акаунту? Зареєструватись' : 'Вже є акаунт? Увійти →'}
          </p>
        </div>
      </div>
  );
}

/* ─────────── ВІДНОВЛЕННЯ ПАРОЛЮ ─────────── */
function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await axios.post(`${API}/forgot-password`, { email });
      setMessage('Інструкції з відновлення надіслано на вашу електронну пошту.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      setMessage('Помилка. Спробуйте ще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Відновлення паролю</h2>
          <p style={{ marginBottom: 20, color: '#666' }}>Введіть email, на який зареєстровано акаунт.</p>
          {message && <p style={{ color: '#00a3a6', marginBottom: 15 }}>{message}</p>}
          <form onSubmit={handleSubmit}>
            <input
                className="input-field"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
            />
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Відправка...' : 'Надіслати інструкції'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20 }}>
            <Link to="/login" style={{ color: '#00a3a6', textDecoration: 'none' }}>← Повернутися до входу</Link>
          </p>
        </div>
      </div>
  );
}

function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Відсутній токен для скидання паролю.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Паролі не співпадають');
      return;
    }
    if (password.length < 8) {
      setError('Пароль має містити щонайменше 8 символів');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await axios.post(`${API}/reset-password`, { token, password });
      setMessage('Пароль успішно змінено! Зараз ви будете перенаправлені на сторінку входу.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Помилка скидання паролю. Можливо, токен недійсний.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
        <div className="auth-container">
          <div className="auth-card">
            <h2>Помилка</h2>
            <p style={{ color: '#dc3545' }}>Невірне посилання для скидання паролю.</p>
            <Link to="/login" className="btn-primary" style={{ display: 'inline-block', marginTop: 20 }}>На сторінку входу</Link>
          </div>
        </div>
    );
  }

  return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Новий пароль</h2>
          {message && <p style={{ color: '#00a3a6', marginBottom: 15 }}>{message}</p>}
          {error && <p style={{ color: '#dc3545', marginBottom: 15 }}>{error}</p>}
          <form onSubmit={handleSubmit}>
            <input
                className="input-field"
                type="password"
                placeholder="Новий пароль"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
            />
            <input
                className="input-field"
                type="password"
                placeholder="Підтвердження паролю"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
            />
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Збереження...' : 'Змінити пароль'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20 }}>
            <Link to="/login" style={{ color: '#00a3a6', textDecoration: 'none' }}>← Повернутися до входу</Link>
          </p>
        </div>
      </div>
  );
}

export default App;
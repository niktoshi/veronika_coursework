const state = {
  data: {},
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  page: 'home',
  selectedTime: null
};

const api = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(state.user ? { 'x-user-id': state.user.id } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`/api${url}`, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  return data;
};

const money = (value) =>
  new Intl.NumberFormat('ru-RU').format(value) + ' ₽';

const orderStatusLabels = {
  paid: 'Оплачен',
  processing: 'В обработке',
  shipped: 'Передан в доставку',
  completed: 'Завершен',
  cancelled: 'Отменен'
};

const toast = (message) => {
  document.querySelector('#toast .toast-body').textContent = message;
  bootstrap.Toast.getOrCreateInstance('#toast').show();
};

async function init() {
  state.data = await api('/bootstrap');
  updateNavigation();

  if (!state.user) {
    showPage('home');
    return;
  }

  showPage(location.hash.slice(1) || 'home');
}

function updateNavigation() {
  document.querySelectorAll('.auth-only').forEach((item) => {
    item.classList.toggle('d-none', !state.user);
  });

  const loginItem = document.querySelector('#loginNavItem');
  loginItem.classList.toggle('d-none', Boolean(state.user));
}

function showPage(page) {
  if (!state.user && !['auth', 'register', 'home', 'shop'].includes(page)) {
    toast('Войдите в аккаунт, чтобы продолжить');
    location.hash = 'auth';
    auth();
    return;
  }

  if (page === 'admin' && state.user.role !== 'admin') {
    toast('Доступ разрешен только администратору');
    showPage('profile');
    return;
  }

  state.page = page;
  location.hash = page;
  updateNavigation();

  const views = {
    home,
    booking,
    shop,
    appointments,
    orders,
    profile,
    admin,
    cart,
    auth,
    register
  };

  (views[page] || home)();
  window.scrollTo(0, 0);
}

function shell(content) {
  document.querySelector('#app').innerHTML = content;
}

function auth() {
  shell(`
    <section class="section section-soft min-vh-100">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-6 col-lg-5">
            <div class="bg-white p-4 p-md-5">
              <div class="logo mb-3">VELVET<span>.</span></div>
              <div class="eyebrow">Добро пожаловать</div>
              <h1 class="fw-bold mb-4">Вход в аккаунт</h1>
              <form onsubmit="login(event)">
                <label class="form-label">Email</label>
                <input id="loginEmail" type="email" class="form-control mb-3" required>
                <label class="form-label">Пароль</label>
                <input id="loginPassword" type="password" class="form-control mb-3" required>
                <div id="authError" class="text-danger small mb-3"></div>
                <button class="btn btn-dark w-100">Войти</button>
              </form>
              <p class="text-center text-secondary mt-4 mb-0">
                Нет аккаунта? <a href="#register">Зарегистрироваться</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `);
}

function register() {
  shell(`
    <section class="section section-soft min-vh-100">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-6 col-lg-5">
            <div class="bg-white p-4 p-md-5">
              <div class="logo mb-3">VELVET<span>.</span></div>
              <div class="eyebrow">Новый клиент</div>
              <h1 class="fw-bold mb-4">Регистрация</h1>
              <form onsubmit="registerUser(event)">
                <label class="form-label">Имя</label>
                <input id="registerName" class="form-control mb-3" required>
                <label class="form-label">Email</label>
                <input id="registerEmail" type="email" class="form-control mb-3" required>
                <label class="form-label">Телефон</label>
                <input id="registerPhone" type="tel" class="form-control mb-3" placeholder="+7 (999) 123-45-67">
                <label class="form-label">Пароль</label>
                <input id="registerPassword" type="password" minlength="6" class="form-control mb-3" required>
                <div id="registerError" class="text-danger small mb-3"></div>
                <button class="btn btn-rose w-100">Создать аккаунт</button>
              </form>
              <p class="text-center text-secondary mt-4 mb-0">
                Уже зарегистрированы? <a href="#auth">Войти</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `);
}

async function login(event) {
  event.preventDefault();
  authError.textContent = '';

  try {
    state.user = await api('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: loginEmail.value,
        password: loginPassword.value
      })
    });

    localStorage.setItem('user', JSON.stringify(state.user));
    updateNavigation();
    showPage('home');
  } catch (error) {
    authError.textContent = error.message;
  }
}

async function registerUser(event) {
  event.preventDefault();
  registerError.textContent = '';

  try {
    state.user = await api('/register', {
      method: 'POST',
      body: JSON.stringify({
        name: registerName.value,
        email: registerEmail.value,
        phone: registerPhone.value,
        password: registerPassword.value
      })
    });

    localStorage.setItem('user', JSON.stringify(state.user));
    updateNavigation();
    showPage('home');
  } catch (error) {
    registerError.textContent = error.message;
  }
}

function logout() {
  localStorage.removeItem('user');
  state.user = null;
  updateNavigation();
  showPage('home');
}

function home() {
  const serviceIcons = ['scissors', 'stars', 'person-standing', 'wind'];
  const services = state.data.services
    .map((service, index) => `
      <div class="col-md-3">
        <div class="service-card">
          <i class="bi bi-${serviceIcons[index % 4]} service-icon"></i>
          <h5 class="mt-4">${service.name}</h5>
          <p class="text-secondary small">${service.description}</p>
          <b>${money(service.price)}</b>
        </div>
      </div>
    `)
    .join('');

  const masters = state.data.masters
    .slice(0, 2)
    .map((master) => `
      <div class="col-6">
        <div class="master-card">
          <img src="${master.photo || 'https://i.pravatar.cc/300'}">
          <div class="p-3">
            <b>${master.name}</b>
            <small class="d-block text-secondary">${master.specialty}</small>
          </div>
        </div>
      </div>
    `)
    .join('');

  shell(`
    <section class="hero d-flex align-items-center">
      <div class="container">
        <div class="eyebrow text-white mb-3">Салон красоты в центре города</div>
        <h1>Ваш стиль.<br>Ваша история.</h1>
        <p class="lead col-md-6 mb-4">
          Место, где забота о себе становится красивой привычкой.
        </p>
        <a href="#booking" class="btn btn-rose btn-lg">
          Записаться к мастеру <i class="bi bi-arrow-right"></i>
        </a>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="row mb-4">
          <div class="col-md-7">
            <div class="eyebrow">Наш подход</div>
            <h2 class="display-6 fw-bold">Услуги, созданные<br>для вас</h2>
          </div>
          <div class="col-md-5 text-secondary">
            Мы соединяем профессионализм мастеров, качественные средства и атмосферу,
            в которую хочется возвращаться.
          </div>
        </div>
        <div class="row g-3">${services}</div>
      </div>
    </section>

    <section class="section section-soft">
      <div class="container">
        <div class="row align-items-center g-5">
          <div class="col-lg-6">
            <div class="eyebrow">Выберите своего мастера</div>
            <h2 class="display-6 fw-bold">В надежных руках</h2>
            <p class="text-secondary">
              Наши мастера слышат ваши пожелания и помогают найти образ,
              в котором вы чувствуете себя собой.
            </p>
            <a href="#booking" class="btn btn-dark">Посмотреть расписание</a>
          </div>
          <div class="col-lg-6">
            <div class="row g-3">${masters}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="row">
          <div class="col-md-5">
            <div class="eyebrow">Контакты</div>
            <h2 class="fw-bold">Ждем вас</h2>
            <p class="text-secondary">
              Москва, ул. Петровка, 18<br>
              Ежедневно с 10:00 до 20:00<br>
              +7 (495) 123-45-67
            </p>
          </div>
          <div class="col-md-7">
            <div class="ratio ratio-16x9 bg-dark">
              <iframe
                src="https://www.openstreetmap.org/export/embed.html?bbox=37.59%2C55.76%2C37.62%2C55.77&layer=mapnik"
                style="border: 0"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </section>
  `);
}

async function booking() {
  const services = state.data.services
    .map((service) => `
      <option value="${service.id}">
        ${service.name} · ${money(service.price)}
      </option>
    `)
    .join('');

  const masters = state.data.masters
    .map((master) => `
      <option value="${master.id}">
        ${master.name} · ${master.specialty}
      </option>
    `)
    .join('');

  const tomorrow = new Date(Date.now() + 86400000)
    .toISOString()
    .slice(0, 10);

  shell(`
    <section class="section section-soft">
      <div class="container">
        <div class="eyebrow">Онлайн-запись</div>
        <h1 class="fw-bold mb-4">Запись к мастеру</h1>
        <div class="row g-4">
          <div class="col-lg-7">
            <div class="bg-white p-4">
              <label class="form-label fw-bold">1. Выберите услугу</label>
              <select id="service" class="form-select mb-4">${services}</select>

              <label class="form-label fw-bold">2. Выберите мастера</label>
              <select id="master" class="form-select mb-4">${masters}</select>

              <label class="form-label fw-bold">3. Дата</label>
              <input
                id="date"
                type="date"
                class="form-control mb-4"
                min="${new Date().toISOString().slice(0, 10)}"
                value="${tomorrow}"
                onchange="loadSlots()"
              >

              <label class="form-label fw-bold">4. Время</label>
              <div id="slots" class="d-flex flex-wrap gap-2 mb-4"></div>

              <label class="form-label fw-bold">5. Телефон для связи</label>
              <input
                id="bookingPhone"
                type="tel"
                class="form-control"
                placeholder="+7 (999) 123-45-67"
                value="${state.user.phone || ''}"
                required
              >
              <button class="btn btn-rose mt-4" onclick="bookAppointment()">
                Записаться <i class="bi bi-arrow-right"></i>
              </button>
            </div>
          </div>
          <div class="col-lg-5">
            <div class="bg-dark text-white p-4 h-100">
              <div class="eyebrow text-white">Важно</div>
              <h4>Ваш визит начинается с заботы</h4>
              <p class="text-white-50">
                Выберите свободное окно. После отправки заявка появится в разделе
                «Мои записи» и будет ожидать подтверждения администратора.
              </p>
              <a href="#appointments" class="btn btn-outline-light">Мои записи</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `);

  await loadSlots();
}

async function loadSlots() {
  const slots = await api(
    `/slots?date=${date.value}&master_id=${master.value}`
  );

  document.querySelector('#slots').innerHTML = slots
    .map((slot) => {
      if (slot.available) {
        return `<button class="slot btn available" onclick="selectSlot(this, '${slot.time}')">${slot.time}</button>`;
      }

      return `<button class="slot btn busy" onclick="toast('Это время уже занято. Выберите другое.')">${slot.time}</button>`;
    })
    .join('');
}

function selectSlot(element, time) {
  document.querySelectorAll('.slot').forEach((slot) => {
    slot.classList.remove('selected');
  });

  element.classList.add('selected');
  state.selectedTime = time;
}

async function bookAppointment() {
  if (!state.selectedTime) {
    toast('Выберите свободное время');
    return;
  }

  if (!bookingPhone.value.trim()) {
    toast('Укажите телефон для связи');
    return;
  }

  try {
    await api('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        master_id: master.value,
        service_id: service.value,
        date: date.value,
        time: state.selectedTime,
        phone: bookingPhone.value
      })
    });

    toast('Заявка отправлена');
    setTimeout(() => showPage('appointments'), 700);
  } catch (error) {
    toast(error.message);
  }
}

function shop() {
  const products = state.data.products
    .map((product) => `
      <div class="col-md-4">
        <div class="product-card">
          <img src="${product.image}" class="w-100">
          <div class="p-3">
            <div class="d-flex justify-content-between">
              <h5>${product.name}</h5>
              <span class="price">${money(product.price)}</span>
            </div>
            <p class="text-secondary small">${product.description}</p>
            <button class="btn btn-dark w-100" onclick="addCart(${product.id})">
              <i class="bi bi-plus-lg"></i> В корзину
            </button>
          </div>
        </div>
      </div>
    `)
    .join('');

  shell(`
    <section class="section">
      <div class="container">
        <div class="d-flex justify-content-between align-items-end mb-4">
          <div>
            <div class="eyebrow">Уход дома</div>
            <h1 class="fw-bold">Магазин</h1>
          </div>
          <a class="btn btn-dark" href="#cart">
            <i class="bi bi-bag"></i> Корзина
          </a>
        </div>
        <div class="row g-4">${products}</div>
      </div>
    </section>
  `);
}

async function addCart(productId) {
  try {
    const result = await api('/cart', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId })
    });

    toast(`Товар добавлен в корзину. Товаров: ${result.count}`);
  } catch (error) {
    toast(error.message);
  }
}

async function cart() {
  const items = await api('/cart');
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const content = items.length
    ? `
      <div class="row">
        <div class="col-lg-8">
          ${items.map((item) => `
            <div class="appointment-row d-flex justify-content-between align-items-center">
              <div>
                <b>${item.name}</b>
                <div class="text-secondary small">${item.quantity} шт.</div>
              </div>
              <div>
                ${money(item.price * item.quantity)}
                <button class="btn btn-sm text-danger" onclick="removeCart(${item.id})">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="col-lg-4">
          <div class="bg-light p-4">
            <span class="text-secondary">Итого</span>
            <h2>${money(total)}</h2>
            <button class="btn btn-rose w-100" onclick="openPayment()">
              Перейти к оплате
            </button>
          </div>
        </div>
      </div>
    `
    : '<p class="text-secondary">Корзина пуста.</p>';

  shell(`
    <section class="section">
      <div class="container">
        <div class="eyebrow">Ваши покупки</div>
        <h1 class="fw-bold mb-4">Корзина</h1>
        ${content}
      </div>
    </section>
  `);
}

function openPayment() {
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.id = 'paymentModal';
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Демонстрационная оплата</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <form onsubmit="payOrder(event)">
          <div class="modal-body">
            <p class="text-secondary small">
              Это учебная оплата. Настоящие денежные средства не списываются.
            </p>
            <label class="form-label">Имя держателя карты</label>
            <input id="cardHolder" class="form-control mb-3" placeholder="IVAN IVANOV" required>
            <label class="form-label">Номер карты</label>
            <input id="cardNumber" class="form-control mb-3" inputmode="numeric" maxlength="19" placeholder="0000 0000 0000 0000" oninput="formatCardNumber(this)" required>
            <div class="row">
              <div class="col-6">
                <label class="form-label">Срок действия</label>
                <input id="cardExpiry" class="form-control" inputmode="numeric" placeholder="MM/YY" maxlength="5" oninput="formatCardExpiry(this)" required>
              </div>
              <div class="col-6">
                <label class="form-label">CVV</label>
                <input id="cardCvv" class="form-control" inputmode="numeric" maxlength="3" placeholder="000" required>
              </div>
            </div>
            <div id="paymentError" class="text-danger small mt-3"></div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-rose">Оплатить заказ</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('hidden.bs.modal', () => modal.remove());
  bootstrap.Modal.getOrCreateInstance(modal).show();
}

function formatCardNumber(input) {
  const digits = input.value.replace(/\D/g, '').slice(0, 16);
  input.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatCardExpiry(input) {
  const digits = input.value.replace(/\D/g, '').slice(0, 4);
  input.value = digits.length > 2
    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
    : digits;
}

async function payOrder(event) {
  event.preventDefault();
  paymentError.textContent = '';

  try {
    await api('/cart/checkout', {
      method: 'POST',
      body: JSON.stringify({
        cardHolder: cardHolder.value,
        cardNumber: cardNumber.value,
        expiry: cardExpiry.value,
        cvv: cardCvv.value
      })
    });

    bootstrap.Modal.getInstance(document.querySelector('#paymentModal')).hide();
    toast('Оплата прошла успешно. Заказ оформлен.');
    setTimeout(() => cart(), 700);
  } catch (error) {
    paymentError.textContent = error.message;
  }
}

async function removeCart(productId) {
  await api(`/cart/${productId}`, { method: 'DELETE' });
  cart();
}

async function orders() {
  const rows = await api('/orders');
  const content = rows.length
    ? rows.map((order) => `
      <div class="appointment-row row align-items-center">
        <div class="col-md-3">
          <b>Заказ №${order.id}</b><br>
          <span class="text-secondary">
            ${new Date(order.created_at).toLocaleDateString('ru-RU')}
          </span>
        </div>
        <div class="col-md-3">${money(order.total)}</div>
        <div class="col-md-4">
          <span class="status status-${order.status}">
            ${orderStatusLabels[order.status] || order.status}
          </span>
        </div>
      </div>
    `).join('')
    : '<p class="text-secondary">У вас пока нет заказов.</p>';

  shell(`
    <section class="section">
      <div class="container">
        <div class="eyebrow">История покупок</div>
        <h1 class="fw-bold mb-4">Мои заказы</h1>
        <div class="bg-white">${content}</div>
      </div>
    </section>
  `);
}

async function appointments() {
  const rows = await api('/appointments');
  const content = rows.length
    ? rows.map((appointment) => `
      <div class="appointment-row row align-items-center">
        <div class="col-md-3">
          <b>${new Date(appointment.appointment_date).toLocaleDateString('ru-RU')}</b>
          <br>
          <span class="text-secondary">${String(appointment.appointment_time).slice(0, 5)}</span>
        </div>
        <div class="col-md-3">
          <b>${appointment.service_name}</b>
          <br>
          <span class="text-secondary">${appointment.master_name}</span>
        </div>
        <div class="col-md-2">
          <span class="text-secondary">
            <i class="bi bi-telephone"></i> ${appointment.phone || '—'}
          </span>
        </div>
        <div class="col-md-2">${money(appointment.price)}</div>
        <div class="col-md-2">
          <span class="status status-${appointment.status}">
            ${appointment.status_label}
          </span>
        </div>
      </div>
    `).join('')
    : '<p class="text-secondary">У вас пока нет записей.</p>';

  shell(`
    <section class="section">
      <div class="container">
        <div class="eyebrow">Личный кабинет</div>
        <h1 class="fw-bold mb-4">Мои записи</h1>
        <div class="mb-3">
          <a href="#booking" class="btn btn-dark">+ Новая запись</a>
        </div>
        <div class="bg-white">${content}</div>
      </div>
    </section>
  `);
}

async function profile() {
  const profileData = await api('/profile');

  shell(`
    <section class="section section-soft">
      <div class="container">
        <div class="eyebrow">Настройки</div>
        <h1 class="fw-bold mb-4">Мой профиль</h1>
        <div class="row g-4">
          <div class="col-lg-7">
            <div class="bg-white p-4">
              <label class="form-label">Имя</label>
              <input id="pname" class="form-control mb-3" value="${profileData.name}">
              <label class="form-label">Email</label>
              <input class="form-control mb-3" value="${profileData.email}" disabled>
              <label class="form-label">Телефон</label>
              <input id="pphone" type="tel" class="form-control mb-3" value="${profileData.phone || ''}" placeholder="+7 (999) 123-45-67">
              <label class="form-label">Новый пароль</label>
              <input
                id="ppass"
                type="password"
                class="form-control mb-4"
                placeholder="Оставьте пустым, чтобы не менять"
              >
              <button class="btn btn-dark" onclick="saveProfile()">
                Сохранить изменения
              </button>
              <button class="btn btn-outline-danger ms-2" onclick="logout()">
                Выйти
              </button>
            </div>
          </div>
          ${state.user.role === 'admin' ? `
            <div class="col-lg-5">
              <a href="#admin" class="d-block bg-dark text-white p-4 text-decoration-none">
                <i class="bi bi-speedometer2 fs-3"></i>
                <h5 class="mt-3">Панель администратора</h5>
                <span class="text-white-50">Управление салоном</span>
              </a>
            </div>
          ` : ''}
          <div class="col-lg-5">
            <a href="#cart" class="d-block bg-white p-4 mb-3 text-decoration-none text-dark">
              <i class="bi bi-bag fs-3"></i>
              <h5 class="mt-3">Моя корзина</h5>
              <span class="text-secondary">Перейти к товарам</span>
            </a>
            <a href="#orders" class="d-block bg-white p-4 mb-3 text-decoration-none text-dark">
              <i class="bi bi-box-seam fs-3"></i>
              <h5 class="mt-3">Мои заказы</h5>
              <span class="text-secondary">Посмотреть статусы заказов</span>
            </a>
            <a href="#appointments" class="d-block bg-white p-4 text-decoration-none text-dark">
              <i class="bi bi-calendar-check fs-3"></i>
              <h5 class="mt-3">Мои записи</h5>
              <span class="text-secondary">Посмотреть историю визитов</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  `);
}

async function saveProfile() {
  const name = pname.value;
  const phone = pphone.value;

  await api('/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name, phone, password: ppass.value })
  });

  state.user.name = name;
  state.user.phone = phone;
  localStorage.setItem('user', JSON.stringify(state.user));
  toast('Профиль обновлен');
}

async function admin() {
  const [appointments, ordersList, users, masters, products] = await Promise.all([
    api('/admin/appointments'),
    api('/admin/orders'),
    api('/admin/users'),
    api('/admin/masters'),
    api('/admin/products')
  ]);

  const appointmentRows = appointments.map((appointment) => `
    <tr>
      <td>${appointment.user_name}</td>
      <td>
        ${appointment.appointment_date}<br>
        ${String(appointment.appointment_time).slice(0, 5)}
      </td>
      <td>
        ${appointment.service_name}<br>
        <small>${appointment.master_name}</small>
      </td>
      <td>
        <a href="tel:${String(appointment.phone || '').replace(/\s/g, '')}">
          ${appointment.phone || '—'}
        </a>
      </td>
      <td>
        <span class="status status-${appointment.status}">
          ${appointment.status_label}
        </span>
      </td>
      <td>
        <select
          class="form-select form-select-sm"
          onchange="changeStatus(${appointment.id}, this.value)"
        >
          <option value="pending" ${appointment.status === 'pending' ? 'selected' : ''}>
            Ожидает
          </option>
          <option value="confirmed" ${appointment.status === 'confirmed' ? 'selected' : ''}>
            Подтвердить
          </option>
          <option value="completed" ${appointment.status === 'completed' ? 'selected' : ''}>
            Закончена
          </option>
          <option value="cancelled" ${appointment.status === 'cancelled' ? 'selected' : ''}>
            Отменить
          </option>
        </select>
      </td>
    </tr>
  `).join('');

  const orderRows = ordersList.map((order) => `
    <tr>
      <td>№${order.id}</td>
      <td>${order.user_name}<br><small>${order.email}</small></td>
      <td>${money(order.total)}</td>
      <td>
        <select class="form-select form-select-sm" onchange="changeOrderStatus(${order.id}, this.value)">
          ${Object.entries(orderStatusLabels).map(([value, label]) => `
            <option value="${value}" ${order.status === value ? 'selected' : ''}>${label}</option>
          `).join('')}
        </select>
      </td>
      <td>${new Date(order.created_at).toLocaleDateString('ru-RU')}</td>
    </tr>
  `).join('');

  const userRows = users.map((user) => `
    <tr>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.phone || '—'}</td>
      <td>
        <select class="form-select form-select-sm" onchange="updateUser(${user.id}, this.value)">
          <option value="client" ${user.role === 'client' ? 'selected' : ''}>Клиент</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Администратор</option>
        </select>
      </td>
      <td><button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${user.id})">Удалить</button></td>
    </tr>
  `).join('');

  const masterRows = masters.map((master) => `
    <tr>
      <td><input id="masterName${master.id}" class="form-control" value="${master.name}"></td>
      <td><input id="masterSpecialty${master.id}" class="form-control" value="${master.specialty}"></td>
      <td><input id="masterPhoto${master.id}" class="form-control" value="${master.photo || ''}"></td>
      <td>
        <button class="btn btn-sm btn-dark" onclick="updateMaster(${master.id})">Сохранить</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteMaster(${master.id})">Скрыть</button>
      </td>
    </tr>
  `).join('');

  const productRows = products.map((product) => `
    <tr>
      <td><input id="productName${product.id}" class="form-control" value="${product.name}"></td>
      <td><input id="productDescription${product.id}" class="form-control" value="${product.description}"></td>
      <td><input id="productPrice${product.id}" type="number" class="form-control" value="${product.price}"></td>
      <td><input id="productStock${product.id}" type="number" class="form-control" value="${product.stock}"></td>
      <td>
        <button class="btn btn-sm btn-dark" onclick="updateProduct(${product.id})">Сохранить</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${product.id})">Скрыть</button>
      </td>
    </tr>
  `).join('');

  shell(`
    <section class="section">
      <div class="container">
        <div class="eyebrow">Панель управления</div>
        <h1 class="fw-bold mb-4">Администратор</h1>
        <ul class="nav nav-tabs mb-4" role="tablist">
          <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#adminAppointments">Записи</button></li>
          <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#adminOrders">Заказы</button></li>
          <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#adminUsers">Пользователи</button></li>
          <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#adminMasters">Мастера</button></li>
          <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#adminProducts">Товары</button></li>
        </ul>
        <div class="tab-content">
          <div class="tab-pane fade show active" id="adminAppointments">
            <div class="table-responsive"><table class="table align-middle admin-table">
              <thead><tr><th>Клиент</th><th>Дата</th><th>Услуга / мастер</th><th>Телефон</th><th>Статус</th><th>Действия</th></tr></thead>
              <tbody>${appointmentRows}</tbody>
            </table></div>
          </div>
          <div class="tab-pane fade" id="adminOrders">
            <div class="table-responsive"><table class="table align-middle admin-table">
              <thead><tr><th>Номер</th><th>Клиент</th><th>Сумма</th><th>Статус</th><th>Дата</th></tr></thead>
              <tbody>${orderRows}</tbody>
            </table></div>
          </div>
          <div class="tab-pane fade" id="adminUsers">
            <div class="table-responsive"><table class="table align-middle admin-table">
              <thead><tr><th>Имя</th><th>Email</th><th>Телефон</th><th>Роль</th><th>Действия</th></tr></thead>
              <tbody>${userRows}</tbody>
            </table></div>
          </div>
          <div class="tab-pane fade" id="adminMasters">
            <form class="row g-2 mb-4" onsubmit="createMaster(event)">
              <div class="col-md-3"><input id="newMasterName" class="form-control" placeholder="Имя мастера" required></div>
              <div class="col-md-3"><input id="newMasterSpecialty" class="form-control" placeholder="Специализация" required></div>
              <div class="col-md-4"><input id="newMasterPhoto" class="form-control" placeholder="Ссылка на фото"></div>
              <div class="col-md-2"><button class="btn btn-dark w-100">Добавить</button></div>
            </form>
            <div class="table-responsive"><table class="table align-middle admin-table">
              <thead><tr><th>Имя</th><th>Специализация</th><th>Фото</th><th>Действия</th></tr></thead>
              <tbody>${masterRows}</tbody>
            </table></div>
          </div>
          <div class="tab-pane fade" id="adminProducts">
            <form class="row g-2 mb-4" onsubmit="createProduct(event)">
              <div class="col-md-3"><input id="newProductName" class="form-control" placeholder="Название" required></div>
              <div class="col-md-3"><input id="newProductDescription" class="form-control" placeholder="Описание" required></div>
              <div class="col-md-2"><input id="newProductPrice" type="number" class="form-control" placeholder="Цена" required></div>
              <div class="col-md-2"><input id="newProductStock" type="number" class="form-control" placeholder="Количество" required></div>
              <div class="col-md-2"><button class="btn btn-dark w-100">Добавить</button></div>
            </form>
            <div class="table-responsive"><table class="table align-middle admin-table">
              <thead><tr><th>Название</th><th>Описание</th><th>Цена</th><th>Остаток</th><th>Действия</th></tr></thead>
              <tbody>${productRows}</tbody>
            </table></div>
          </div>
        </div>
      </div>
    </section>
  `);
}

async function changeOrderStatus(id, status) {
  await api(`/admin/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });

  toast('Статус заказа изменен');
  admin();
}

async function changeStatus(id, status) {
  await api(`/admin/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });

  toast('Статус изменен');
  admin();
}

async function updateUser(id, role) {
  const user = (await api('/admin/users')).find((item) => item.id === id);
  await api(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: user.name, role })
  });
  toast('Роль пользователя изменена');
}

async function deleteUser(id) {
  if (!confirm('Удалить пользователя?')) return;
  await api(`/admin/users/${id}`, { method: 'DELETE' });
  admin();
}

async function createMaster(event) {
  event.preventDefault();
  await api('/admin/masters', {
    method: 'POST',
    body: JSON.stringify({
      name: newMasterName.value,
      specialty: newMasterSpecialty.value,
      photo: newMasterPhoto.value
    })
  });
  toast('Мастер добавлен');
  admin();
}

async function updateMaster(id) {
  await api(`/admin/masters/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: document.querySelector(`#masterName${id}`).value,
      specialty: document.querySelector(`#masterSpecialty${id}`).value,
      photo: document.querySelector(`#masterPhoto${id}`).value,
      active: 1
    })
  });
  toast('Данные мастера сохранены');
}

async function deleteMaster(id) {
  await api(`/admin/masters/${id}`, { method: 'DELETE' });
  admin();
}

async function createProduct(event) {
  event.preventDefault();
  await api('/admin/products', {
    method: 'POST',
    body: JSON.stringify({
      name: newProductName.value,
      description: newProductDescription.value,
      price: newProductPrice.value,
      stock: newProductStock.value
    })
  });
  toast('Товар добавлен');
  admin();
}

async function updateProduct(id) {
  await api(`/admin/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: document.querySelector(`#productName${id}`).value,
      description: document.querySelector(`#productDescription${id}`).value,
      price: document.querySelector(`#productPrice${id}`).value,
      stock: document.querySelector(`#productStock${id}`).value,
      active: 1
    })
  });
  toast('Товар сохранен');
}

async function deleteProduct(id) {
  await api(`/admin/products/${id}`, { method: 'DELETE' });
  admin();
}

window.addEventListener('hashchange', () => {
  showPage(location.hash.slice(1) || 'home');
});

window.showPage = showPage;
window.loadSlots = loadSlots;
window.selectSlot = selectSlot;
window.bookAppointment = bookAppointment;
window.addCart = addCart;
window.removeCart = removeCart;
window.openPayment = openPayment;
window.payOrder = payOrder;
window.formatCardNumber = formatCardNumber;
window.formatCardExpiry = formatCardExpiry;
window.saveProfile = saveProfile;
window.changeStatus = changeStatus;
window.changeOrderStatus = changeOrderStatus;
window.updateUser = updateUser;
window.deleteUser = deleteUser;
window.createMaster = createMaster;
window.updateMaster = updateMaster;
window.deleteMaster = deleteMaster;
window.createProduct = createProduct;
window.updateProduct = updateProduct;
window.deleteProduct = deleteProduct;
window.login = login;
window.registerUser = registerUser;
window.logout = logout;
window.toast = toast;

init();

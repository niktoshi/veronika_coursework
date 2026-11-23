require('dotenv').config();

const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5
});

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

function getUserId(req) {
  return Number(req.headers['x-user-id']);
}

async function ensureCart(userId) {
  await query('INSERT IGNORE INTO carts (user_id) VALUES (?)', [userId]);
}

function isValidPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function sendDatabaseError(res, error) {
  console.error('Database error:', error.message);
  return res.status(503).json({
    message: 'Ошибка подключения к базе данных'
  });
}

async function isAdmin(userId) {
  const users = await query(
    "SELECT id FROM users WHERE id = ? AND role = 'admin'",
    [userId]
  );

  return Boolean(users[0]);
}

async function requireAdmin(req, res, next) {
  try {
    if (!(await isAdmin(getUserId(req)))) {
      return res.status(403).json({
        message: 'Доступ разрешен только администратору'
      });
    }

    next();
  } catch (error) {
    sendDatabaseError(res, error);
  }
}

const statusLabels = {
  pending: 'Ожидает подтверждения',
  confirmed: 'Подтверждена',
  completed: 'Закончена',
  cancelled: 'Отменена'
};

app.get('/api/bootstrap', async (req, res) => {
  try {
    const [services, masters, products] = await Promise.all([
      query('SELECT * FROM services WHERE active = 1'),
      query('SELECT * FROM masters WHERE active = 1'),
      query('SELECT * FROM products WHERE active = 1')
    ]);

    res.json({ services, masters, products });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = await query(
      `SELECT id, name, email, phone, role
       FROM users
       WHERE email = ? AND password = ?`,
      [email, password]
    );

    if (!users[0]) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    res.json(users[0]);
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  const phone = req.body.phone || null;

  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({
      message: 'Заполните все поля. Пароль должен содержать минимум 6 символов'
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO users (name, email, phone, password, role)
       VALUES (?, ?, ?, ?, 'client')`,
      [name, email, phone, password]
    );

    await connection.query(
      'INSERT INTO carts (user_id) VALUES (?)',
      [result.insertId]
    );

    await connection.commit();

    res.status(201).json({
      id: result.insertId,
      name,
      email,
      phone,
      role: 'client'
    });
  } catch (error) {
    await connection.rollback();

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Пользователь с таким email уже зарегистрирован'
      });
    }

    sendDatabaseError(res, error);
  } finally {
    connection.release();
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await query(
      `SELECT id, total, status, created_at
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [getUserId(req)]
    );

    res.json(orders);
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.get('/api/appointments', async (req, res) => {
  try {
    const appointments = await query(
      `SELECT
        a.*,
        m.name AS master_name,
        s.name AS service_name,
        s.price
      FROM appointments a
      JOIN masters m ON m.id = a.master_id
      JOIN services s ON s.id = a.service_id
      WHERE a.user_id = ?
      ORDER BY appointment_date, appointment_time`,
      [getUserId(req)]
    );

    res.json(
      appointments.map((appointment) => ({
        ...appointment,
        status_label: statusLabels[appointment.status]
      }))
    );
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.get('/api/slots', async (req, res) => {
  try {
    const busySlots = await query(
      `SELECT appointment_time
       FROM appointments
       WHERE appointment_date = ?
         AND master_id = ?
         AND status != 'cancelled'`,
      [req.query.date, req.query.master_id]
    );

    const busyTimes = busySlots.map((slot) =>
      String(slot.appointment_time).slice(0, 5)
    );

    const times = [
      '10:00', '11:00', '12:00', '13:00', '14:00',
      '15:00', '16:00', '17:00', '18:00'
    ];

    res.json(
      times.map((time) => ({
        time,
        available: !busyTimes.includes(time)
      }))
    );
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post('/api/appointments', async (req, res) => {
  const { master_id, service_id, date, time } = req.body;
  const phone = String(req.body.phone || '').trim();

  if (!isValidPhone(phone)) {
    return res.status(400).json({
      message: 'Укажите номер телефона для связи'
    });
  }

  try {
    await query(
      `INSERT INTO appointments
       (user_id, master_id, service_id, appointment_date, appointment_time, phone)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [getUserId(req), master_id, service_id, date, time, phone]
    );

    res.json({ message: 'Запись создана' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Это время уже занято' });
    }

    sendDatabaseError(res, error);
  }
});

app.get('/api/cart', async (req, res) => {
  try {
    await ensureCart(getUserId(req));

    const items = await query(
      `SELECT p.*, ci.quantity
       FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       JOIN products p ON p.id = ci.product_id
       WHERE c.user_id = ?`,
      [getUserId(req)]
    );

    res.json(items);
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post('/api/cart', async (req, res) => {
  const productId = Number(req.body.product_id);

  if (!productId) {
    return res.status(400).json({ message: 'Товар не найден' });
  }

  try {
    const userId = getUserId(req);
    await ensureCart(userId);

    const carts = await query(
      'SELECT id FROM carts WHERE user_id = ?',
      [userId]
    );

    const cartId = carts[0].id;
    const existing = await query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [cartId, productId]
    );

    if (existing[0]) {
      await query(
        'UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?',
        [existing[0].id]
      );
    } else {
      await query(
        'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, 1)',
        [cartId, productId]
      );
    }

    const items = await query(
      'SELECT COALESCE(SUM(quantity), 0) AS count FROM cart_items WHERE cart_id = ?',
      [cartId]
    );

    res.json({
      message: 'Товар добавлен в корзину',
      count: Number(items[0].count)
    });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.delete('/api/cart/:id', async (req, res) => {
  try {
    await query(
      `DELETE ci
       FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       WHERE c.user_id = ? AND ci.product_id = ?`,
      [getUserId(req), req.params.id]
    );

    res.json({ message: 'Удалено' });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post('/api/cart/checkout', async (req, res) => {
  const { cardNumber, expiry, cvv, cardHolder } = req.body;
  const normalizedCardNumber = String(cardNumber || '').replace(/\s/g, '');

  if (
    !cardHolder
    || !/^\d{16}$/.test(normalizedCardNumber)
    || !/^\d{2}\/\d{2}$/.test(expiry)
    || !/^\d{3}$/.test(cvv)
  ) {
    return res.status(400).json({
      message: 'Введите корректные данные карты'
    });
  }

  try {
    await ensureCart(getUserId(req));

    const items = await query(
      `SELECT p.id, p.name, p.price, p.stock, ci.quantity
       FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       JOIN products p ON p.id = ci.product_id
       WHERE c.user_id = ?`,
      [getUserId(req)]
    );

    if (!items.length) {
      return res.status(400).json({ message: 'Корзина пуста' });
    }

    const unavailable = items.find((item) => item.quantity > item.stock);

    if (unavailable) {
      return res.status(400).json({
        message: `Недостаточно товара: ${unavailable.name}`
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const item of items) {
        await connection.query(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.id]
        );
      }

      const total = items.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0
      );

      const [order] = await connection.query(
        'INSERT INTO orders (user_id, total, status) VALUES (?, ?, \'paid\')',
        [getUserId(req), total]
      );

      for (const item of items) {
        await connection.query(
          `INSERT INTO order_items
           (order_id, product_id, product_name, price, quantity)
           VALUES (?, ?, ?, ?, ?)`,
          [order.insertId, item.id, item.name, item.price, item.quantity]
        );
      }

      await connection.query(
        `DELETE ci
         FROM cart_items ci
         JOIN carts c ON c.id = ci.cart_id
         WHERE c.user_id = ?`,
        [getUserId(req)]
      );

      await connection.commit();
      res.json({
        message: 'Оплата прошла успешно. Заказ оформлен.',
        orderId: order.insertId
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const orders = await query(
      `SELECT o.id, o.total, o.status, o.created_at, u.name AS user_name, u.email
       FROM orders o
       JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC`
    );

    res.json(orders);
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  const allowedStatuses = [
    'paid',
    'processing',
    'shipped',
    'completed',
    'cancelled'
  ];

  if (!allowedStatuses.includes(req.body.status)) {
    return res.status(400).json({ message: 'Недопустимый статус заказа' });
  }

  try {
    await query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [req.body.status, req.params.id]
    );

    res.json({ message: 'Статус заказа изменен' });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.get('/api/admin/appointments', requireAdmin, async (req, res) => {
  try {
    const appointments = await query(
      `SELECT
        a.*,
        u.name AS user_name,
        m.name AS master_name,
        s.name AS service_name
      FROM appointments a
      JOIN users u ON u.id = a.user_id
      JOIN masters m ON m.id = a.master_id
      JOIN services s ON s.id = a.service_id
      ORDER BY appointment_date DESC`
    );

    res.json(
      appointments.map((appointment) => ({
        ...appointment,
        status_label: statusLabels[appointment.status]
      }))
    );
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.patch('/api/admin/appointments/:id', requireAdmin, async (req, res) => {
  try {
    await query(
      'UPDATE appointments SET status = ? WHERE id = ?',
      [req.body.status, req.params.id]
    );

    res.json({ message: 'Статус изменен' });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await query(
      `SELECT id, name, email, phone, role, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json(users);
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    await query(
      'UPDATE users SET name = ?, role = ? WHERE id = ?',
      [req.body.name, req.body.role, req.params.id]
    );

    res.json({ message: 'Пользователь обновлен' });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    if (Number(req.params.id) === getUserId(req)) {
      return res.status(400).json({
        message: 'Нельзя удалить собственный аккаунт'
      });
    }

    await query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Пользователь удален' });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.get('/api/admin/masters', requireAdmin, async (req, res) => {
  try {
    res.json(await query('SELECT * FROM masters ORDER BY id DESC'));
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post('/api/admin/masters', requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'INSERT INTO masters (name, specialty, photo) VALUES (?, ?, ?)',
      [req.body.name, req.body.specialty, req.body.photo || null]
    );

    res.status(201).json({ id: result.insertId, message: 'Мастер добавлен' });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.patch('/api/admin/masters/:id', requireAdmin, async (req, res) => {
  try {
    await query(
      'UPDATE masters SET name = ?, specialty = ?, photo = ?, active = ? WHERE id = ?',
      [req.body.name, req.body.specialty, req.body.photo || null, req.body.active, req.params.id]
    );

    res.json({ message: 'Данные мастера обновлены' });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.delete('/api/admin/masters/:id', requireAdmin, async (req, res) => {
  try {
    await query('UPDATE masters SET active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Мастер скрыт' });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.get('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    res.json(await query('SELECT * FROM products ORDER BY id DESC'));
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'INSERT INTO products (name, description, price, image, stock) VALUES (?, ?, ?, ?, ?)',
      [req.body.name, req.body.description, req.body.price, req.body.image || null, req.body.stock || 0]
    );

    res.status(201).json({ id: result.insertId, message: 'Товар добавлен' });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.patch('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    await query(
      `UPDATE products
       SET name = ?, description = ?, price = ?, image = ?, stock = ?, active = ?
       WHERE id = ?`,
      [req.body.name, req.body.description, req.body.price, req.body.image || null, req.body.stock, req.body.active, req.params.id]
    );

    res.json({ message: 'Товар обновлен' });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    await query('UPDATE products SET active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Товар скрыт' });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.get('/api/profile', async (req, res) => {
  try {
    const users = await query(
      'SELECT id, name, email, phone, role FROM users WHERE id = ?',
      [getUserId(req)]
    );

    res.json(users[0]);
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.patch('/api/profile', async (req, res) => {
  try {
    await query(
      `UPDATE users
       SET name = ?, phone = ?, password = COALESCE(NULLIF(?, ''), password)
       WHERE id = ?`,
      [req.body.name, req.body.phone || null, req.body.password || '', getUserId(req)]
    );

    res.json({ message: 'Профиль обновлен' });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

pool.getConnection()
  .then((connection) => {
    connection.release();
    app.listen(port, () => {
      console.log(`Salon app: http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Ошибка подключения к базе данных:', error.message);
    process.exit(1);
  });

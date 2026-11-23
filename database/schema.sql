CREATE DATABASE IF NOT EXISTS hair_salon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hair_salon;

DROP TABLE IF EXISTS order_items, orders, appointments, cart_items, carts, products, services, masters, users;

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30) DEFAULT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('client','admin') DEFAULT 'client',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE masters (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  specialty VARCHAR(150) NOT NULL,
  photo VARCHAR(255) DEFAULT NULL,
  active BOOLEAN DEFAULT TRUE
);
CREATE TABLE services (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  duration INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  active BOOLEAN DEFAULT TRUE
);
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image VARCHAR(255) DEFAULT NULL,
  stock INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);
CREATE TABLE carts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE cart_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cart_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  UNIQUE KEY cart_product (cart_id, product_id),
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE TABLE appointments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  master_id INT NOT NULL,
  service_id INT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  phone VARCHAR(30) NOT NULL,
  status ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY master_slot (master_id, appointment_date, appointment_time),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (master_id) REFERENCES masters(id),
  FOREIGN KEY (service_id) REFERENCES services(id)
);
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('pending','paid','processing','shipped','completed','cancelled') DEFAULT 'paid',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

INSERT INTO users (name,email,phone,password,role) VALUES
('Анна Петрова','anna@example.com','+7 (999) 123-45-67','demo123','client'),
('Администратор','admin@salon.local','+7 (495) 123-45-67','admin123','admin');
INSERT INTO masters (name,specialty,photo) VALUES
('Елена Морозова','Топ-стилист','https://i.pravatar.cc/300?img=47'),
('Мария Смирнова','Колорист','https://i.pravatar.cc/300?img=44'),
('Алексей Волков','Мужские стрижки','https://i.pravatar.cc/300?img=12');
INSERT INTO services (name,description,duration,price) VALUES
('Женская стрижка','Подбор формы, мытье и укладка',60,1800),
('Окрашивание','Окрашивание и уход для блеска волос',120,4500),
('Мужская стрижка','Стрижка машинкой и ножницами',45,1200),
('Укладка','Объемная укладка для особого случая',45,1500),
('Уход для волос','Восстанавливающий ритуал с массажем',60,2200);
INSERT INTO products (name,description,price,image,stock) VALUES
('Шампунь Repair','Мягкое очищение и восстановление',1200,'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600',20),
('Маска Silk','Интенсивное питание для сухих волос',1800,'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600',15),
('Термозащита Air','Защита от горячих инструментов',950,'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600',30),
('Масло Shine','Легкое масло для сияния',1400,'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600',12);
INSERT INTO carts (user_id) VALUES (1), (2);
INSERT INTO appointments (user_id,master_id,service_id,appointment_date,appointment_time,phone,status) VALUES
(1,1,1,DATE_ADD(CURDATE(), INTERVAL 2 DAY),'11:00:00','+7 (999) 123-45-67','confirmed'),
(1,2,2,DATE_ADD(CURDATE(), INTERVAL 7 DAY),'15:00:00','+7 (999) 123-45-67','pending');

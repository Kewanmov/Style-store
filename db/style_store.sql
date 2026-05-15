-- style_store.sql
-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Хост: MySQl-8.4
-- Время создания: Апр 29 2026 г., 10:39
-- Версия сервера: 8.4.4
-- Версия PHP: 8.4.1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- База данных: `clothing_store`
--

-- --------------------------------------------------------

--
-- Структура таблицы `cart_items`
--

CREATE TABLE `cart_items` (
  `user_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `size` varchar(10) COLLATE utf8mb4_general_ci NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `cart_items`
--

INSERT INTO `cart_items` (`user_id`, `product_id`, `quantity`, `size`) VALUES
(4, 2, 2, ''),
(4, 3, 1, '');

-- --------------------------------------------------------

--
-- Структура таблицы `categories`
--

CREATE TABLE `categories` (
  `id` int NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `parent_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `categories`
--

INSERT INTO `categories` (`id`, `name`, `description`, `parent_id`) VALUES
(1, 'Мужская одежда', 'Одежда для мужчин', NULL),
(2, 'Женская одежда', 'Одежда для женщин', NULL),
(3, 'Детская одежда', 'Одежда для детей', NULL),
(4, 'Футболки', 'Мужские футболки', 1),
(5, 'Джинсы', 'Мужские джинсы и брюки', 1),
(6, 'Платья', 'Летние и вечерние платья', 2),
(7, 'Куртки', 'Верхняя одежда', 1),
(8, 'Юбки', 'Женские юбки', 2);

-- --------------------------------------------------------

--
-- Структура таблицы `favorites`
--

CREATE TABLE `favorites` (
  `user_id` int NOT NULL,
  `product_id` int NOT NULL,
  `added_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Структура таблицы `orders`
--

CREATE TABLE `orders` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `status` enum('new','processing','shipped','delivered','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'new',
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `shipping_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `payment_method` enum('online','on_delivery') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'on_delivery',
  `delivery_method` enum('courier','pickup','post') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'courier',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Структура таблицы `order_items`
--

CREATE TABLE `order_items` (
  `id` int NOT NULL,
  `order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `price_at_purchase` decimal(10,2) NOT NULL,
  `size` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Структура таблицы `products`
--

CREATE TABLE `products` (
  `id` int NOT NULL,
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stock` int NOT NULL DEFAULT '0',
  `category_id` int NOT NULL,
  `image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `color` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `products`
--

INSERT INTO `products` (`id`, `name`, `description`, `price`, `stock`, `category_id`, `image`, `created_at`, `color`) VALUES
(1, 'Футболка Polo', 'Классическая мужская футболка поло из хлопка', 2500.00, 50, 4, '1.webp', '2026-02-10 00:16:54', NULL),
(2, 'Джинсы Slim Fit', 'Синие джинсы slim fit из денима', 4500.00, 30, 5, '2.webp', '2026-02-10 00:16:54', NULL),
(3, 'Летнее платье', 'Лёгкое летнее платье с цветочным принтом', 3500.00, 20, 6, '3.webp', '2026-02-10 00:16:54', NULL),
(4, 'Футболка Basic', 'Базовая белая футболка унисекс', 1200.00, 100, 4, '4.webp', '2026-02-10 00:16:54', NULL),
(5, 'Куртка Bomber', 'Мужская куртка-бомбер чёрная', 7800.00, 15, 7, '5.webp', '2026-02-10 00:16:54', NULL),
(6, 'Юбка миди', 'Женская юбка миди бежевая', 2800.00, 25, 8, '6.webp', '2026-02-10 00:16:54', NULL),
(7, 'Джинсы Classic', 'Классические прямые джинсы', 3900.00, 40, 5, '7.webp', '2026-02-10 00:16:54', NULL),
(8, 'Платье вечернее', 'Элегантное вечернее платье чёрное', 8500.00, 10, 6, '8.webp', '2026-02-10 00:16:54', NULL),
(9, 'Худи Oversize', 'Мужское худи oversize из плотного хлопка', 3800.00, 25, 1, '9.webp', '2026-02-13 03:28:28', NULL),
(10, 'Рубашка Oxford', 'Классическая мужская рубашка Oxford', 3200.00, 40, 1, '10.webp', '2026-02-13 03:28:28', NULL),
(11, 'Куртка Bomber', 'Лёгкая куртка-бомбер на весну', 6500.00, 15, 1, '11.webp', '2026-02-13 03:28:28', NULL),
(12, 'Блуза шёлковая', 'Элегантная женская блуза из натурального шёлка', 4200.00, 18, 2, '12.webp', '2026-02-13 03:28:28', NULL),
(13, 'Юбка миди', 'Женская юбка миди с высокой посадкой', 3100.00, 25, 2, '13.webp', '2026-02-13 03:28:28', NULL),
(14, 'Пальто классическое', 'Женское пальто прямого кроя из шерсти', 9800.00, 10, 2, '14.webp', '2026-02-13 03:28:28', NULL),
(15, 'Детская куртка', 'Тёплая детская куртка на осень', 2800.00, 35, 3, '15.webp', '2026-02-13 03:28:28', NULL),
(16, 'Детский комбинезон', 'Удобный детский комбинезон из хлопка', 1900.00, 45, 3, '16.webp', '2026-02-13 03:28:28', NULL),
(17, 'Спортивные брюки', 'Мужские спортивные брюки с манжетами', 2900.00, 30, 5, '17.webp', '2026-02-13 03:28:28', NULL),
(18, 'Вечернее платье', 'Элегантное вечернее платье в пол', 12500.00, 5, 6, '18.webp', '2026-02-13 03:28:28', NULL);

-- --------------------------------------------------------

--
-- Структура таблицы `product_sizes`
--

CREATE TABLE `product_sizes` (
  `id` int NOT NULL,
  `product_id` int NOT NULL,
  `size` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `stock` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `product_sizes`
--

INSERT INTO `product_sizes` (`id`, `product_id`, `size`, `stock`) VALUES
(1, 1, 'S', 10),
(2, 1, 'M', 20),
(3, 1, 'L', 15),
(4, 1, 'XL', 5),
(5, 2, 'S', 5),
(6, 2, 'M', 10),
(7, 2, 'L', 10),
(8, 2, 'XL', 5),
(9, 3, 'XS', 5),
(10, 3, 'S', 8),
(11, 3, 'M', 7),
(12, 1, 'S', 10),
(13, 1, 'M', 20),
(14, 1, 'L', 15),
(15, 1, 'XL', 5),
(16, 2, 'S', 5),
(17, 2, 'M', 10),
(18, 2, 'L', 10),
(19, 2, 'XL', 5),
(20, 3, 'XS', 5),
(21, 3, 'S', 8),
(22, 3, 'M', 7),
(23, 3, 'L', 4),
(24, 4, 'S', 20),
(25, 4, 'M', 30),
(26, 4, 'L', 25),
(27, 4, 'XL', 10),
(28, 5, 'S', 3),
(29, 5, 'M', 5),
(30, 5, 'L', 5),
(31, 5, 'XL', 2),
(32, 6, 'XS', 5),
(33, 6, 'S', 8),
(34, 6, 'M', 7),
(35, 6, 'L', 5),
(36, 7, 'S', 8),
(37, 7, 'M', 12),
(38, 7, 'L', 12),
(39, 7, 'XL', 8),
(40, 8, 'XS', 2),
(41, 8, 'S', 3),
(42, 8, 'M', 3),
(43, 8, 'L', 2),
(44, 1, 'S', 10),
(45, 1, 'M', 20),
(46, 1, 'L', 15),
(47, 1, 'XL', 5),
(48, 2, 'S', 5),
(49, 2, 'M', 10),
(50, 2, 'L', 10),
(51, 2, 'XL', 5),
(52, 3, 'XS', 5),
(53, 3, 'S', 8),
(54, 3, 'M', 7),
(55, 3, 'L', 4),
(56, 4, 'S', 20),
(57, 4, 'M', 30),
(58, 4, 'L', 25),
(59, 4, 'XL', 10),
(60, 5, 'S', 3),
(61, 5, 'M', 5),
(62, 5, 'L', 5),
(63, 5, 'XL', 2),
(64, 6, 'XS', 5),
(65, 6, 'S', 8),
(66, 6, 'M', 7),
(67, 6, 'L', 5),
(68, 7, 'S', 8),
(69, 7, 'M', 12),
(70, 7, 'L', 12),
(71, 7, 'XL', 8),
(72, 8, 'XS', 2),
(73, 8, 'S', 3),
(74, 8, 'M', 3),
(75, 8, 'L', 2),
(76, 9, 'S', 5),
(77, 9, 'M', 10),
(78, 9, 'L', 8),
(79, 9, 'XL', 2),
(80, 10, 'S', 8),
(81, 10, 'M', 15),
(82, 10, 'L', 12),
(83, 10, 'XL', 5),
(84, 11, 'S', 3),
(85, 11, 'M', 5),
(86, 11, 'L', 5),
(87, 11, 'XL', 2),
(88, 12, 'XS', 3),
(89, 12, 'S', 5),
(90, 12, 'M', 6),
(91, 12, 'L', 4),
(92, 13, 'XS', 5),
(93, 13, 'S', 8),
(94, 13, 'M', 7),
(95, 13, 'L', 5),
(96, 14, 'XS', 2),
(97, 14, 'S', 3),
(98, 14, 'M', 3),
(99, 14, 'L', 2),
(100, 15, '110', 8),
(101, 15, '116', 10),
(102, 15, '122', 10),
(103, 15, '128', 7),
(104, 16, '86', 8),
(105, 16, '92', 10),
(106, 16, '98', 12),
(107, 16, '104', 10),
(108, 17, 'S', 8),
(109, 17, 'M', 12),
(110, 17, 'L', 7),
(111, 17, 'XL', 3),
(112, 18, 'XS', 1),
(113, 18, 'S', 2),
(114, 18, 'M', 1),
(115, 18, 'L', 1);

-- --------------------------------------------------------

--
-- Структура таблицы `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` enum('user','admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `phone`, `address`, `role`, `created_at`) VALUES
(1, 'admin', 'admin', '$2b$12$drujj0g7C5LI4rA5bfOm1O.3k/2c7.fatQfixbHZGpI.kod1bLi12', NULL, NULL, 'admin', '2026-02-10 00:51:24'),
(4, 'Sanya', 'Sanya@gmail.com', '$2b$12$C4N9LZGF0ed1L6wuwW1oA.wgW7DyFdLwpcjxKr0Jhus4aucDOqDR6', '00000000000000', NULL, 'user', '2026-02-18 01:49:37');

--
-- Индексы сохранённых таблиц
--

--
-- Индексы таблицы `cart_items`
--
ALTER TABLE `cart_items`
  ADD PRIMARY KEY (`user_id`,`product_id`,`size`),
  ADD KEY `product_id` (`product_id`);

--
-- Индексы таблицы `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `parent_id` (`parent_id`);

--
-- Индексы таблицы `favorites`
--
ALTER TABLE `favorites`
  ADD PRIMARY KEY (`user_id`,`product_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Индексы таблицы `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Индексы таблицы `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Индексы таблицы `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `category_id` (`category_id`);

--
-- Индексы таблицы `product_sizes`
--
ALTER TABLE `product_sizes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`);

--
-- Индексы таблицы `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT для сохранённых таблиц
--

--
-- AUTO_INCREMENT для таблицы `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT для таблицы `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT для таблицы `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT для таблицы `products`
--
ALTER TABLE `products`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT для таблицы `product_sizes`
--
ALTER TABLE `product_sizes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=116;

--
-- AUTO_INCREMENT для таблицы `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Ограничения внешнего ключа сохраненных таблиц
--

--
-- Ограничения внешнего ключа таблицы `cart_items`
--
ALTER TABLE `cart_items`
  ADD CONSTRAINT `cart_items_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cart_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

--
-- Ограничения внешнего ключа таблицы `favorites`
--
ALTER TABLE `favorites`
  ADD CONSTRAINT `favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `favorites_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT;

--
-- Ограничения внешнего ключа таблицы `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `product_sizes`
--
ALTER TABLE `product_sizes`
  ADD CONSTRAINT `product_sizes_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

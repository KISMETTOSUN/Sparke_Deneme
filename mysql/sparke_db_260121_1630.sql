-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Anamakine: 127.0.0.1
-- Üretim Zamanı: 21 Nis 2026, 15:25:23
-- Sunucu sürümü: 10.4.32-MariaDB
-- PHP Sürümü: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Veritabanı: `sparke_db`
--

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `config_seeme`
--

CREATE TABLE `config_seeme` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `url` varchar(255) DEFAULT NULL,
  `token` text DEFAULT NULL,
  `organization` varchar(255) DEFAULT NULL,
  `bucket` varchar(255) DEFAULT NULL,
  `last_update` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Tablo döküm verisi `config_seeme`
--

INSERT INTO `config_seeme` (`id`, `user_id`, `url`, `token`, `organization`, `bucket`, `last_update`, `created_at`) VALUES
(1, 1, 'https://influx.seeme.com.tr', '2feebae9655af455dfb6392b32651206:a680bec3665a4f58a5fe30550577bba1b6e8e224b905437404299752cabb5919a9218430ab9c9b5e8c998d3dec240293d72f07f779163db7b3393956498e3d021e3e38bbc4d7237e33de5af608a6b0a721a563708f2ca0f90a0609dff4ae7e6e', 'ucgen', 'autonomie', '2026-04-21 10:43:50', '2026-04-21 10:43:21');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `config_uipath`
--

CREATE TABLE `config_uipath` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `url` varchar(255) DEFAULT NULL,
  `tenant` varchar(255) DEFAULT NULL,
  `client_id` varchar(255) DEFAULT NULL,
  `client_secret` text DEFAULT NULL,
  `deployment_type` varchar(20) DEFAULT 'cloud',
  `last_update` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `orch_tenant_id` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Tablo döküm verisi `config_uipath`
--

INSERT INTO `config_uipath` (`id`, `user_id`, `url`, `tenant`, `client_id`, `client_secret`, `deployment_type`, `last_update`, `created_at`, `orch_tenant_id`) VALUES
(1, 1, 'https://cloud.uipath.com/ucgenautomation/', 'UcgenAutomationDefault', '2140436c-2bd0-406f-9bd1-1ec603802c51', 'b10405e6d4efa14c301512867d3439f8:944b9e9aca736d7cd575c21c3dde420945f642a5e06f524b02d9152bff28f1e24d275d2df455e614f1df78680b5cae15dcaa87f97febc44f4caff81253c21018bff0f61531c7ad06cdf34071872a37b1', 'cloud', '2026-04-21 12:25:30', '2026-04-21 11:01:34', '113426');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Tablo döküm verisi `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `created_at`) VALUES
(1, 'admin', 'aace8cfa15a17bcbea2aded18274239b:90e67717de13a71ebbf0cd7b72132aeb', '2026-04-21 07:27:27');

--
-- Dökümü yapılmış tablolar için indeksler
--

--
-- Tablo için indeksler `config_seeme`
--
ALTER TABLE `config_seeme`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Tablo için indeksler `config_uipath`
--
ALTER TABLE `config_uipath`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Tablo için indeksler `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Dökümü yapılmış tablolar için AUTO_INCREMENT değeri
--

--
-- Tablo için AUTO_INCREMENT değeri `config_seeme`
--
ALTER TABLE `config_seeme`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Tablo için AUTO_INCREMENT değeri `config_uipath`
--
ALTER TABLE `config_uipath`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Tablo için AUTO_INCREMENT değeri `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Dökümü yapılmış tablolar için kısıtlamalar
--

--
-- Tablo kısıtlamaları `config_seeme`
--
ALTER TABLE `config_seeme`
  ADD CONSTRAINT `config_seeme_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `config_uipath`
--
ALTER TABLE `config_uipath`
  ADD CONSTRAINT `config_uipath_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

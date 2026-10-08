-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: multiss_ecommerce
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `addresses`
--

DROP TABLE IF EXISTS `addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `addresses` (
  `address_id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `address_label` varchar(50) DEFAULT NULL,
  `address_line_1` varchar(150) NOT NULL,
  `address_line_2` varchar(150) DEFAULT NULL,
  `city` varchar(100) NOT NULL,
  `province` varchar(100) NOT NULL,
  `postal_code` varchar(20) NOT NULL,
  `country` varchar(100) NOT NULL DEFAULT 'South Africa',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`address_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `addresses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `addresses`
--

LOCK TABLES `addresses` WRITE;
/*!40000 ALTER TABLE `addresses` DISABLE KEYS */;
INSERT INTO `addresses` VALUES (1,1,'Home','25 Main Street',NULL,'Johannesburg','Gauteng','2001','South Africa',0,'2026-09-22 20:43:29','2026-09-22 20:43:29');
/*!40000 ALTER TABLE `addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cart_items`
--

DROP TABLE IF EXISTS `cart_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cart_items` (
  `cart_item_id` int unsigned NOT NULL AUTO_INCREMENT,
  `cart_id` int unsigned NOT NULL,
  `variant_id` int unsigned NOT NULL,
  `quantity` int unsigned NOT NULL DEFAULT '1',
  `added_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cart_item_id`),
  UNIQUE KEY `cart_id` (`cart_id`,`variant_id`),
  KEY `variant_id` (`variant_id`),
  CONSTRAINT `cart_items_ibfk_1` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`cart_id`) ON DELETE CASCADE,
  CONSTRAINT `cart_items_ibfk_2` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cart_items`
--

LOCK TABLES `cart_items` WRITE;
/*!40000 ALTER TABLE `cart_items` DISABLE KEYS */;
INSERT INTO `cart_items` VALUES (1,1,1,2,'2026-09-22 21:58:40','2026-09-22 21:58:40'),(3,2,1,1,'2026-10-08 16:26:59','2026-10-08 16:26:59'),(4,2,2,1,'2026-10-08 16:26:59','2026-10-08 16:26:59');
/*!40000 ALTER TABLE `cart_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carts`
--

DROP TABLE IF EXISTS `carts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carts` (
  `cart_id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `cart_status` enum('active','converted','abandoned') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cart_id`),
  KEY `idx_carts_user` (`user_id`,`cart_status`),
  CONSTRAINT `carts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carts`
--

LOCK TABLES `carts` WRITE;
/*!40000 ALTER TABLE `carts` DISABLE KEYS */;
INSERT INTO `carts` VALUES (1,1,'converted','2026-09-22 21:54:53','2026-09-22 22:08:10'),(2,1,'converted','2026-10-08 16:26:51','2026-10-08 16:37:25');
/*!40000 ALTER TABLE `carts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `category_id` int unsigned NOT NULL AUTO_INCREMENT,
  `parent_category_id` int unsigned DEFAULT NULL,
  `category_name` varchar(100) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `description` text,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_categories_parent` (`parent_category_id`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_category_id`) REFERENCES `categories` (`category_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,NULL,'Laboratory Equipment','laboratory-equipment','Laboratory equipment and related products','active','2026-09-22 21:33:39','2026-09-22 21:33:39');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commission_rules`
--

DROP TABLE IF EXISTS `commission_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `commission_rules` (
  `commission_rule_id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_id` int unsigned DEFAULT NULL,
  `product_id` int unsigned DEFAULT NULL,
  `commission_percentage` decimal(5,2) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_by` int unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`commission_rule_id`),
  UNIQUE KEY `uq_category_commission` (`category_id`),
  UNIQUE KEY `uq_product_commission` (`product_id`),
  KEY `fk_commission_created_by` (`created_by`),
  CONSTRAINT `fk_commission_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_commission_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_commission_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_commission_percentage` CHECK (((`commission_percentage` >= 0) and (`commission_percentage` <= 100))),
  CONSTRAINT `chk_commission_target` CHECK ((((`category_id` is not null) and (`product_id` is null)) or ((`category_id` is null) and (`product_id` is not null))))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commission_rules`
--

LOCK TABLES `commission_rules` WRITE;
/*!40000 ALTER TABLE `commission_rules` DISABLE KEYS */;
INSERT INTO `commission_rules` VALUES (1,1,NULL,10.00,'active',1,'2026-10-07 18:40:10','2026-10-07 18:40:10'),(2,NULL,1,12.00,'active',1,'2026-10-07 18:40:28','2026-10-07 18:40:28'),(3,NULL,2,8.00,'active',1,'2026-10-08 16:25:24','2026-10-08 16:25:24');
/*!40000 ALTER TABLE `commission_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `inventory_id` int unsigned NOT NULL AUTO_INCREMENT,
  `variant_id` int unsigned NOT NULL,
  `quantity_in_stock` int unsigned NOT NULL DEFAULT '0',
  `reorder_level` int unsigned NOT NULL DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`inventory_id`),
  UNIQUE KEY `variant_id` (`variant_id`),
  CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory`
--

LOCK TABLES `inventory` WRITE;
/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
INSERT INTO `inventory` VALUES (1,1,5,3,'2026-10-08 16:42:49'),(2,2,19,5,'2026-10-08 16:42:49');
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_movements`
--

DROP TABLE IF EXISTS `inventory_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_movements` (
  `movement_id` int unsigned NOT NULL AUTO_INCREMENT,
  `variant_id` int unsigned NOT NULL,
  `movement_type` enum('stock_in','sale','return','damage','adjustment') NOT NULL,
  `quantity_change` int NOT NULL,
  `previous_quantity` int unsigned NOT NULL,
  `new_quantity` int unsigned NOT NULL,
  `performed_by` int unsigned DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`movement_id`),
  KEY `performed_by` (`performed_by`),
  KEY `idx_inventory_movements_variants` (`variant_id`,`created_at`),
  CONSTRAINT `inventory_movements_ibfk_1` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE RESTRICT,
  CONSTRAINT `inventory_movements_ibfk_2` FOREIGN KEY (`performed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_movements`
--

LOCK TABLES `inventory_movements` WRITE;
/*!40000 ALTER TABLE `inventory_movements` DISABLE KEYS */;
INSERT INTO `inventory_movements` VALUES (1,1,'stock_in',10,0,10,1,'Initial test stock added','2026-09-22 21:51:02'),(2,1,'sale',-2,10,8,NULL,'Test sale','2026-09-22 21:51:42'),(3,1,'sale',-2,8,6,NULL,'Stock reduced for test order MSS-TEST-0001','2026-09-22 22:09:11'),(4,1,'sale',-1,6,5,NULL,'Stock reduced for multi-vendor order MSS-TEST-0002','2026-10-08 16:37:25'),(5,2,'sale',-1,20,19,NULL,'Stock reduced for multi-vendor order MSS-TEST-0002','2026-10-08 16:37:25');
/*!40000 ALTER TABLE `inventory_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_addresses`
--

DROP TABLE IF EXISTS `order_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_addresses` (
  `order_address_id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `recipient_name` varchar(200) NOT NULL,
  `contact_number` varchar(30) NOT NULL,
  `address_line_1` varchar(150) NOT NULL,
  `address_line_2` varchar(150) DEFAULT NULL,
  `city` varchar(100) NOT NULL,
  `province` varchar(100) NOT NULL,
  `postal_code` varchar(20) NOT NULL,
  `country` varchar(100) NOT NULL DEFAULT 'South Africa',
  PRIMARY KEY (`order_address_id`),
  UNIQUE KEY `order_id` (`order_id`),
  CONSTRAINT `order_addresses_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_addresses`
--

LOCK TABLES `order_addresses` WRITE;
/*!40000 ALTER TABLE `order_addresses` DISABLE KEYS */;
INSERT INTO `order_addresses` VALUES (1,1,'Test Customer','0712345678','25 Main Street',NULL,'Johannesburg','Gauteng','2001','South Africa'),(3,2,'Test Customer','0712345678','25 Main Street',NULL,'Johannesburg','Gauteng','2001','South Africa');
/*!40000 ALTER TABLE `order_addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `order_item_id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `vendor_order_id` int unsigned NOT NULL,
  `variant_id` int unsigned NOT NULL,
  `product_name` varchar(200) NOT NULL,
  `variant_name` varchar(150) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `quantity` int unsigned NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `line_total` decimal(12,2) NOT NULL,
  `commission_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `commission_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `vendor_net_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`order_item_id`),
  KEY `variant_id` (`variant_id`),
  KEY `idx_order_items_order` (`order_id`),
  KEY `idx_order_items_vendor_order` (`vendor_order_id`,`order_id`),
  CONSTRAINT `fk_order_items_vendor_order` FOREIGN KEY (`vendor_order_id`, `order_id`) REFERENCES `vendor_orders` (`vendor_order_id`, `order_id`) ON DELETE RESTRICT,
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE RESTRICT,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,1,1,1,'Test Laboratory Centrifuge','Standard Model','TEST-CENT-001',2,5500.00,11000.00,12.00,1320.00,9680.00),(2,2,2,1,'Test Laboratory Centrifuge','Standard Model','TEST-CENT-001',1,5500.00,5500.00,12.00,660.00,4840.00),(3,2,3,2,'Test Medical Microscope','Standard Model','TEST-MIC-002',1,3000.00,3000.00,8.00,240.00,2760.00);
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `order_id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_number` varchar(50) NOT NULL,
  `user_id` int unsigned NOT NULL,
  `cart_id` int unsigned NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `order_status` enum('new','confirmed','processing','completed','cancelled') NOT NULL DEFAULT 'new',
  `admin_notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `order_number` (`order_number`),
  UNIQUE KEY `cart_id` (`cart_id`),
  KEY `idx_orders_user` (`user_id`,`created_at`),
  KEY `idx_orders_status` (`order_status`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`cart_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,'MSS-TEST-0001',1,1,11000.00,11000.00,'confirmed',NULL,'2026-09-22 22:03:36','2026-09-22 22:08:01'),(2,'MSS-TEST-0002',1,2,8500.00,8500.00,'confirmed',NULL,'2026-10-08 16:28:39','2026-10-08 16:37:25');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_split_adjustments`
--

DROP TABLE IF EXISTS `payment_split_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_split_adjustments` (
  `adjustment_id` int unsigned NOT NULL AUTO_INCREMENT,
  `payment_split_id` int unsigned NOT NULL,
  `refund_id` int unsigned NOT NULL,
  `refund_item_id` int unsigned NOT NULL,
  `gross_adjustment` decimal(12,2) NOT NULL,
  `commission_adjustment` decimal(12,2) NOT NULL,
  `vendor_adjustment` decimal(12,2) NOT NULL,
  `adjustment_type` enum('refund','manual') NOT NULL DEFAULT 'refund',
  `adjustment_status` enum('pending','successful','failed') NOT NULL DEFAULT 'pending',
  `gateway_adjustment_reference` varchar(150) DEFAULT NULL,
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`adjustment_id`),
  UNIQUE KEY `uq_split_refund_item` (`payment_split_id`,`refund_item_id`),
  KEY `fk_split_adjustment_refund` (`refund_id`),
  KEY `fk_split_adjustment_refund_item` (`refund_item_id`),
  CONSTRAINT `fk_split_adjustment_refund` FOREIGN KEY (`refund_id`) REFERENCES `refunds` (`refund_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_split_adjustment_refund_item` FOREIGN KEY (`refund_item_id`) REFERENCES `refund_items` (`refund_item_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_split_adjustment_split` FOREIGN KEY (`payment_split_id`) REFERENCES `payment_splits` (`payment_split_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_split_adjustment_amounts` CHECK (((`gross_adjustment` > 0) and (`commission_adjustment` >= 0) and (`vendor_adjustment` >= 0) and (`gross_adjustment` = (`commission_adjustment` + `vendor_adjustment`))))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_split_adjustments`
--

LOCK TABLES `payment_split_adjustments` WRITE;
/*!40000 ALTER TABLE `payment_split_adjustments` DISABLE KEYS */;
INSERT INTO `payment_split_adjustments` VALUES (1,1,1,1,5500.00,660.00,4840.00,'refund','successful','TEST-ADJ-0001','2026-10-07 19:08:29','2026-10-07 19:08:29');
/*!40000 ALTER TABLE `payment_split_adjustments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_splits`
--

DROP TABLE IF EXISTS `payment_splits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_splits` (
  `payment_split_id` int unsigned NOT NULL AUTO_INCREMENT,
  `payment_id` int unsigned NOT NULL,
  `vendor_order_id` int unsigned NOT NULL,
  `vendor_id` int unsigned NOT NULL,
  `vendor_payment_account_id` int unsigned NOT NULL,
  `gross_amount` decimal(12,2) NOT NULL,
  `commission_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `vendor_amount` decimal(12,2) NOT NULL,
  `gateway_split_reference` varchar(150) DEFAULT NULL,
  `split_status` enum('pending','successful','failed','partially_reversed','reversed') NOT NULL DEFAULT 'pending',
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_split_id`),
  UNIQUE KEY `uq_payment_vendor_order` (`payment_id`,`vendor_order_id`),
  KEY `fk_payment_splits_vendor_order` (`vendor_order_id`),
  KEY `fk_payment_splits_vendor` (`vendor_id`),
  KEY `fk_payment_splits_vendor_payment_account` (`vendor_payment_account_id`),
  CONSTRAINT `fk_payment_splits_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`payment_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_payment_splits_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`vendor_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_payment_splits_vendor_order` FOREIGN KEY (`vendor_order_id`) REFERENCES `vendor_orders` (`vendor_order_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_payment_splits_vendor_payment_account` FOREIGN KEY (`vendor_payment_account_id`) REFERENCES `vendor_payment_accounts` (`vendor_payment_account_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_payment_split_amounts` CHECK (((`gross_amount` >= 0) and (`commission_amount` >= 0) and (`vendor_amount` >= 0) and (`gross_amount` = (`commission_amount` + `vendor_amount`))))
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_splits`
--

LOCK TABLES `payment_splits` WRITE;
/*!40000 ALTER TABLE `payment_splits` DISABLE KEYS */;
INSERT INTO `payment_splits` VALUES (1,1,1,1,1,11000.00,1320.00,9680.00,'TEST-SPLIT-0001','partially_reversed','2026-10-07 18:57:46','2026-10-07 18:57:46'),(5,3,2,1,1,5500.00,660.00,4840.00,'TEST-SPLIT-0002-V1','successful','2026-10-08 16:37:25','2026-10-08 16:37:25'),(6,3,3,2,2,3000.00,240.00,2760.00,'TEST-SPLIT-0002-V2','successful','2026-10-08 16:37:25','2026-10-08 16:37:25');
/*!40000 ALTER TABLE `payment_splits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `payment_id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `payment_gateway` varchar(50) NOT NULL,
  `transaction_reference` varchar(150) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_status` enum('pending','successful','failed','partially_refunded','refunded') NOT NULL DEFAULT 'pending',
  `paid_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  KEY `idx_payments_order` (`order_id`,`payment_status`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,1,'PayFast','TEST-PAY-0001','Card',11000.00,'partially_refunded','2026-09-22 22:07:22','2026-09-22 22:07:22','2026-10-07 19:09:00'),(3,2,'PayFast','TEST-PAY-0002','Card',8500.00,'successful','2026-10-08 16:37:25','2026-10-08 16:37:25','2026-10-08 16:37:25');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_categories`
--

DROP TABLE IF EXISTS `product_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_categories` (
  `product_id` int unsigned NOT NULL,
  `category_id` int unsigned NOT NULL,
  PRIMARY KEY (`product_id`,`category_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `product_categories_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE,
  CONSTRAINT `product_categories_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_categories`
--

LOCK TABLES `product_categories` WRITE;
/*!40000 ALTER TABLE `product_categories` DISABLE KEYS */;
INSERT INTO `product_categories` VALUES (1,1),(2,1);
/*!40000 ALTER TABLE `product_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_images`
--

DROP TABLE IF EXISTS `product_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_images` (
  `image_id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int unsigned NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `alt_text` varchar(255) DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`image_id`),
  KEY `idx_product_images_product` (`product_id`),
  CONSTRAINT `product_images_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_images`
--

LOCK TABLES `product_images` WRITE;
/*!40000 ALTER TABLE `product_images` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_specifications`
--

DROP TABLE IF EXISTS `product_specifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_specifications` (
  `specification_id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int unsigned NOT NULL,
  `specification_name` varchar(150) NOT NULL,
  `specification_value` varchar(255) NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`specification_id`),
  KEY `idx_product_specifications_product` (`product_id`),
  CONSTRAINT `product_specifications_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_specifications`
--

LOCK TABLES `product_specifications` WRITE;
/*!40000 ALTER TABLE `product_specifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_specifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_variants`
--

DROP TABLE IF EXISTS `product_variants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_variants` (
  `variant_id` int unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int unsigned NOT NULL,
  `variant_name` varchar(150) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `model_number` varchar(100) DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `selling_price` decimal(12,2) NOT NULL,
  `cost_price` decimal(12,2) DEFAULT NULL,
  `variant_status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`variant_id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `idx_variants_product` (`product_id`),
  CONSTRAINT `product_variants_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_variants`
--

LOCK TABLES `product_variants` WRITE;
/*!40000 ALTER TABLE `product_variants` DISABLE KEYS */;
INSERT INTO `product_variants` VALUES (1,1,'Standard Model','TEST-CENT-001','CF-12','Each',5500.00,4000.00,'active','2026-09-22 21:40:41','2026-09-22 21:40:41'),(2,2,'Standard Model','TEST-MIC-002','MIC-20','Each',3000.00,2200.00,'active','2026-10-08 16:24:59','2026-10-08 16:24:59');
/*!40000 ALTER TABLE `product_variants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `product_id` int unsigned NOT NULL AUTO_INCREMENT,
  `vendor_id` int unsigned NOT NULL,
  `product_name` varchar(200) NOT NULL,
  `slug` varchar(220) NOT NULL,
  `description` text,
  `brand` varchar(150) DEFAULT NULL,
  `product_status` enum('draft','active','inactive') NOT NULL DEFAULT 'draft',
  `approval_status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` int unsigned DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_products_vendor` (`vendor_id`),
  KEY `idx_products_name` (`product_name`),
  KEY `fk_products_reviewed_by` (`reviewed_by`),
  CONSTRAINT `fk_products_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,1,'Test Laboratory Centrifuge','test-laboratory-centrifuge','Test product used for database validation.','Test Brand','active','approved',1,'2026-10-07 18:34:54',NULL,'2026-09-22 21:34:05','2026-09-22 21:34:05'),(2,2,'Test Medical Microscope','test-medical-microscope','Test microscope used for multi-vendor checkout testing.','XYZ Medical','active','approved',1,'2026-10-08 16:24:30',NULL,'2026-10-08 16:23:56','2026-10-08 16:23:56');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refund_items`
--

DROP TABLE IF EXISTS `refund_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refund_items` (
  `refund_item_id` int unsigned NOT NULL AUTO_INCREMENT,
  `refund_id` int unsigned NOT NULL,
  `order_item_id` int unsigned NOT NULL,
  `quantity` int unsigned NOT NULL,
  `refund_amount` decimal(12,2) NOT NULL,
  `commission_reversal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `vendor_reversal` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`refund_item_id`),
  UNIQUE KEY `uq_refund_order_item` (`refund_id`,`order_item_id`),
  KEY `fk_refund_items_order_item` (`order_item_id`),
  CONSTRAINT `fk_refund_items_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`order_item_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_refund_items_refund` FOREIGN KEY (`refund_id`) REFERENCES `refunds` (`refund_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_refund_item_values` CHECK (((`quantity` > 0) and (`refund_amount` > 0) and (`commission_reversal` >= 0) and (`vendor_reversal` >= 0) and (`refund_amount` = (`commission_reversal` + `vendor_reversal`))))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refund_items`
--

LOCK TABLES `refund_items` WRITE;
/*!40000 ALTER TABLE `refund_items` DISABLE KEYS */;
INSERT INTO `refund_items` VALUES (1,1,1,1,5500.00,660.00,4840.00);
/*!40000 ALTER TABLE `refund_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refunds`
--

DROP TABLE IF EXISTS `refunds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refunds` (
  `refund_id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `payment_id` int unsigned NOT NULL,
  `refund_reference` varchar(100) NOT NULL,
  `refund_amount` decimal(12,2) NOT NULL,
  `refund_reason` varchar(500) DEFAULT NULL,
  `refund_status` enum('requested','approved','processing','successful','failed','cancelled') NOT NULL DEFAULT 'requested',
  `requested_by` int unsigned DEFAULT NULL,
  `approved_by` int unsigned DEFAULT NULL,
  `requested_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_at` timestamp NULL DEFAULT NULL,
  `processed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`refund_id`),
  UNIQUE KEY `refund_reference` (`refund_reference`),
  KEY `fk_refunds_order` (`order_id`),
  KEY `fk_refunds_payment` (`payment_id`),
  KEY `fk_refunds_requested_by` (`requested_by`),
  KEY `fk_refunds_approved_by` (`approved_by`),
  CONSTRAINT `fk_refunds_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_refunds_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_refunds_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`payment_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_refunds_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_refund_amount` CHECK ((`refund_amount` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refunds`
--

LOCK TABLES `refunds` WRITE;
/*!40000 ALTER TABLE `refunds` DISABLE KEYS */;
INSERT INTO `refunds` VALUES (1,1,1,'TEST-REFUND-0001',5500.00,'Partial refund test - 1 centrifuge','successful',1,1,'2026-10-07 19:03:05','2026-10-07 19:03:05','2026-10-07 19:03:05');
/*!40000 ALTER TABLE `refunds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `role_id` int unsigned NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin','MultiSS administrator');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `user_role_id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `role_id` int unsigned NOT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_role_id`),
  UNIQUE KEY `user_id` (`user_id`,`role_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (1,1,1,'2026-09-22 21:07:33');
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Test','Customer','testcustomer@multiss.co.za','0712345678','TEST_HASH_NOT_FOR_LOGIN','active','2026-09-22 20:34:09','2026-09-22 20:34:09'),(3,'Vendor','Applicant','vendorapplicant@multiss.co.za','0721112233','TEST_VENDOR_HASH','active','2026-09-22 21:10:12','2026-09-22 21:10:12'),(4,'Second','Vendor','secondvendor@multiss-test.co.za','0720000002','TEST_HASH_NOT_FOR_LOGIN','active','2026-10-07 19:10:28','2026-10-07 19:10:28');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_application_documents`
--

DROP TABLE IF EXISTS `vendor_application_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_application_documents` (
  `document_id` int unsigned NOT NULL AUTO_INCREMENT,
  `application_id` int unsigned NOT NULL,
  `document_type` enum('company_registration','vat','bbbee','tax_compliance','id','bank_confirmation_letter','proof_of_address') NOT NULL,
  `document_url` varchar(500) NOT NULL,
  `verification_status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` int unsigned DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` varchar(500) DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`document_id`),
  UNIQUE KEY `uq_vendor_application_document` (`application_id`,`document_type`),
  KEY `fk_vendor_doc_reviewer` (`reviewed_by`),
  CONSTRAINT `fk_vendor_doc_application` FOREIGN KEY (`application_id`) REFERENCES `vendor_applications` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vendor_doc_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_application_documents`
--

LOCK TABLES `vendor_application_documents` WRITE;
/*!40000 ALTER TABLE `vendor_application_documents` DISABLE KEYS */;
INSERT INTO `vendor_application_documents` VALUES (1,1,'company_registration','test/company_registration.pdf','pending',NULL,NULL,NULL,'2026-10-07 18:29:13');
/*!40000 ALTER TABLE `vendor_application_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_applications`
--

DROP TABLE IF EXISTS `vendor_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_applications` (
  `application_id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `institution_company_name` varchar(150) NOT NULL,
  `vat_number` varchar(100) NOT NULL,
  `email_address` varchar(255) NOT NULL,
  `primary_contact_number` varchar(30) NOT NULL,
  `secondary_contact_number` varchar(30) DEFAULT NULL,
  `billing_address_line_1` varchar(150) NOT NULL,
  `billing_address_line_2` varchar(150) DEFAULT NULL,
  `billing_city` varchar(100) NOT NULL,
  `billing_province` varchar(100) NOT NULL,
  `billing_postal_code` varchar(20) NOT NULL,
  `billing_country` varchar(100) NOT NULL DEFAULT 'South Africa',
  `application_status` enum('pending','under_review','approved','rejected','withdrawn') NOT NULL DEFAULT 'pending',
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` int unsigned DEFAULT NULL,
  `review_notes` text,
  PRIMARY KEY (`application_id`),
  KEY `user_id` (`user_id`),
  KEY `reviewed_by` (`reviewed_by`),
  KEY `idx_vendor_application_business` (`vat_number`,`application_status`),
  CONSTRAINT `vendor_applications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `vendor_applications_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_applications`
--

LOCK TABLES `vendor_applications` WRITE;
/*!40000 ALTER TABLE `vendor_applications` DISABLE KEYS */;
INSERT INTO `vendor_applications` VALUES (1,3,'ABC Laboratory Supplies','4123456789','sales@abclabs.co.za','0115550100','0715550101','10 Industrial Road','Unit 4','Midrand','Gauteng','1685','South Africa','approved','2026-09-22 21:11:25','2026-09-22 21:13:46','2026-09-22 21:13:46',1,'Test vendor application approved.'),(2,4,'XYZ Medical Supplies','TESTVAT0002','secondvendor@multiss-test.co.za','0720000002',NULL,'20 Test Industrial Road',NULL,'Johannesburg','Gauteng','2000','South Africa','approved','2026-10-07 19:11:03','2026-10-07 19:11:03','2026-10-07 19:11:03',1,'Second vendor created for multi-vendor testing');
/*!40000 ALTER TABLE `vendor_applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_blocks`
--

DROP TABLE IF EXISTS `vendor_blocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_blocks` (
  `block_id` int unsigned NOT NULL AUTO_INCREMENT,
  `vat_number` varchar(100) NOT NULL,
  `institution_company_name` varchar(150) NOT NULL,
  `reason` text NOT NULL,
  `blocked_by` int unsigned NOT NULL,
  `blocked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`block_id`),
  KEY `blocked_by` (`blocked_by`),
  KEY `idx_vendor_block_business` (`vat_number`,`is_active`),
  CONSTRAINT `vendor_blocks_ibfk_1` FOREIGN KEY (`blocked_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_blocks`
--

LOCK TABLES `vendor_blocks` WRITE;
/*!40000 ALTER TABLE `vendor_blocks` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_blocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_orders`
--

DROP TABLE IF EXISTS `vendor_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_orders` (
  `vendor_order_id` int unsigned NOT NULL AUTO_INCREMENT,
  `order_id` int unsigned NOT NULL,
  `vendor_id` int unsigned NOT NULL,
  `vendor_order_number` varchar(60) NOT NULL,
  `items_subtotal` decimal(12,2) NOT NULL,
  `commission_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `vendor_net_total` decimal(12,2) NOT NULL,
  `vendor_order_status` enum('new','confirmed','processing','completed','cancelled','refunded') NOT NULL DEFAULT 'new',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`vendor_order_id`),
  UNIQUE KEY `vendor_order_number` (`vendor_order_number`),
  UNIQUE KEY `uq_vendor_order_per_vendor` (`order_id`,`vendor_id`),
  UNIQUE KEY `uq_vendor_order_identity` (`vendor_order_id`,`order_id`),
  KEY `fk_vendor_orders_vendor` (`vendor_id`),
  CONSTRAINT `fk_vendor_orders_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_vendor_orders_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`vendor_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_vendor_order_amounts` CHECK (((`items_subtotal` >= 0) and (`commission_total` >= 0) and (`vendor_net_total` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_orders`
--

LOCK TABLES `vendor_orders` WRITE;
/*!40000 ALTER TABLE `vendor_orders` DISABLE KEYS */;
INSERT INTO `vendor_orders` VALUES (1,1,1,'MSS-TEST-0001-V1',11000.00,1320.00,9680.00,'confirmed','2026-10-07 18:49:30','2026-10-07 18:49:30'),(2,2,1,'MSS-TEST-0002-V1',5500.00,660.00,4840.00,'confirmed','2026-10-08 16:28:48','2026-10-08 16:37:25'),(3,2,2,'MSS-TEST-0002-V2',3000.00,240.00,2760.00,'confirmed','2026-10-08 16:29:02','2026-10-08 16:37:25');
/*!40000 ALTER TABLE `vendor_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_payment_accounts`
--

DROP TABLE IF EXISTS `vendor_payment_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_payment_accounts` (
  `vendor_payment_account_id` int unsigned NOT NULL AUTO_INCREMENT,
  `vendor_id` int unsigned NOT NULL,
  `payment_gateway` varchar(50) NOT NULL,
  `gateway_subaccount_reference` varchar(150) NOT NULL,
  `account_status` enum('pending','active','inactive','suspended') NOT NULL DEFAULT 'pending',
  `split_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`vendor_payment_account_id`),
  UNIQUE KEY `uq_vendor_gateway` (`vendor_id`,`payment_gateway`),
  UNIQUE KEY `uq_gateway_subaccount` (`payment_gateway`,`gateway_subaccount_reference`),
  CONSTRAINT `fk_vendor_payment_account_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`vendor_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_payment_accounts`
--

LOCK TABLES `vendor_payment_accounts` WRITE;
/*!40000 ALTER TABLE `vendor_payment_accounts` DISABLE KEYS */;
INSERT INTO `vendor_payment_accounts` VALUES (1,1,'PayFast','TEST-SUBACCOUNT-001','active',1,'2026-10-07 18:55:33','2026-10-07 18:55:33','2026-10-07 18:55:33'),(2,2,'PayFast','TEST-SUBACCOUNT-002','active',1,'2026-10-08 16:25:35','2026-10-08 16:25:35','2026-10-08 16:25:35');
/*!40000 ALTER TABLE `vendor_payment_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_users`
--

DROP TABLE IF EXISTS `vendor_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_users` (
  `vendor_user_id` int unsigned NOT NULL AUTO_INCREMENT,
  `vendor_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `vendor_role` enum('owner','manager','staff') NOT NULL DEFAULT 'staff',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`vendor_user_id`),
  UNIQUE KEY `vendor_id` (`vendor_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `vendor_users_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`vendor_id`),
  CONSTRAINT `vendor_users_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_users`
--

LOCK TABLES `vendor_users` WRITE;
/*!40000 ALTER TABLE `vendor_users` DISABLE KEYS */;
INSERT INTO `vendor_users` VALUES (1,1,3,'owner','active','2026-09-22 21:30:13'),(2,2,4,'owner','active','2026-10-07 19:11:31');
/*!40000 ALTER TABLE `vendor_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendors`
--

DROP TABLE IF EXISTS `vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendors` (
  `vendor_id` int unsigned NOT NULL AUTO_INCREMENT,
  `application_id` int unsigned DEFAULT NULL,
  `vendor_type` enum('multiss','third_party') NOT NULL DEFAULT 'third_party',
  `institution_company_name` varchar(150) NOT NULL,
  `registration_number` varchar(100) DEFAULT NULL,
  `vat_number` varchar(100) NOT NULL,
  `email_address` varchar(255) NOT NULL,
  `primary_contact_number` varchar(30) NOT NULL,
  `secondary_contact_number` varchar(30) DEFAULT NULL,
  `billing_address_line_1` varchar(150) NOT NULL,
  `billing_address_line_2` varchar(150) DEFAULT NULL,
  `billing_city` varchar(100) NOT NULL,
  `billing_province` varchar(100) NOT NULL,
  `billing_postal_code` varchar(20) NOT NULL,
  `billing_country` varchar(100) NOT NULL DEFAULT 'South Africa',
  `vendor_status` enum('active','suspended','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`vendor_id`),
  UNIQUE KEY `uq_vendors_vat_number` (`vat_number`),
  UNIQUE KEY `registration_number` (`registration_number`),
  UNIQUE KEY `application_id` (`application_id`),
  CONSTRAINT `vendors_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `vendor_applications` (`application_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendors`
--

LOCK TABLES `vendors` WRITE;
/*!40000 ALTER TABLE `vendors` DISABLE KEYS */;
INSERT INTO `vendors` VALUES (1,1,'third_party','ABC Laboratory Supplies',NULL,'4123456789','sales@abclabs.co.za','0115550100','0715550101','10 Industrial Road','Unit 4','Midrand','Gauteng','1685','South Africa','active','2026-09-22 21:16:56','2026-09-22 21:16:56'),(2,2,'third_party','XYZ Medical Supplies',NULL,'TESTVAT0002','secondvendor@multiss-test.co.za','0720000002',NULL,'20 Test Industrial Road',NULL,'Johannesburg','Gauteng','2000','South Africa','active','2026-10-07 19:11:18','2026-10-07 19:11:18');
/*!40000 ALTER TABLE `vendors` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-08 18:47:51

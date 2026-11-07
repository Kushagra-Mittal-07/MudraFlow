-- =============================================================================
-- MudraFlow Core Banking DBMS Schema & Seed Data
-- File: Schema.sql
-- Compatible with: MySQL 8, MariaDB, XAMPP, phpMyAdmin
-- =============================================================================

CREATE DATABASE IF NOT EXISTS mudraflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mudraflow;

-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: mudraflow
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `account`
--

DROP TABLE IF EXISTS `account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `account` (
  `account_id` int NOT NULL AUTO_INCREMENT,
  `account_number` char(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` bigint NOT NULL,
  `branch_id` int NOT NULL,
  `account_type` enum('SAVINGS','CURRENT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `balance` decimal(15,2) NOT NULL DEFAULT '0.00',
  `status` enum('ACTIVE','FROZEN') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `opened_on` date NOT NULL,
  PRIMARY KEY (`account_id`),
  UNIQUE KEY `account_number` (`account_number`),
  KEY `fk_account_branch` (`branch_id`),
  KEY `idx_account_customer` (`customer_id`),
  CONSTRAINT `fk_account_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`),
  CONSTRAINT `fk_account_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`),
  CONSTRAINT `chk_account_balance` CHECK ((`balance` >= 0.00))
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `account`
--

LOCK TABLES `account` WRITE;
/*!40000 ALTER TABLE `account` DISABLE KEYS */;
INSERT INTO `account` VALUES (1,'5001000001',10000001,1,'SAVINGS',301000.00,'ACTIVE','2026-11-04'),(2,'5001000002',10000002,2,'SAVINGS',240000.00,'ACTIVE','2026-11-04'),(3,'5001000003',10000003,3,'CURRENT',542000.00,'ACTIVE','2026-11-04'),(4,'5001000004',10000004,1,'SAVINGS',24000.00,'ACTIVE','2026-11-04'),(5,'5001000005',10000005,2,'CURRENT',565000.00,'ACTIVE','2026-11-04'),(6,'5001000006',10000001,1,'CURRENT',220000.00,'ACTIVE','2026-11-04'),(7,'5001000007',10000006,1,'SAVINGS',2000.00,'ACTIVE','2026-11-04'),(8,'5001000008',10000007,1,'SAVINGS',2000.00,'ACTIVE','2026-11-04'),(9,'5001000009',10000008,2,'SAVINGS',43812.00,'ACTIVE','2026-11-04'),(10,'5001000010',10000009,1,'SAVINGS',2000.00,'ACTIVE','2026-11-04'),(11,'5001000011',10000010,1,'SAVINGS',2000.00,'ACTIVE','2026-11-04'),(12,'5001000012',10000011,1,'SAVINGS',2000.00,'ACTIVE','2026-11-04'),(13,'5001000013',10000012,1,'SAVINGS',2000.00,'ACTIVE','2026-11-05'),(14,'5001000014',10000013,1,'SAVINGS',2000.00,'ACTIVE','2026-11-05');
/*!40000 ALTER TABLE `account` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `trg_account_audit` AFTER UPDATE ON `account` FOR EACH ROW BEGIN
  IF OLD.balance <> NEW.balance THEN
    INSERT INTO audit_log (account_id, txn_id, old_balance, new_balance)
    VALUES (NEW.account_id, @current_txn_id, OLD.balance, NEW.balance);
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `audit_id` bigint NOT NULL AUTO_INCREMENT,
  `account_id` int NOT NULL,
  `txn_id` bigint DEFAULT NULL,
  `old_balance` decimal(15,2) NOT NULL,
  `new_balance` decimal(15,2) NOT NULL,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`audit_id`),
  KEY `fk_audit_account` (`account_id`),
  CONSTRAINT `fk_audit_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`account_id`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
INSERT INTO `audit_log` VALUES (1,1,1,0.00,125000.00,'2026-11-04 15:54:51'),(2,2,2,0.00,60000.00,'2026-11-04 15:54:51'),(3,3,3,0.00,975000.00,'2026-11-04 15:54:51'),(4,4,4,0.00,15000.00,'2026-11-04 15:54:51'),(5,5,5,0.00,340000.00,'2026-11-04 15:54:51'),(6,1,6,125000.00,100000.00,'2026-11-04 15:54:51'),(7,6,6,0.00,25000.00,'2026-11-04 15:54:51'),(8,1,7,100000.00,95000.00,'2026-11-04 15:54:51'),(9,2,7,60000.00,65000.00,'2026-11-04 15:54:51'),(10,3,8,975000.00,725000.00,'2026-11-04 15:54:51'),(11,5,8,340000.00,590000.00,'2026-11-04 15:54:51'),(12,5,9,590000.00,578000.00,'2026-11-04 15:54:51'),(13,4,9,15000.00,27000.00,'2026-11-04 15:54:51'),(14,2,10,65000.00,63000.00,'2026-11-04 15:54:51'),(15,1,10,95000.00,97000.00,'2026-11-04 15:54:51'),(16,3,11,725000.00,515000.00,'2026-11-04 15:54:51'),(17,6,11,25000.00,235000.00,'2026-11-04 15:54:51'),(18,6,12,235000.00,220000.00,'2026-11-04 15:54:51'),(19,2,12,63000.00,78000.00,'2026-11-04 15:54:51'),(20,5,13,578000.00,558000.00,'2026-11-04 15:54:51'),(21,3,13,515000.00,535000.00,'2026-11-04 15:54:51'),(22,4,14,27000.00,24000.00,'2026-11-04 15:54:51'),(23,5,14,558000.00,561000.00,'2026-11-04 15:54:51'),(24,2,15,78000.00,74000.00,'2026-11-04 15:54:51'),(25,5,15,561000.00,565000.00,'2026-11-04 15:54:51'),(26,3,16,535000.00,435000.00,'2026-11-04 15:54:51'),(27,2,17,74000.00,224000.00,'2026-11-04 15:58:03'),(28,3,18,435000.00,542000.00,'2026-11-04 15:58:23'),(29,7,19,0.00,2000.00,'2026-11-04 15:58:58'),(30,1,20,97000.00,127000.00,'2026-11-04 15:58:59'),(31,8,21,0.00,2000.00,'2026-11-04 15:59:51'),(32,1,22,127000.00,126000.00,'2026-11-04 15:59:52'),(33,2,22,224000.00,225000.00,'2026-11-04 15:59:52'),(34,1,23,126000.00,156000.00,'2026-11-04 15:59:52'),(35,9,24,0.00,74812.00,'2026-11-04 16:05:33'),(36,10,25,0.00,2000.00,'2026-11-04 16:23:42'),(37,1,26,156000.00,155000.00,'2026-11-04 16:23:43'),(38,2,26,225000.00,226000.00,'2026-11-04 16:23:43'),(39,1,27,155000.00,185000.00,'2026-11-04 16:23:43'),(40,9,28,74812.00,64812.00,'2026-11-04 16:26:53'),(41,2,28,226000.00,236000.00,'2026-11-04 16:26:53'),(42,9,29,64812.00,43812.00,'2026-11-04 16:32:55'),(43,11,30,0.00,2000.00,'2026-11-04 16:57:01'),(44,1,31,185000.00,184000.00,'2026-11-04 16:57:02'),(45,2,31,236000.00,237000.00,'2026-11-04 16:57:02'),(46,1,32,184000.00,214000.00,'2026-11-04 16:57:02'),(47,12,33,0.00,2000.00,'2026-11-04 19:31:09'),(48,1,34,214000.00,213000.00,'2026-11-04 19:31:09'),(49,2,34,237000.00,238000.00,'2026-11-04 19:31:09'),(50,1,35,213000.00,243000.00,'2026-11-04 19:31:10'),(51,13,36,0.00,2000.00,'2026-11-05 16:18:32'),(52,1,37,243000.00,242000.00,'2026-11-05 16:18:33'),(53,2,37,238000.00,239000.00,'2026-11-05 16:18:33'),(54,1,38,242000.00,272000.00,'2026-11-05 16:18:33'),(55,14,39,0.00,2000.00,'2026-11-05 17:12:48'),(56,1,40,272000.00,271000.00,'2026-11-05 17:12:48'),(57,2,40,239000.00,240000.00,'2026-11-05 17:12:48'),(58,1,41,271000.00,301000.00,'2026-11-05 17:12:49');
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `beneficiary`
--

DROP TABLE IF EXISTS `beneficiary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `beneficiary` (
  `beneficiary_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` bigint NOT NULL,
  `name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_number` char(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ifsc` char(11) COLLATE utf8mb4_unicode_ci NOT NULL,
  `added_on` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`beneficiary_id`),
  UNIQUE KEY `uq_beneficiary_cust_acc` (`customer_id`,`account_number`),
  CONSTRAINT `fk_beneficiary_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `beneficiary`
--

LOCK TABLES `beneficiary` WRITE;
/*!40000 ALTER TABLE `beneficiary` DISABLE KEYS */;
INSERT INTO `beneficiary` VALUES (1,10000001,'Priya Verma','5001000002','MUDF0000483','2026-11-04 15:54:51'),(2,10000002,'Rahul Sharma','5001000003','MUDF0000484','2026-11-04 15:54:51'),(3,10000004,'Riya Sharma','5001000001','MUDF0000482','2026-11-04 15:54:51'),(4,10000008,'Priya Verma','5001000002','MUDF0000483','2026-11-04 16:26:20');
/*!40000 ALTER TABLE `beneficiary` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch`
--

DROP TABLE IF EXISTS `branch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch` (
  `branch_id` int NOT NULL AUTO_INCREMENT,
  `branch_name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ifsc` char(11) COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`branch_id`),
  UNIQUE KEY `ifsc` (`ifsc`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch`
--

LOCK TABLES `branch` WRITE;
/*!40000 ALTER TABLE `branch` DISABLE KEYS */;
INSERT INTO `branch` VALUES (1,'Rohini Sec-9','MUDF0000482','Delhi'),(2,'Dwarka Sec-12','MUDF0000483','Delhi'),(3,'Noida Sec-18','MUDF0000484','Noida');
/*!40000 ALTER TABLE `branch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer`
--

DROP TABLE IF EXISTS `customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer` (
  `customer_id` bigint NOT NULL AUTO_INCREMENT,
  `full_name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dob` date NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` char(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pan` char(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_attempts` tinyint NOT NULL DEFAULT '0',
  `locked_until` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `pan` (`pan`)
) ENGINE=InnoDB AUTO_INCREMENT=10000014 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer`
--

LOCK TABLES `customer` WRITE;
/*!40000 ALTER TABLE `customer` DISABLE KEYS */;
INSERT INTO `customer` VALUES (10000001,'Riya Sharma','1995-04-12','riya.sharma@example.com','9876543210','ABCPS1234A','Flat 402, Royal Palms, Rohini Sec-9, Delhi','$2b$10$DnoTs7v5ka.aR6Nyfq68a.a/UPK4gOBdc1CuLHc8U4ps.uNZw1Bym',0,NULL,'2026-11-04 15:54:51'),(10000002,'Priya Verma','1992-08-23','priya.verma@example.com','9876543211','ABCPS1234B','B-14, Pocket 2, Dwarka Sec-12, Delhi','$2b$10$DnoTs7v5ka.aR6Nyfq68a.a/UPK4gOBdc1CuLHc8U4ps.uNZw1Bym',0,NULL,'2026-11-04 15:54:51'),(10000003,'Rahul Sharma','1988-11-05','rahul.sharma@example.com','9876543212','ABCPS1234C','C-78, Sector 18, Noida, Uttar Pradesh','$2b$10$DnoTs7v5ka.aR6Nyfq68a.a/UPK4gOBdc1CuLHc8U4ps.uNZw1Bym',0,NULL,'2026-11-04 15:54:51'),(10000004,'Neha Singh','2000-01-15','neha.singh@example.com','9876543213','ABCPS1234D','D-90, Sector 9, Rohini, Delhi','$2b$10$DnoTs7v5ka.aR6Nyfq68a.a/UPK4gOBdc1CuLHc8U4ps.uNZw1Bym',0,NULL,'2026-11-04 15:54:51'),(10000005,'Amit Kumar','1990-06-30','amit.kumar@example.com','9876543214','ABCPS1234E','E-34, Sector 12, Dwarka, Delhi','$2b$10$DnoTs7v5ka.aR6Nyfq68a.a/UPK4gOBdc1CuLHc8U4ps.uNZw1Bym',0,NULL,'2026-11-04 15:54:51'),(10000006,'Lockout Test User','1990-05-15','locktest1483@example.com','9777771483','LCK1483A','Lockout Lane','$2b$10$pt83E0lx9ew3ZWDXd.vkcOd/4QQbPfNFXawS44v716m4ZXdW0JaWS',0,'2026-11-04 16:08:58','2026-11-04 15:58:58'),(10000007,'Lockout Test User','1990-05-15','locktest8844@example.com','9777778844','LCK8844A','Lockout Lane','$2b$10$kf3Ywx4hNgxX0lKgzalE8uhn5h4GHPFrrI4K.VNsWl.6e/5j2J7s.',0,'2026-11-04 16:09:52','2026-11-04 15:59:51'),(10000008,'Yashwani Jain','2007-04-05','yashwanijain5@gmail.com','7412589529','KUSH123YJL','mnhbvtfc','$2b$10$wGxQdCxo5bc/JjJKUIZ1TOeeY5Q/lnKUiKlCT5ZHy/YgJOFMfdjbS',0,NULL,'2026-11-04 16:05:33'),(10000009,'Lockout Test User','1990-05-15','locktest6738@example.com','9777776738','LCK6738A','Lockout Lane','$2b$10$xuy1CjIH.Qkqep2FBGj0BeiZe6EtgMZayduZMBMkyjkTNVuR24RUO',0,'2026-11-04 16:33:42','2026-11-04 16:23:42'),(10000010,'Lockout Test User','1990-05-15','locktest9166@example.com','9777779166','LCK9166A','Lockout Lane','$2b$10$d838fzTOwDSkMLay4s4wGOUraJ1asxWFhnrs3eAvabC0FX53o2pN2',0,'2026-11-04 17:07:02','2026-11-04 16:57:01'),(10000011,'Lockout Test User','1990-05-15','locktest7815@example.com','9777777815','LCK7815A','Lockout Lane','$2b$10$lPOpZtlaETdrHd8z/FxiResXS/WruQjBxopbBFAYJ4sxpZzxcE7Bm',0,'2026-11-04 19:41:09','2026-11-04 19:31:09'),(10000012,'Lockout Test User','1990-05-15','locktest7003@example.com','9777777003','LCK7003A','Lockout Lane','$2b$10$Ao9FrbaxaYFLlisqoOZd9u3UBw6URBMmvnlXInjBMz3OF5ldo4B7m',0,'2026-11-05 16:28:33','2026-11-05 16:18:32'),(10000013,'Lockout Test User','1990-05-15','locktest4804@example.com','9777774804','LCK4804A','Lockout Lane','$2b$10$VzPODyxcLrOrUaRAq2HI4uWmIlbS3u31pDSwRy6SSPioPKj0orhPi',0,'2026-11-05 17:22:48','2026-11-05 17:12:48');
/*!40000 ALTER TABLE `customer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee`
--

DROP TABLE IF EXISTS `employee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee` (
  `emp_id` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('MANAGER','CLERK') COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` int NOT NULL,
  `password_hash` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`emp_id`),
  KEY `fk_employee_branch` (`branch_id`),
  CONSTRAINT `fk_employee_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee`
--

LOCK TABLES `employee` WRITE;
/*!40000 ALTER TABLE `employee` DISABLE KEYS */;
INSERT INTO `employee` VALUES ('EMP001','Aakash Mehta','MANAGER',1,'$2b$10$DnoTs7v5ka.aR6Nyfq68a.a/UPK4gOBdc1CuLHc8U4ps.uNZw1Bym'),('EMP002','Sunita Rao','CLERK',2,'$2b$10$DnoTs7v5ka.aR6Nyfq68a.a/UPK4gOBdc1CuLHc8U4ps.uNZw1Bym');
/*!40000 ALTER TABLE `employee` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fixed_deposit`
--

DROP TABLE IF EXISTS `fixed_deposit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixed_deposit` (
  `fd_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` bigint NOT NULL,
  `account_id` int NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `rate` decimal(4,2) NOT NULL,
  `tenure_months` int NOT NULL,
  `start_date` date NOT NULL,
  `maturity_date` date NOT NULL,
  `maturity_amount` decimal(15,2) NOT NULL,
  `maturity_instruction` enum('CREDIT','RENEW') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('ACTIVE','MATURED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`fd_id`),
  KEY `fk_fd_customer` (`customer_id`),
  KEY `fk_fd_account` (`account_id`),
  KEY `idx_fd_status_maturity` (`status`,`maturity_date`),
  CONSTRAINT `fk_fd_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`account_id`),
  CONSTRAINT `fk_fd_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`),
  CONSTRAINT `chk_fd_amount` CHECK ((`amount` >= 1000.00)),
  CONSTRAINT `chk_fd_tenure` CHECK ((`tenure_months` in (6,12,24,36,60)))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fixed_deposit`
--

LOCK TABLES `fixed_deposit` WRITE;
/*!40000 ALTER TABLE `fixed_deposit` DISABLE KEYS */;
INSERT INTO `fixed_deposit` VALUES (1,10000003,3,100000.00,7.00,12,'2026-11-04','2026-11-04',107000.00,'CREDIT','MATURED'),(2,10000008,9,21000.00,7.00,12,'2026-11-04','2027-11-04',22470.00,'CREDIT','ACTIVE');
/*!40000 ALTER TABLE `fixed_deposit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loan`
--

DROP TABLE IF EXISTS `loan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loan` (
  `loan_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` bigint NOT NULL,
  `account_id` int NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `purpose` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `duration_months` int NOT NULL,
  `rate` decimal(4,2) NOT NULL,
  `employment_status` enum('SALARIED','SELF_EMPLOYED','STUDENT','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `annual_income` decimal(15,2) NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `applied_on` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `decided_by` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `decided_on` datetime DEFAULT NULL,
  PRIMARY KEY (`loan_id`),
  KEY `fk_loan_customer` (`customer_id`),
  KEY `fk_loan_account` (`account_id`),
  KEY `fk_loan_employee` (`decided_by`),
  KEY `idx_loan_status` (`status`),
  CONSTRAINT `fk_loan_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`account_id`),
  CONSTRAINT `fk_loan_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`),
  CONSTRAINT `fk_loan_employee` FOREIGN KEY (`decided_by`) REFERENCES `employee` (`emp_id`),
  CONSTRAINT `chk_loan_amount` CHECK ((`amount` > 0.00))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loan`
--

LOCK TABLES `loan` WRITE;
/*!40000 ALTER TABLE `loan` DISABLE KEYS */;
INSERT INTO `loan` VALUES (1,10000002,2,150000.00,'Home renovation',24,11.00,'SALARIED',900000.00,'APPROVED','2026-11-04 15:54:51','EMP001','2026-11-04 15:58:03'),(2,10000001,1,30000.00,'E10 Test Loan',12,10.00,'SALARIED',800000.00,'APPROVED','2026-11-04 15:58:59','EMP001','2026-11-04 15:58:59'),(3,10000001,1,30000.00,'E10 Test Loan',12,10.00,'SALARIED',800000.00,'APPROVED','2026-11-04 15:59:52','EMP001','2026-11-04 15:59:52'),(4,10000001,1,30000.00,'E10 Test Loan',12,10.00,'SALARIED',800000.00,'APPROVED','2026-11-04 16:23:43','EMP001','2026-11-04 16:23:43'),(5,10000001,1,30000.00,'E10 Test Loan',12,10.00,'SALARIED',800000.00,'APPROVED','2026-11-04 16:57:02','EMP001','2026-11-04 16:57:02'),(6,10000001,1,30000.00,'E10 Test Loan',12,10.00,'SALARIED',800000.00,'APPROVED','2026-11-04 19:31:10','EMP001','2026-11-04 19:31:10'),(7,10000001,1,30000.00,'E10 Test Loan',12,10.00,'SALARIED',800000.00,'APPROVED','2026-11-05 16:18:33','EMP001','2026-11-05 16:18:33'),(8,10000001,1,30000.00,'E10 Test Loan',12,10.00,'SALARIED',800000.00,'APPROVED','2026-11-05 17:12:49','EMP001','2026-11-05 17:12:49');
/*!40000 ALTER TABLE `loan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_request`
--

DROP TABLE IF EXISTS `service_request`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_request` (
  `request_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` bigint NOT NULL,
  `account_id` int NOT NULL,
  `request_type` enum('DEBIT_CARD','CHEQUE_BOOK') COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_on_card` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `network` enum('VISA','MASTERCARD','RUPAY') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `leaves` int DEFAULT NULL,
  `delivery_address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `card_number` char(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `card_expiry` date DEFAULT NULL,
  `status` enum('REQUESTED','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'REQUESTED',
  `requested_on` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `decided_by` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `decided_on` datetime DEFAULT NULL,
  PRIMARY KEY (`request_id`),
  KEY `fk_sr_customer` (`customer_id`),
  KEY `fk_sr_account` (`account_id`),
  KEY `fk_sr_employee` (`decided_by`),
  KEY `idx_service_status` (`status`),
  CONSTRAINT `fk_sr_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`account_id`),
  CONSTRAINT `fk_sr_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`),
  CONSTRAINT `fk_sr_employee` FOREIGN KEY (`decided_by`) REFERENCES `employee` (`emp_id`),
  CONSTRAINT `chk_sr_leaves` CHECK (((`leaves` is null) or (`leaves` in (10,25,50))))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_request`
--

LOCK TABLES `service_request` WRITE;
/*!40000 ALTER TABLE `service_request` DISABLE KEYS */;
INSERT INTO `service_request` VALUES (1,10000004,4,'DEBIT_CARD','NEHA SINGH','VISA',NULL,'D-90, Sector 9, Rohini, Delhi','4506291943094677','2031-11-04','APPROVED','2026-11-04 15:54:51','EMP001','2026-11-04 15:58:10'),(2,10000008,9,'DEBIT_CARD','YASHWANI JAIN','VISA',NULL,'NSUT college','4028462922139114','2031-11-04','APPROVED','2026-11-04 16:33:51','EMP001','2026-11-04 16:34:42');
/*!40000 ALTER TABLE `service_request` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `txn`
--

DROP TABLE IF EXISTS `txn`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `txn` (
  `txn_id` bigint NOT NULL AUTO_INCREMENT,
  `reference_no` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `from_account_id` int DEFAULT NULL,
  `to_account_id` int DEFAULT NULL,
  `receiver_name` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `mode` enum('IMPS','NEFT','RTGS','INTERNAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `txn_type` enum('OPENING_DEPOSIT','TRANSFER','FD_CREATE','FD_MATURITY','LOAN_CREDIT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `remarks` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`txn_id`),
  UNIQUE KEY `reference_no` (`reference_no`),
  KEY `idx_txn_from_created` (`from_account_id`,`created_at`),
  KEY `idx_txn_to_created` (`to_account_id`,`created_at`),
  KEY `idx_txn_created` (`created_at`),
  CONSTRAINT `fk_txn_from_account` FOREIGN KEY (`from_account_id`) REFERENCES `account` (`account_id`),
  CONSTRAINT `fk_txn_to_account` FOREIGN KEY (`to_account_id`) REFERENCES `account` (`account_id`),
  CONSTRAINT `chk_txn_accounts` CHECK (((`from_account_id` is not null) or (`to_account_id` is not null))),
  CONSTRAINT `chk_txn_amount` CHECK ((`amount` > 0.00))
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `txn`
--

LOCK TABLES `txn` WRITE;
/*!40000 ALTER TABLE `txn` DISABLE KEYS */;
INSERT INTO `txn` VALUES (1,'MF20261104000001',NULL,1,NULL,125000.00,'INTERNAL','OPENING_DEPOSIT','Opening deposit at registration','2026-11-04 15:54:51'),(2,'MF20261104000002',NULL,2,NULL,60000.00,'INTERNAL','OPENING_DEPOSIT','Opening deposit at registration','2026-11-04 15:54:51'),(3,'MF20261104000003',NULL,3,NULL,975000.00,'INTERNAL','OPENING_DEPOSIT','Opening deposit at registration','2026-11-04 15:54:51'),(4,'MF20261104000004',NULL,4,NULL,15000.00,'INTERNAL','OPENING_DEPOSIT','Opening deposit at registration','2026-11-04 15:54:51'),(5,'MF20261104000005',NULL,5,NULL,340000.00,'INTERNAL','OPENING_DEPOSIT','Opening deposit at registration','2026-11-04 15:54:51'),(6,'MF20261104000006',1,6,NULL,25000.00,'INTERNAL','TRANSFER','Funding new account','2026-11-04 15:54:51'),(7,'MF20261104000007',1,2,'Priya Verma',5000.00,'IMPS','TRANSFER','Dinner split','2026-11-04 15:54:51'),(8,'MF20261104000008',3,5,'Amit Kumar',250000.00,'RTGS','TRANSFER','Consulting invoice payment','2026-11-04 15:54:51'),(9,'MF20261104000009',5,4,'Neha Singh',12000.00,'NEFT','TRANSFER','Freelance graphic design','2026-11-04 15:54:51'),(10,'MF20261104000010',2,1,'Riya Sharma',2000.00,'IMPS','TRANSFER','Book repayment','2026-11-04 15:54:51'),(11,'MF20261104000011',3,6,'Riya Sharma',210000.00,'RTGS','TRANSFER','Equipment advance payment','2026-11-04 15:54:51'),(12,'MF20261104000012',6,2,'Priya Verma',15000.00,'NEFT','TRANSFER','Vendor settlement','2026-11-04 15:54:51'),(13,'MF20261104000013',5,3,'Rahul Sharma',20000.00,'NEFT','TRANSFER','Office supplies','2026-11-04 15:54:51'),(14,'MF20261104000014',4,5,'Amit Kumar',3000.00,'IMPS','TRANSFER','Travel reimbursement','2026-11-04 15:54:51'),(15,'MF20261104000015',2,5,'Amit Kumar',4000.00,'IMPS','TRANSFER','Gift contribution','2026-11-04 15:54:51'),(16,'MF20261104000016',3,NULL,NULL,100000.00,'INTERNAL','FD_CREATE','FD created for 12 months','2026-11-04 15:54:51'),(17,'MF20261104000017',NULL,2,NULL,150000.00,'INTERNAL','LOAN_CREDIT','Loan #1 approved','2026-11-04 15:58:03'),(18,'MF20261104000018',NULL,3,NULL,107000.00,'INTERNAL','FD_MATURITY','FD #1 matured (CREDIT)','2026-11-04 15:58:23'),(19,'MF20261104000019',NULL,7,NULL,2000.00,'INTERNAL','OPENING_DEPOSIT','Opening deposit at registration','2026-11-04 15:58:58'),(20,'MF20261104000020',NULL,1,NULL,30000.00,'INTERNAL','LOAN_CREDIT','Loan #2 approved','2026-11-04 15:58:59'),(21,'MF20261104000021',NULL,8,NULL,2000.00,'INTERNAL','OPENING_DEPOSIT','Opening deposit at registration','2026-11-04 15:59:51'),(22,'MF20261104000022',1,2,'Priya Verma',1000.00,'IMPS','TRANSFER','E5 successful transfer','2026-11-04 15:59:52'),(23,'MF20261104000023',NULL,1,NULL,30000.00,'INTERNAL','LOAN_CREDIT','Loan #3 approved','2026-11-04 15:59:52'),(24,'MF20261104000024',NULL,9,NULL,74812.00,'INTERNAL','OPENING_DEPOSIT','Opening deposit at registration','2026-11-04 16:05:33'),(25,'MF20261104000025',NULL,10,NULL,2000.00,'INTERNAL','OPENING_DEPOSIT','Opening deposit at registration','2026-11-04 16:23:42'),(26,'MF20261104000026',1,2,'Priya Verma',1000.00,'IMPS','TRANSFER','E5 successful transfer','2026-11-04 16:23:43'),(27,'MF20261104000027',NULL,1,NULL,30000.00,'INTERNAL','LOAN_CREDIT','Loan #4 approved','2026-11-04 16:23:43'),(28,'MF20261104000028',9,2,'Priya Verma',10000.00,'NEFT','TRANSFER','rent','2026-11-04 16:26:53'),(29,'MF20261104000029',9,NULL,NULL,21000.00,'INTERNAL','FD_CREATE','FD created for 12 months','2026-11-04 16:32:55'),(30,'MF20261104000030',NULL,11,NULL,2000.00,'INTERNAL','OPENING_DEPOSIT','Opening deposit at registration','2026-11-04 16:57:01'),(31,'MF20261104000031',1,2,'Priya Verma',1000.00,'IMPS','TRANSFER','E5 successful transfer','2026-11-04 16:57:02'),(32,'MF20261104000032',NULL,1,NULL,30000.00,'INTERNAL','LOAN_CREDIT','Loan #5 approved','2026-11-04 16:57:02'),(33,'MF20261104000033',NULL,12,NULL,2000.00,'INTERNAL','OPENING_DEPOSIT','Opening deposit at registration','2026-11-04 19:31:09'),(34,'MF20261104000034',1,2,'Priya Verma',1000.00,'IMPS','TRANSFER','E5 successful transfer','2026-11-04 19:31:09'),(35,'MF20261104000035',NULL,1,NULL,30000.00,'INTERNAL','LOAN_CREDIT','Loan #6 approved','2026-11-04 19:31:10'),(36,'MF20261105000036',NULL,13,NULL,2000.00,'INTERNAL','OPENING_DEPOSIT','Opening deposit at registration','2026-11-05 16:18:32'),(37,'MF20261105000037',1,2,'Priya Verma',1000.00,'IMPS','TRANSFER','E5 successful transfer','2026-11-05 16:18:33'),(38,'MF20261105000038',NULL,1,NULL,30000.00,'INTERNAL','LOAN_CREDIT','Loan #7 approved','2026-11-05 16:18:33'),(39,'MF20261105000039',NULL,14,NULL,2000.00,'INTERNAL','OPENING_DEPOSIT','Opening deposit at registration','2026-11-05 17:12:48'),(40,'MF20261105000040',1,2,'Priya Verma',1000.00,'IMPS','TRANSFER','E5 successful transfer','2026-11-05 17:12:48'),(41,'MF20261105000041',NULL,1,NULL,30000.00,'INTERNAL','LOAN_CREDIT','Loan #8 approved','2026-11-05 17:12:49');
/*!40000 ALTER TABLE `txn` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50003 TRIGGER `trg_txn_block_frozen` BEFORE INSERT ON `txn` FOR EACH ROW BEGIN
  DECLARE v_status_from ENUM('ACTIVE','FROZEN');
  DECLARE v_status_to   ENUM('ACTIVE','FROZEN');

  
  IF NEW.from_account_id IS NOT NULL THEN
    SELECT status INTO v_status_from
    FROM account WHERE account_id = NEW.from_account_id;

    IF v_status_from = 'FROZEN' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Account is frozen';
    END IF;
  END IF;

  
  IF NEW.to_account_id IS NOT NULL THEN
    SELECT status INTO v_status_to
    FROM account WHERE account_id = NEW.to_account_id;

    IF v_status_to = 'FROZEN' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Account is frozen';
    END IF;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Temporary view structure for view `v_applications`
--

DROP TABLE IF EXISTS `v_applications`;
/*!50001 DROP VIEW IF EXISTS `v_applications`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_applications` AS SELECT 
 1 AS `application_type`,
 1 AS `application_id`,
 1 AS `customer_id`,
 1 AS `account_id`,
 1 AS `details`,
 1 AS `status`,
 1 AS `applied_on`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping routines for database 'mudraflow'
--
/*!50003 DROP FUNCTION IF EXISTS `get_fd_rate` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `get_fd_rate`(p_tenure_months INT) RETURNS decimal(4,2)
    DETERMINISTIC
BEGIN
  IF p_tenure_months <= 6 THEN
    RETURN 6.50;
  ELSEIF p_tenure_months <= 12 THEN
    RETURN 7.00;
  ELSEIF p_tenure_months <= 24 THEN
    RETURN 7.50;
  ELSE
    RETURN 7.75;
  END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `get_loan_rate` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE FUNCTION `get_loan_rate`(p_duration_months INT) RETURNS decimal(4,2)
    DETERMINISTIC
BEGIN
  IF p_duration_months <= 12 THEN
    RETURN 10.00;
  ELSEIF p_duration_months <= 36 THEN
    RETURN 11.00;
  ELSE
    RETURN 12.00;
  END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_approve_loan` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_approve_loan`(
  IN p_loan_id   INT,
  IN p_emp_id    VARCHAR(10),
  IN p_decision  VARCHAR(10)    
)
BEGIN
  DECLARE v_loan_status  VARCHAR(10);
  DECLARE v_account_id   INT;
  DECLARE v_amount       DECIMAL(15,2);
  DECLARE v_acct_status  ENUM('ACTIVE','FROZEN');
  DECLARE v_txn_id       BIGINT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  
  
  IF p_decision NOT IN ('APPROVED', 'REJECTED') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Decision must be APPROVED or REJECTED';
  END IF;

  START TRANSACTION;

  
  
  
  SELECT status, account_id, amount
  INTO v_loan_status, v_account_id, v_amount
  FROM loan
  WHERE loan_id = p_loan_id
  FOR UPDATE;

  
  
  IF v_loan_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Loan not found';
  END IF;

  
  IF v_loan_status <> 'PENDING' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Loan is not pending';
  END IF;

  
  
  IF p_decision = 'REJECTED' THEN
    UPDATE loan
    SET status     = 'REJECTED',
        decided_by = p_emp_id,
        decided_on = NOW()
    WHERE loan_id = p_loan_id;

    COMMIT;
  ELSE
    
    
    SELECT status INTO v_acct_status
    FROM account
    WHERE account_id = v_account_id
    FOR UPDATE;

    IF v_acct_status <> 'ACTIVE' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Account is not active';
    END IF;

    
    
    
    INSERT INTO txn (reference_no, from_account_id, to_account_id, amount,
                     mode, txn_type, remarks)
    VALUES (
      'TMP',
      NULL,              
      v_account_id,      
      v_amount,
      'INTERNAL',
      'LOAN_CREDIT',
      CONCAT('Loan #', p_loan_id, ' approved')
    );

    SET v_txn_id = LAST_INSERT_ID();

    UPDATE txn
    SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'))
    WHERE txn_id = v_txn_id;

    
    SET @current_txn_id = v_txn_id;
    UPDATE account SET balance = balance + v_amount WHERE account_id = v_account_id;
    SET @current_txn_id = NULL;

    
    UPDATE loan
    SET status     = 'APPROVED',
        decided_by = p_emp_id,
        decided_on = NOW()
    WHERE loan_id = p_loan_id;

    COMMIT;
  END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_fd` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_create_fd`(
  IN  p_customer_id   BIGINT,
  IN  p_account_id    INT,
  IN  p_amount        DECIMAL(15,2),
  IN  p_tenure_months INT,
  IN  p_instruction   ENUM('CREDIT','RENEW'),
  OUT p_fd_id         INT
)
BEGIN
  DECLARE v_owner       BIGINT;
  DECLARE v_status      ENUM('ACTIVE','FROZEN');
  DECLARE v_balance     DECIMAL(15,2);
  DECLARE v_rate        DECIMAL(4,2);
  DECLARE v_maturity    DECIMAL(15,2);
  DECLARE v_mat_date    DATE;
  DECLARE v_txn_id      BIGINT;

  
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  
  
  
  IF p_tenure_months NOT IN (6, 12, 24, 36, 60) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Tenure must be 6, 12, 24, 36 or 60 months';
  END IF;

  
  IF p_amount < 1000 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'FD amount must be at least 1000';
  END IF;

  START TRANSACTION;

  
  
  
  SELECT customer_id, status, balance
  INTO v_owner, v_status, v_balance
  FROM account
  WHERE account_id = p_account_id
  FOR UPDATE;

  
  
  IF v_owner <> p_customer_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Account does not belong to this customer';
  END IF;

  
  IF v_status <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Account is not active';
  END IF;

  
  IF v_balance < p_amount THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Insufficient balance';
  END IF;

  
  
  
  SET v_rate = get_fd_rate(p_tenure_months);
  SET v_maturity = ROUND(p_amount * (1 + v_rate / 100 * p_tenure_months / 12), 2);
  SET v_mat_date = DATE_ADD(CURDATE(), INTERVAL p_tenure_months MONTH);

  
  
  
  
  INSERT INTO txn (reference_no, from_account_id, to_account_id, amount,
                   mode, txn_type, remarks)
  VALUES (
    'TMP',
    p_account_id,   
    NULL,            
    p_amount,
    'INTERNAL',      
    'FD_CREATE',
    CONCAT('FD created for ', p_tenure_months, ' months')
  );

  SET v_txn_id = LAST_INSERT_ID();

  
  UPDATE txn
  SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'))
  WHERE txn_id = v_txn_id;

  
  
  
  SET @current_txn_id = v_txn_id;
  UPDATE account SET balance = balance - p_amount WHERE account_id = p_account_id;
  SET @current_txn_id = NULL;

  
  
  INSERT INTO fixed_deposit (customer_id, account_id, amount, rate, tenure_months,
                             start_date, maturity_date, maturity_amount,
                             maturity_instruction, status)
  VALUES (
    p_customer_id,
    p_account_id,
    p_amount,
    v_rate,
    p_tenure_months,
    CURDATE(),
    v_mat_date,
    v_maturity,
    p_instruction,
    'ACTIVE'
  );

  SET p_fd_id = LAST_INSERT_ID();

  
  COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_decide_service_request` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_decide_service_request`(
  IN p_request_id INT,
  IN p_emp_id     VARCHAR(10),
  IN p_decision   VARCHAR(10)    
)
BEGIN
  DECLARE v_status        VARCHAR(10);
  DECLARE v_request_type  VARCHAR(20);
  DECLARE v_network       VARCHAR(20);
  DECLARE v_card_number   CHAR(16);
  DECLARE v_card_expiry   DATE;
  DECLARE v_prefix        CHAR(1);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  
  IF p_decision NOT IN ('APPROVED', 'REJECTED') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Decision must be APPROVED or REJECTED';
  END IF;

  START TRANSACTION;

  
  
  SELECT status, request_type, network
  INTO v_status, v_request_type, v_network
  FROM service_request
  WHERE request_id = p_request_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Service request not found';
  END IF;

  
  IF v_status <> 'REQUESTED' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Service request is not in REQUESTED status';
  END IF;

  
  
  
  IF p_decision = 'APPROVED' AND v_request_type = 'DEBIT_CARD' THEN
    
    IF v_network = 'VISA' THEN
      SET v_prefix = '4';
    ELSEIF v_network = 'MASTERCARD' THEN
      SET v_prefix = '5';
    ELSE
      SET v_prefix = '6';   
    END IF;

    
    SET v_card_number = CONCAT(
      v_prefix,
      LPAD(FLOOR(RAND() * 100000000), 8, '0'),
      LPAD(FLOOR(RAND() * 10000000), 7, '0')
    );

    
    SET v_card_expiry = DATE_ADD(CURDATE(), INTERVAL 5 YEAR);

    UPDATE service_request
    SET status      = 'APPROVED',
        card_number = v_card_number,
        card_expiry = v_card_expiry,
        decided_by  = p_emp_id,
        decided_on  = NOW()
    WHERE request_id = p_request_id;

  ELSE
    
    UPDATE service_request
    SET status     = p_decision,
        decided_by = p_emp_id,
        decided_on = NOW()
    WHERE request_id = p_request_id;
  END IF;

  COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_open_account` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_open_account`(
  IN  p_customer_id     BIGINT,
  IN  p_account_type    ENUM('SAVINGS','CURRENT'),
  IN  p_branch_id       INT,
  IN  p_from_account_id INT,
  IN  p_amount          DECIMAL(15,2),
  OUT p_new_account_id  INT,
  OUT p_account_number  CHAR(10)
)
BEGIN
  DECLARE v_owner       BIGINT;
  DECLARE v_status      ENUM('ACTIVE','FROZEN');
  DECLARE v_balance     DECIMAL(15,2);
  DECLARE v_txn_id      BIGINT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  
  IF p_amount < 1000 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Opening deposit must be at least 1000';
  END IF;

  START TRANSACTION;

  
  
  
  SELECT customer_id, status, balance
  INTO v_owner, v_status, v_balance
  FROM account
  WHERE account_id = p_from_account_id
  FOR UPDATE;

  
  IF v_owner <> p_customer_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Account does not belong to this customer';
  END IF;

  
  
  IF v_status <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Funding account is not active';
  END IF;

  
  IF v_balance < p_amount THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Insufficient balance';
  END IF;

  
  INSERT INTO account (account_number, customer_id, branch_id, account_type, balance, opened_on)
  VALUES ('0000000000', p_customer_id, p_branch_id, p_account_type, 0.00, CURDATE());

  SET p_new_account_id = LAST_INSERT_ID();
  SET p_account_number = CONCAT('5', LPAD(1000000 + p_new_account_id, 9, '0'));
  UPDATE account SET account_number = p_account_number WHERE account_id = p_new_account_id;

  
  INSERT INTO txn (reference_no, from_account_id, to_account_id, amount, mode, txn_type, remarks)
  VALUES (
    'TMP',
    p_from_account_id,
    p_new_account_id,
    p_amount,
    'INTERNAL',
    'TRANSFER',
    'Funding new account'
  );

  SET v_txn_id = LAST_INSERT_ID();
  UPDATE txn
  SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'))
  WHERE txn_id = v_txn_id;

  
  SET @current_txn_id = v_txn_id;

  UPDATE account SET balance = balance - p_amount WHERE account_id = p_from_account_id;
  UPDATE account SET balance = balance + p_amount WHERE account_id = p_new_account_id;

  SET @current_txn_id = NULL;

  COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_process_maturities` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_process_maturities`(
  IN  p_emp_id          VARCHAR(10),
  OUT p_processed_count INT
)
BEGIN
  
  DECLARE v_fd_id             INT;
  DECLARE v_customer_id       BIGINT;
  DECLARE v_account_id        INT;
  DECLARE v_amount            DECIMAL(15,2);
  DECLARE v_maturity_amount   DECIMAL(15,2);
  DECLARE v_tenure            INT;
  DECLARE v_instruction       VARCHAR(10);
  DECLARE v_acct_status       ENUM('ACTIVE','FROZEN');
  DECLARE v_txn_id            BIGINT;
  DECLARE v_new_rate          DECIMAL(4,2);
  DECLARE v_new_maturity      DECIMAL(15,2);
  DECLARE v_done              INT DEFAULT 0;

  
  DECLARE cur_mature CURSOR FOR
    SELECT fd_id, customer_id, account_id, amount, maturity_amount,
           tenure_months, maturity_instruction
    FROM fixed_deposit
    WHERE status = 'ACTIVE'
      AND maturity_date <= CURDATE();

  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET p_processed_count = 0;

  START TRANSACTION;

  OPEN cur_mature;

  
  read_loop: LOOP
    FETCH cur_mature INTO v_fd_id, v_customer_id, v_account_id, v_amount,
                          v_maturity_amount, v_tenure, v_instruction;

    IF v_done THEN
      LEAVE read_loop;
    END IF;

    
    SELECT status INTO v_acct_status
    FROM account
    WHERE account_id = v_account_id
    FOR UPDATE;

    
    
    IF v_acct_status = 'FROZEN' THEN
      ITERATE read_loop;
    END IF;

    IF v_instruction = 'CREDIT' THEN
      
      
      
      INSERT INTO txn (reference_no, from_account_id, to_account_id, amount,
                       mode, txn_type, remarks)
      VALUES (
        'TMP',
        NULL,              
        v_account_id,      
        v_maturity_amount,
        'INTERNAL',
        'FD_MATURITY',
        CONCAT('FD #', v_fd_id, ' matured (CREDIT)')
      );

      SET v_txn_id = LAST_INSERT_ID();

      UPDATE txn
      SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'))
      WHERE txn_id = v_txn_id;

      
      SET @current_txn_id = v_txn_id;
      UPDATE account
      SET balance = balance + v_maturity_amount
      WHERE account_id = v_account_id;
      SET @current_txn_id = NULL;

      
      UPDATE fixed_deposit SET status = 'MATURED' WHERE fd_id = v_fd_id;

    ELSEIF v_instruction = 'RENEW' THEN
      
      UPDATE fixed_deposit SET status = 'MATURED' WHERE fd_id = v_fd_id;

      
      
      
      
      SET v_new_rate = get_fd_rate(v_tenure);
      SET v_new_maturity = ROUND(v_maturity_amount * (1 + v_new_rate / 100 * v_tenure / 12), 2);

      INSERT INTO fixed_deposit (customer_id, account_id, amount, rate, tenure_months,
                                 start_date, maturity_date, maturity_amount,
                                 maturity_instruction, status)
      VALUES (
        v_customer_id,
        v_account_id,
        v_maturity_amount,       
        v_new_rate,
        v_tenure,
        CURDATE(),
        DATE_ADD(CURDATE(), INTERVAL v_tenure MONTH),
        v_new_maturity,
        'RENEW',
        'ACTIVE'
      );
    END IF;

    SET p_processed_count = p_processed_count + 1;
  END LOOP;

  CLOSE cur_mature;

  COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_register_customer` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_register_customer`(
  IN  p_name           VARCHAR(80),
  IN  p_dob            DATE,
  IN  p_email          VARCHAR(100),
  IN  p_phone          CHAR(10),
  IN  p_pan            CHAR(10),
  IN  p_address        VARCHAR(255),
  IN  p_password_hash  VARCHAR(100),
  IN  p_account_type   ENUM('SAVINGS','CURRENT'),
  IN  p_branch_id      INT,
  IN  p_opening_amount DECIMAL(15,2),
  OUT p_customer_id    BIGINT,
  OUT p_account_number CHAR(10)
)
BEGIN
  DECLARE v_account_id INT;
  DECLARE v_txn_id     BIGINT;

  
  
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  
  
  
  IF TIMESTAMPDIFF(YEAR, p_dob, CURDATE()) < 18 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Customer must be at least 18 years old';
  END IF;

  IF p_opening_amount < 1000 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Opening deposit must be at least 1000';
  END IF;

  START TRANSACTION;

  
  
  
  INSERT INTO customer (full_name, dob, email, phone, pan, address, password_hash)
  VALUES (p_name, p_dob, p_email, p_phone, p_pan, p_address, p_password_hash);

  SET p_customer_id = LAST_INSERT_ID();

  
  
  
  INSERT INTO account (account_number, customer_id, branch_id, account_type, balance, opened_on)
  VALUES ('0000000000', p_customer_id, p_branch_id, p_account_type, 0.00, CURDATE());

  SET v_account_id = LAST_INSERT_ID();

  
  SET p_account_number = CONCAT('5', LPAD(1000000 + v_account_id, 9, '0'));
  UPDATE account SET account_number = p_account_number WHERE account_id = v_account_id;

  
  
  
  
  INSERT INTO txn (reference_no, from_account_id, to_account_id, amount, mode, txn_type, remarks)
  VALUES (
    'TMP',                      
    NULL,                       
    v_account_id,               
    p_opening_amount,
    'INTERNAL',                 
    'OPENING_DEPOSIT',
    'Opening deposit at registration'
  );

  SET v_txn_id = LAST_INSERT_ID();

  
  UPDATE txn
  SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'))
  WHERE txn_id = v_txn_id;

  
  
  SET @current_txn_id = v_txn_id;

  
  UPDATE account SET balance = p_opening_amount WHERE account_id = v_account_id;

  
  SET @current_txn_id = NULL;

  
  COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_transfer` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_transfer`(
  IN  p_customer_id       BIGINT,
  IN  p_from_account_id   INT,
  IN  p_to_account_number CHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN  p_to_ifsc           CHAR(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN  p_receiver_name     VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  IN  p_amount            DECIMAL(15,2),
  IN  p_mode              ENUM('IMPS','NEFT','RTGS'),
  IN  p_remarks           VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  OUT p_reference_no      VARCHAR(20)
)
BEGIN
  DECLARE v_to_account_id INT;
  DECLARE v_lower_id      INT;
  DECLARE v_upper_id      INT;
  DECLARE v_from_owner    BIGINT;
  DECLARE v_from_status   ENUM('ACTIVE','FROZEN');
  DECLARE v_from_balance  DECIMAL(15,2);
  DECLARE v_to_status     ENUM('ACTIVE','FROZEN');
  DECLARE v_txn_id        BIGINT;
  DECLARE v_dummy_balance DECIMAL(15,2);
  DECLARE v_dummy_status  ENUM('ACTIVE','FROZEN');

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  
  
  
  IF p_amount <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Amount must be greater than zero';
  END IF;

  IF p_mode = 'IMPS' AND p_amount > 500000 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'IMPS allows up to 5,00,000';
  END IF;

  IF p_mode = 'RTGS' AND p_amount < 200000 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'RTGS needs at least 2,00,000';
  END IF;

  
  
  
  SELECT a.account_id INTO v_to_account_id
  FROM account a
  JOIN branch b ON a.branch_id = b.branch_id
  WHERE a.account_number = p_to_account_number COLLATE utf8mb4_unicode_ci
    AND b.ifsc = p_to_ifsc COLLATE utf8mb4_unicode_ci
  LIMIT 1;

  IF v_to_account_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Receiver account or IFSC not found';
  END IF;

  
  
  IF p_from_account_id = v_to_account_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot transfer to the same account';
  END IF;

  
  START TRANSACTION;

  
  
  
  
  IF p_from_account_id < v_to_account_id THEN
    SET v_lower_id = p_from_account_id;
    SET v_upper_id = v_to_account_id;
  ELSE
    SET v_lower_id = v_to_account_id;
    SET v_upper_id = p_from_account_id;
  END IF;

  
  SELECT balance, status INTO v_dummy_balance, v_dummy_status
  FROM account WHERE account_id = v_lower_id FOR UPDATE;

  
  SELECT balance, status INTO v_dummy_balance, v_dummy_status
  FROM account WHERE account_id = v_upper_id FOR UPDATE;

  
  
  
  SELECT customer_id, status, balance
  INTO v_from_owner, v_from_status, v_from_balance
  FROM account WHERE account_id = p_from_account_id;

  
  IF v_from_owner <> p_customer_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Account does not belong to this customer';
  END IF;

  
  IF v_from_status <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Sender account is frozen';
  END IF;

  
  SELECT status INTO v_to_status
  FROM account WHERE account_id = v_to_account_id;

  
  IF v_to_status <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Receiver account is frozen';
  END IF;

  
  
  IF v_from_balance < p_amount THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Insufficient balance';
  END IF;

  
  INSERT INTO txn (reference_no, from_account_id, to_account_id, receiver_name,
                   amount, mode, txn_type, remarks)
  VALUES (
    'TMP',
    p_from_account_id,
    v_to_account_id,
    p_receiver_name,
    p_amount,
    p_mode,
    'TRANSFER',
    p_remarks
  );

  SET v_txn_id = LAST_INSERT_ID();

  UPDATE txn
  SET reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'))
  WHERE txn_id = v_txn_id;

  
  SET @current_txn_id = v_txn_id;

  
  
  
  UPDATE account SET balance = balance - p_amount WHERE account_id = p_from_account_id;
  UPDATE account SET balance = balance + p_amount WHERE account_id = v_to_account_id;

  SET @current_txn_id = NULL;

  
  SET p_reference_no = CONCAT('MF', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(v_txn_id, 6, '0'));

  
  COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `v_applications`
--

/*!50001 DROP VIEW IF EXISTS `v_applications`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50001 VIEW `v_applications` AS select 'LOAN' AS `application_type`,`loan`.`loan_id` AS `application_id`,`loan`.`customer_id` AS `customer_id`,`loan`.`account_id` AS `account_id`,concat('Loan of ???',`loan`.`amount`,' for ',`loan`.`purpose`) AS `details`,`loan`.`status` AS `status`,`loan`.`applied_on` AS `applied_on` from `loan` union all select `service_request`.`request_type` AS `application_type`,`service_request`.`request_id` AS `application_id`,`service_request`.`customer_id` AS `customer_id`,`service_request`.`account_id` AS `account_id`,concat(`service_request`.`request_type`,' request') AS `details`,`service_request`.`status` AS `status`,`service_request`.`requested_on` AS `applied_on` from `service_request` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-05 17:30:25


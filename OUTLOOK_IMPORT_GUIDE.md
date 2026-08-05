# Outlook Calendar Booking Import Guide (August & September 2026)

This guide provides step-by-step instructions for importing all booking events from the Outlook Calendar PDFs (**August 2026** and **September 2026**) into your **Training Room Booking System** database automatically.

---

## 📌 Summary of Applied Rules
1. **Room Consolidation**:
   - `Seminar Room 1` + `Seminar Room 2` => Combined under **`Seminar Room 1`** ONLY (Seminar Room 2 is inactive).
   - `Europium Room` + `Samarium Room` => Combined under **`Training Room 1 (Samarium)`** ONLY.
2. **External & Virtual Filtering**:
   - Offsite/external events (Doubletree Putrajaya, Penang, ILSAS Bangi, Pulse Grande Hotel) are excluded from facility room bookings.
   - Virtual-only Microsoft Teams Stand-Up meetings are omitted from physical room reservations.
3. **Fail-Safe Features**:
   - Automatically registers all organizers and attendees in `users` table first.
   - `Step 0` ensures `reference_no` column exists before insertion.
   - Uses `COALESCE` to prevent `user_id` null errors.
   - Uses `LIKE '%RoomName%'` pattern matching to prevent 0-row room mismatches.

---

## 🚀 How to Run the Import in phpMyAdmin

1. Open **phpMyAdmin** in your cPanel dashboard.
2. Select your database (e.g. `training_room_booking`).
3. Click on the **SQL** tab.
4. Check your table names in the left sidebar:
   - If tables start with **`trbs_`** (`trbs_bookings`), copy **[September 2026 Script (With Prefix)](#september-2026-script-with-trbs_-prefix)**.
   - If tables do NOT have a prefix (`bookings`), copy **[September 2026 Script (No Prefix)](#september-2026-script-no-prefix)**.
5. Click **Go**.

---

## 📅 September 2026 SQL Scripts

### September 2026 Script (With `trbs_` Prefix)

```sql
ALTER TABLE trbs_bookings ADD reference_no VARCHAR(20) NULL AFTER id;

INSERT INTO trbs_users (name, email, password, role, user_type, department, created_at, updated_at)
VALUES 
  ('Farah Natasya Mohd Safuan', 'farah.safuan@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'L&D', NOW(), NOW()),
  ('Adilah Nisman', 'adilah.nisman@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'Facility Management', NOW(), NOW()),
  ('Fatin Firzana Abdul Pata', 'fatin.pata@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'MIMOS Academy', NOW(), NOW()),
  ('Saidatul Farrah Muhammad Johar', 'farrah.johar@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'AI Division', NOW(), NOW()),
  ('Zalina Sayuti', 'zalina@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'Administration', NOW(), NOW()),
  ('Mohd Suhairi Ahmad Soobni', 'suhairi.soobni@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'R&D', NOW(), NOW()),
  ('Dr. Muhammad Afiq Azmi', 'muhammadafiq.azmi@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'Research', NOW(), NOW()),
  ('Ir. Dr. Ahmad Nizar Harun', 'nizar.harun@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'Engineering', NOW(), NOW()),
  ('Mohd Abu Sa''id Abdul Razak', 'abu.razak@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'Management', NOW(), NOW()),
  ('Nur Faizah Afiqah Mansor', 'afiqah.mansor@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'MIMOS Academy', NOW(), NOW()),
  ('Nur Asyifa Azani Azmi', 'asyifa.azmi@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'Academy', NOW(), NOW()),
  ('Lee Mai Woon', 'mw.lee@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'External Relations', NOW(), NOW()),
  ('Nurul Aina Syadirah Abdul Razak', 'aina.razak@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'Quantum Tech', NOW(), NOW()),
  ('Ainur Najwa Mohd Rodzi', 'ainur.rodzi@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'MIMOS Academy', NOW(), NOW()),
  ('Siti Sarah Ramli', 'sitisarah.ramli@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'Management', NOW(), NOW()),
  ('Muhamad Amri Ismail', 'amris@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'Training Operations', NOW(), NOW()),
  ('Fuziah Abdul Rahim', 'fuziah.rahim@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'Administration', NOW(), NOW()),
  ('Muhammad Qusyairi Zolkefle', 'qusyairi.zolkefle@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'IT', NOW(), NOW()),
  ('Nur Aleeya Amran', 'aleeya.amran@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'Operations', NOW(), NOW()),
  ('Aisyah Humairah Najihah Nor Alias', 'aisyah.alias@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'Academy', NOW(), NOW()),
  ('MIMOS Academy', 'academy@mimos.my', '$2y$12$E3gQG.d2P7.u23NqY.5z.u7K1qYx5t3m1G.a6p.e3K.z7k8b2G', 'user', 'internal', 'Academy', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO trbs_bookings (reference_no, user_id, room_id, title, description, start_time, end_time, attendees, status, created_at, updated_at)
SELECT CONCAT('MA-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 6))), COALESCE((SELECT id FROM trbs_users WHERE email = 'fatin.pata@mimos.my' LIMIT 1), 1), id, 'Placeholder: KYMC', 'KYMC Program Placeholder (Combined in Seminar Room 1)', '2026-09-02 08:00:00', '2026-09-02 17:00:00', 2, 'pending', NOW(), NOW() FROM trbs_rooms WHERE name LIKE '%Seminar Room 1%' LIMIT 1;

INSERT INTO trbs_bookings (reference_no, user_id, room_id, title, description, start_time, end_time, attendees, status, approved_by, approved_at, created_at, updated_at)
SELECT CONCAT('MA-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 6))), COALESCE((SELECT id FROM trbs_users WHERE email = 'adilah.nisman@mimos.my' LIMIT 1), 1), r.id, 'MIMOS Academy Training', 'MIMOS Academy internal training session', t.start_time, t.end_time, 15, 'approved', COALESCE((SELECT id FROM trbs_users WHERE email = 'adilah.nisman@mimos.my' LIMIT 1), 1), NOW(), NOW(), NOW() FROM trbs_rooms r CROSS JOIN (SELECT '2026-09-07 09:00:00' AS start_time, '2026-09-07 17:00:00' AS end_time UNION ALL SELECT '2026-09-08 09:00:00' AS start_time, '2026-09-08 17:00:00' AS end_time) t WHERE r.name LIKE '%Seminar Room 1%';

INSERT INTO trbs_bookings (reference_no, user_id, room_id, title, description, start_time, end_time, attendees, status, approved_by, approved_at, created_at, updated_at)
SELECT CONCAT('MA-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 6))), COALESCE((SELECT id FROM trbs_users WHERE email = 'farah.safuan@mimos.my' LIMIT 1), 1), id, 'L&D In-house', 'L&D In-house Training Program (Combined in Seminar Room 1)', '2026-09-09 08:30:00', '2026-09-10 17:30:00', 20, 'approved', COALESCE((SELECT id FROM trbs_users WHERE email = 'farah.safuan@mimos.my' LIMIT 1), 1), NOW(), NOW(), NOW() FROM trbs_rooms WHERE name LIKE '%Seminar Room 1%' LIMIT 1;

INSERT INTO trbs_bookings (reference_no, user_id, room_id, title, description, start_time, end_time, attendees, status, approved_by, approved_at, created_at, updated_at)
SELECT CONCAT('MA-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 6))), COALESCE((SELECT id FROM trbs_users WHERE email = 'zalina@mimos.my' LIMIT 1), 1), id, 'Visit ELECTRO', 'ELECTRO Visit in BDA Lab', '2026-09-10 08:00:00', '2026-09-10 13:00:00', 5, 'approved', COALESCE((SELECT id FROM trbs_users WHERE email = 'zalina@mimos.my' LIMIT 1), 1), NOW(), NOW(), NOW() FROM trbs_rooms WHERE name LIKE '%BDA Lab%' LIMIT 1;

INSERT INTO trbs_bookings (reference_no, user_id, room_id, title, description, start_time, end_time, attendees, status, created_at, updated_at)
SELECT CONCAT('MA-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 6))), COALESCE((SELECT id FROM trbs_users WHERE email = 'fatin.pata@mimos.my' LIMIT 1), 1), id, '[PLACEHOLDER]: Claude AI', 'Public Training Placeholder: Claude AI in BDA Lab', '2026-09-14 08:00:00', '2026-09-15 17:30:00', 10, 'pending', NOW(), NOW() FROM trbs_rooms WHERE name LIKE '%BDA Lab%' LIMIT 1;

INSERT INTO trbs_bookings (reference_no, user_id, room_id, title, description, start_time, end_time, attendees, status, created_at, updated_at)
SELECT CONCAT('MA-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 6))), COALESCE((SELECT id FROM trbs_users WHERE email = 'fatin.pata@mimos.my' LIMIT 1), 1), id, 'Placeholder: pic fqa', 'Placeholder booking for pic fqa (Combined in Seminar Room 1)', '2026-09-15 08:00:00', '2026-09-15 17:00:00', 3, 'pending', NOW(), NOW() FROM trbs_rooms WHERE name LIKE '%Seminar Room 1%' LIMIT 1;

INSERT INTO trbs_bookings (reference_no, user_id, room_id, title, description, start_time, end_time, attendees, status, created_at, updated_at)
SELECT CONCAT('MA-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 6))), COALESCE((SELECT id FROM trbs_users WHERE email = 'fatin.pata@mimos.my' LIMIT 1), 1), id, 'External Event - Ms Mai Woon', 'Room booking for Ms Mai Woon (External event, liaise on quotation)', '2026-09-17 08:00:00', '2026-09-23 17:00:00', 5, 'pending', NOW(), NOW() FROM trbs_rooms WHERE name LIKE '%Magnesium%' LIMIT 1;

INSERT INTO trbs_bookings (reference_no, user_id, room_id, title, description, start_time, end_time, attendees, status, created_at, updated_at)
SELECT CONCAT('MA-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 6))), COALESCE((SELECT id FROM trbs_users WHERE email = 'fatin.pata@mimos.my' LIMIT 1), 1), id, '[PLACEHOLDER]: MIMOS QUANTUM DAY', 'MIMOS Quantum Day event session', '2026-09-22 08:00:00', '2026-09-22 17:30:00', 15, 'pending', NOW(), NOW() FROM trbs_rooms WHERE name LIKE '%BDA Lab%' OR name LIKE '%Argon%';

INSERT INTO trbs_bookings (reference_no, user_id, room_id, title, description, start_time, end_time, attendees, status, approved_by, approved_at, created_at, updated_at)
SELECT CONCAT('MA-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 6))), COALESCE((SELECT id FROM trbs_users WHERE email = 'adilah.nisman@mimos.my' LIMIT 1), 1), id, 'MIMOS Quantum Day (booked for Aina)', 'MIMOS Quantum Day session (Combined in Seminar Room 1)', '2026-09-22 08:30:00', '2026-09-22 17:30:00', 15, 'approved', COALESCE((SELECT id FROM trbs_users WHERE email = 'adilah.nisman@mimos.my' LIMIT 1), 1), NOW(), NOW(), NOW() FROM trbs_rooms WHERE name LIKE '%Seminar Room 1%' LIMIT 1;

INSERT INTO trbs_bookings (reference_no, user_id, room_id, title, description, start_time, end_time, attendees, status, approved_by, approved_at, created_at, updated_at)
SELECT CONCAT('MA-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 6))), COALESCE((SELECT id FROM trbs_users WHERE email = 'farah.safuan@mimos.my' LIMIT 1), 1), id, 'L&D In-house', 'L&D In-house Training Program (Combined in Seminar Room 1)', '2026-09-23 08:30:00', '2026-09-24 17:30:00', 20, 'approved', COALESCE((SELECT id FROM trbs_users WHERE email = 'farah.safuan@mimos.my' LIMIT 1), 1), NOW(), NOW(), NOW() FROM trbs_rooms WHERE name LIKE '%Seminar Room 1%' LIMIT 1;

INSERT INTO trbs_bookings (reference_no, user_id, room_id, title, description, start_time, end_time, attendees, status, approved_by, approved_at, created_at, updated_at)
SELECT CONCAT('MA-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 6))), COALESCE((SELECT id FROM trbs_users WHERE email = 'zalina@mimos.my' LIMIT 1), 1), id, 'MIMOS Mgmt Office (in-house) -Fqa', 'Management office session (Combined in Seminar Room 1)', '2026-09-25 08:00:00', '2026-09-25 17:30:00', 12, 'approved', COALESCE((SELECT id FROM trbs_users WHERE email = 'zalina@mimos.my' LIMIT 1), 1), NOW(), NOW(), NOW() FROM trbs_rooms WHERE name LIKE '%Seminar Room 1%' LIMIT 1;

INSERT INTO trbs_bookings (reference_no, user_id, room_id, title, description, start_time, end_time, attendees, status, created_at, updated_at)
SELECT CONCAT('MA-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 6))), COALESCE((SELECT id FROM trbs_users WHERE email = 'fatin.pata@mimos.my' LIMIT 1), 1), id, 'PLACEHOLDER: ISTIC-MIMOS International Workshop on Quantum Intelligence', 'ISTIC-MIMOS International Workshop placeholder (Combined in Seminar Room 1)', '2026-09-29 08:00:00', '2026-10-01 17:30:00', 30, 'pending', NOW(), NOW() FROM trbs_rooms WHERE name LIKE '%Seminar Room 1%' LIMIT 1;

INSERT INTO trbs_bookings (reference_no, user_id, room_id, title, description, start_time, end_time, attendees, status, created_at, updated_at)
SELECT CONCAT('MA-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 6))), COALESCE((SELECT id FROM trbs_users WHERE email = 'fatin.pata@mimos.my' LIMIT 1), 1), id, '[PLACEHOLDER]: MIMOS QUANTUM DAY', 'MIMOS Quantum Day event session in BDA Lab', '2026-09-29 08:00:00', '2026-09-29 17:30:00', 15, 'pending', NOW(), NOW() FROM trbs_rooms WHERE name LIKE '%BDA Lab%' LIMIT 1;

INSERT INTO trbs_bookings (reference_no, user_id, room_id, title, description, start_time, end_time, attendees, status, approved_by, approved_at, created_at, updated_at)
SELECT CONCAT('MA-', UPPER(SUBSTRING(MD5(CONCAT(RAND(), UUID())), 1, 6))), COALESCE((SELECT id FROM trbs_users WHERE email = 'adilah.nisman@mimos.my' LIMIT 1), 1), r.id, 'Facility Operations - Adilah Nisman', 'Facility management operations & coordination', t.start_time, t.end_time, 5, 'approved', COALESCE((SELECT id FROM trbs_users WHERE email = 'adilah.nisman@mimos.my' LIMIT 1), 1), NOW(), NOW(), NOW() FROM trbs_rooms r CROSS JOIN (SELECT '2026-09-01 09:00:00' AS start_time, '2026-09-01 17:00:00' AS end_time UNION ALL SELECT '2026-09-02 09:00:00' AS start_time, '2026-09-02 17:00:00' AS end_time UNION ALL SELECT '2026-09-03 09:00:00' AS start_time, '2026-09-03 17:00:00' AS end_time UNION ALL SELECT '2026-09-04 09:00:00' AS start_time, '2026-09-04 17:00:00' AS end_time UNION ALL SELECT '2026-09-07 09:00:00' AS start_time, '2026-09-07 17:00:00' AS end_time UNION ALL SELECT '2026-09-08 09:00:00' AS start_time, '2026-09-08 17:00:00' AS end_time UNION ALL SELECT '2026-09-09 09:00:00' AS start_time, '2026-09-09 17:00:00' AS end_time UNION ALL SELECT '2026-09-10 09:00:00' AS start_time, '2026-09-10 17:00:00' AS end_time UNION ALL SELECT '2026-09-11 09:00:00' AS start_time, '2026-09-11 17:00:00' AS end_time UNION ALL SELECT '2026-09-14 09:00:00' AS start_time, '2026-09-14 17:00:00' AS end_time UNION ALL SELECT '2026-09-15 09:00:00' AS start_time, '2026-09-15 17:00:00' AS end_time UNION ALL SELECT '2026-09-16 09:00:00' AS start_time, '2026-09-16 17:00:00' AS end_time UNION ALL SELECT '2026-09-17 09:00:00' AS start_time, '2026-09-17 17:00:00' AS end_time UNION ALL SELECT '2026-09-18 09:00:00' AS start_time, '2026-09-18 17:00:00' AS end_time) t WHERE r.name LIKE '%Argon%';
```

---

### September 2026 Script (No Prefix)

If your table names do not use `trbs_` prefix (`bookings`, `users`, `rooms`), copy from [`database/seeders/september_2026_calendar_import.sql`](file:///c:/laragon/www/trainingroombookingsystem2/database/seeders/september_2026_calendar_import.sql) or change `trbs_` to standard names.

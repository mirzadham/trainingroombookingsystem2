# MIMOS IT Department Approval Questions - Response Draft

Dear IT Department,

Thank you for your review and feedback regarding the approval of the Training Room Booking System for production release. Please find our responses to your questions below:

---

### 1. Who developed this system?
* **Question:** Who develop this system?
* **Response:** Developed internally by Mirza (mirza.sable@mimos.my) from the MIMOS Academy team.

---

### 2. Where is the system hosted?
* **Question:** Where to host the system?
* **Response:** The system is hosted on a shared hosting server provided by "Yeahhost" (under MIMOS Academy's account).

---

### 3. Is it web-based or app-based?
* **Question:** Is it web based or app based?
* **Response:** It is a web-based application. Specifically, it is built as a modern Single Page Application (SPA) utilizing:
  * **Frontend:** React (React 19, React Router 7) compiled using Vite.
  * **Backend:** Laravel 13 framework running on PHP 8.3 (providing secure RESTful APIs).
  * **Database:** MySQL.
  * **Storage:** Media assets (room images) are securely stored on Cloudflare R2 object storage.

---

### 4. Does it require access from external parties or outside the MIMOS network?
* **Question:** Is it require access from external parties or outside MIMOS network?
* **Rex's Comment:** *Since it’s hosted outside and accessible from Internet directly, if it’s targeting to be using by MIMOS online, it’s advisable that to limit the access from Malaysia public IP only. See if the hosting cloud can be done on the hosting’s firewall control ?*
* **Response:** The system is accessible via the public internet since it is hosted on Yeahhost. Regarding the recommendation to restrict access to Malaysia public IPs, I have looped in my supervisor, **[Supervisor Name] ([Supervisor Email])** (cc'd in this email), to review this recommendation and advise on the next steps.

---

### 5. Does it comply with our security standard?
* **Question:** Is it comply with our security standard?
* **Rex's Comment:** *Although it’s hosted outside of MIMOS network, it’s recommended to do SPA (security posture assessment) to ensure no critical/high vulnerabilities on the system.*
* **Response:** The system is built following industry-standard secure coding practices. We welcome and fully support a Security Posture Assessment (SPA) / vulnerability assessment by the MIMOS IT department. We will cooperate to resolve any critical or high-risk vulnerabilities identified during the assessment prior to production launch.
  For your reference, the following security measures are implemented at the application level:
  * **SQL Injection Prevention:** Built entirely using Laravel's Eloquent ORM, which automatically uses PDO parameter binding for all database queries.
  * **CSRF Protection:** State-changing API routes are protected using Laravel's built-in CSRF validation and Laravel Sanctum cookie-based session protection.
  * **XSS Prevention:** All output rendering on the frontend is handled by React, which automatically escapes content to prevent cross-site scripting (XSS).
  * **Authentication & Authorization:** Secure password hashing using Bcrypt (with 12 rounds). Role-Based Access Control (RBAC) is enforced server-side, strictly separating normal users, administrators, and super-administrators.
  * **Concurrency Protection:** Uses database transactions with row-level locking (pessimistic locking) during the approval stage to prevent race conditions (e.g., double-booking/concurrent approval conflicts).

---

### 6. Who will be the support engineer/team when the system goes live?
* **Question:** Who will be the support engineer/team when the system go live/production in MIMOS/vendor ?
* **Response:** Mirza (mirza.sable@mimos.my) from MIMOS Academy will serve as the primary support engineer for system maintenance, bug fixes, and operational assistance.

---

### 7. Domain name ownership and maintenance?
* **Question:** Domain name “mimos-academy.com” are registered and maintaining by ?
* **Response:** The domain `mimos-academy.com` was registered and is maintained directly by the MIMOS Academy administration team.

---

### 8. Let's Encrypt SSL certificate duration?
* **Question:** The web server has enabled HTTPS. And SSL cert is signed by “let’s encrypt”, this is temporary or long term will be using “let’s encrypt” ?
* **Response:** We plan to use **Let's Encrypt** for the long term, as it provides automated, industry-standard, and widely trusted SSL/TLS certificates (which renew automatically every 90 days with zero manual overhead). However, if MIMOS IT security guidelines mandate a commercial/enterprise SSL certificate (e.g., Sectigo, DigiCert), we can procure and install it using the MIMOS Academy budget.

---

### 9. Budget responsibility?
* **Question:** The server hosting budget, domain name (mimos-academy.com) renewal budget are from MIMOS Academy right ?
* **Response:** Yes, all hosting fees and domain renewal budgets are fully funded by MIMOS Academy.

---

Please let us know if you require any further technical details or want to coordinate the scheduling of the Security Posture Assessment (SPA).

Regards,  
**MIMOS Academy Administration Team**  
MIMOS Berhad
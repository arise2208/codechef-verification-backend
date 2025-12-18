# CodeChef Verification Platform

A secure, OAuth-based system to verify CodeChef accounts and prevent impersonation on competitive-programming platforms.

---

## 🚀 Project Overview

Impersonation on coding platforms (using someone else’s CodeChef handle) is a common issue in contests, college events, and internal leaderboards. This project solves that problem by combining **Google OAuth for identity**, a **manual CodeChef verification workflow**, and **admin moderation**.

The system ensures that:

* Each user is tied to a real Google identity
* Each CodeChef handle is verified only once
* Verification cannot be bypassed by frontend manipulation

---

## 🧠 High-Level Architecture

### Actors

* **User**: Logs in via Google OAuth and verifies their CodeChef account
* **Admin (Super Admin)**: Manually verifies CodeChef submissions
* **Google**: Identity provider
* **Backend**: Enforces security, state machine, and authorization

### Core Idea

> **Identity is handled by Google OAuth.**
> **Skill/ownership is verified via CodeChef submission proof.**
> **Authorization is enforced server-side using HttpOnly cookies.**

---

## 🔐 Authentication & Security Model

### Authentication

* **Google OAuth only** (no email/password login)
* JWT stored in **HttpOnly cookies**
* Cookies are never accessible from JavaScript

### Authorization

* Backend-only authorization checks
* Separate cookies for:

  * `userAccessToken`
  * `adminAccessToken`

### Admin Security

* Single **super-admin** model
* Strong random password stored in `.env`
* Admin login is **rate-limited** to prevent brute force

### Why OAuth-only?

* Eliminates password management complexity
* Reduces attack surface
* Delegates account recovery to Google

---

## 🔄 Verification Workflow (State Machine)

Each user follows a strict backend-enforced state machine:

```
NONE → PENDING → VERIFIED / REJECTED
```

### States Explained

* **NONE**: User logged in but not verified
* **PENDING**: Submission ID provided, waiting for admin review
* **VERIFIED**: CodeChef handle confirmed
* **REJECTED**: Verification failed (user may retry)

State transitions are validated **only on the backend**.

---

## 🛡️ Backend Safety Guards

The backend enforces strict rules:

* CodeChef username can be submitted **only once per attempt**
* Submission ID can be submitted **only after username**
* Password can be set **only after verification**
* Reset is allowed **only when status is REJECTED**

This prevents:

* Skipping steps
* Replaying old requests
* Frontend tampering

---

## 🔑 Password Policy

* Passwords are **optional** and platform-specific
* Used only after verification
* Stored as **bcrypt hashes**

### Why no "Forgot Password"?

The project **intentionally removed password-reset functionality**:

* OAuth already handles account recovery
* Reset flows increase attack surface
* Unused security code is a liability

This decision follows the **Principle of Least Functionality**.

---

## 🧑‍💻 Admin Dashboard

The admin panel allows:

* Viewing pending verification requests
* Verifying or rejecting users
* Revoking verification
* Viewing statistics

Admin actions are protected by:

* HttpOnly cookies
* Rate-limited login
* Backend authorization checks

---

## 🧪 Demo Flow

### User

1. Login with Google
2. Submit CodeChef username
3. Receive verification hex
4. Submit CodeChef solution ID
5. Status becomes **PENDING**

### Admin

6. Login to admin dashboard
7. Review submission
8. Verify user

### User

9. Refresh dashboard
10. Status becomes **VERIFIED**

This demo flow is deterministic and safe.

---

## 🛠️ Tech Stack

* **Backend**: Node.js, Express
* **Database**: MongoDB + Mongoose
* **Auth**: Google OAuth 2.0, JWT
* **Security**: HttpOnly cookies, bcrypt, rate limiting
* **Frontend**: HTML, CSS, Vanilla JavaScript

---

## 📌 Design Decisions (Intentional)

* OAuth-only authentication (no passwords for login)
* Manual verification to prevent cheating
* Single trusted admin model
* Removed unused reset flows to reduce risk

These choices prioritize **security, clarity, and maintainability** over feature bloat.

---

## 🚀 Deployment Notes

For production:

* Use HTTPS
* Set cookies with `secure: true`
* Restrict CORS origins
* Store secrets only in environment variables

---

## ✅ Project Status

✔ Core functionality complete
✔ Security model finalized
✔ Demo-ready
✔ Hackathon / CV-ready

---

## 📄 License

This project is intended for educational and demonstration purposes.

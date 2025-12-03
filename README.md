# CST3144 Express API – Coursework

This project is the backend API for my CST3144 Full Stack coursework.  
It provides REST endpoints for Lessons and Orders, using Node.js, Express and MongoDB Atlas (native driver, no Mongoose).

---

## 🚀 Live API URL
https://cst3144-express-api.onrender.com

---

## 📌 Endpoints

### GET /lessons
Returns all lessons.

### GET /search?query=TERM
Searches lesson topic and location.

### POST /orders
Creates a new order.
Body example:
{
  "name": "Test User",
  "phone": "+44 7000 000000",
  "items": [{ "id": "Art-Hen-70", "qty": 1 }]
}

### PUT /lessons/:id
Updates the `space` value of the selected lesson.

---

##  Database
MongoDB Atlas  
Database: `cst3144`  
Collections:
- `lessons`
- `orders`

---

## Running locally

1. Clone the repo  
2. Create `.env` file:
MONGODB_URI=your-atlas-uri

3. Install packages  
npm install

4. Start the server  
node server.js

Server runs on port **3000** by default (Render overrides to their assigned port).

---

##  Included in submission
- Postman collection  
- MongoDB exports (lessons + orders)  
- Source code  

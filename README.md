# CST3144 Express API

## Endpoints
- GET /lessons
- POST /orders
- PUT /lessons/:id
- GET /images/:file

## Dev
npm install
npm run dev

## curl examples

# health
curl http://127.0.0.1:3000/health

# all lessons
curl http://127.0.0.1:3000/lessons

# place an order
curl -X POST http://127.0.0.1:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","phone":"+44 7000 000000","items":[{"id":"101","qty":1}]}'

# update a lesson (space/price/topic/location allowed)
curl -X PUT http://127.0.0.1:3000/lessons/101 \
  -H "Content-Type: application/json" \
  -d '{"space":4}'


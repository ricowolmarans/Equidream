# Equidream – Horse Supplements Store

Complete e-commerce prototype.

**Stack:** Static HTML/CSS + Plain Node.js Netlify Functions + Turso DB  
**Payments:** Manual EFT  
**Deploy:** Netlify (no CLI required)

---

## Features

### Customer side
- Home page + product listing
- Product detail with **multiple variants** (size, weight, flavour…)
- Shopping cart
- Customer registration & login
- Checkout (login required)
- Manual EFT flow with unique payment reference
- Account page + order history

### Admin side (`/admin`)
- **First login** creates admin email/password and initializes all database tables
- Dashboard with stats
- **Products** – full CRUD + variants + image URL + active/hidden
- **Orders** – view all details, change status: Pending → Paid → Shipped → Completed
- **Users** – list customers, promote/demote admins
- **Settings** – flat shipping rate + bank details for EFT

---

## Environment Variables (set in Netlify UI)

| Variable             | Required | Description                          |
|----------------------|----------|--------------------------------------|
| `TURSO_DATABASE_URL` | Yes      | Turso database URL                   |
| `TURSO_AUTH_TOKEN`   | Yes      | Turso auth token                     |
| `JWT_SECRET`         | Yes      | Long random secret (32+ characters)  |

---

## Deploy steps (web UI only)

1. Create a free database at https://turso.tech → copy URL + token  
2. Go to https://www.netlify.com → **Add new site** → **Deploy manually**  
3. Drag the entire `horse-supplements` folder  
4. **Site configuration → Environment variables** → add the 3 variables above  
5. Trigger a redeploy  
6. Visit `https://your-site.netlify.app/admin`  
7. Create your admin account → you are ready  

---

## Project structure

```
horse-supplements/
├── index.html              Home
├── products.html           Product listing
├── product.html            Product detail + variants
├── cart.html
├── checkout.html           EFT checkout
├── account.html            Login / Register / Orders
├── css/style.css
├── js/
│   ├── main.js
│   ├── cart.js
│   └── admin.js            Full admin SPA
├── admin/index.html
├── netlify/
│   └── functions/
│       ├── db.js
│       ├── status.js
│       ├── setup.js
│       ├── login.js
│       ├── register.js
│       ├── me.js
│       ├── products.js
│       ├── product.js
│       ├── create-order.js
│       ├── my-orders.js
│       ├── settings.js
│       ├── admin-products.js
│       ├── admin-orders.js
│       ├── admin-users.js
│       └── admin-settings.js
├── netlify.toml
├── package.json
└── README.md
```

---

## Typical workflow after deploy

1. `/admin` → create admin account  
2. Admin → **Settings** → enter your bank details + shipping rate  
3. Admin → **Products** → add horse supplements + variants  
4. Customers register, browse, add to cart, checkout  
5. They receive a unique EFT reference  
6. You mark the order **Paid** when the money arrives  
7. Update to **Shipped** → **Completed**

---

Ready to deploy.

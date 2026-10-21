#  PaisaVedh — AI-Powered Personal Finance

> Smart financial management platform with AI insights.

🔗 **Live Demo:** [https://paisavedh.vercel.app](https://paisavedh.vercel.app)

---

## About

**PaisaVedh** is a smart personal finance platform that helps you track your money, understand your spending, and make better financial decisions with the help of AI-powered insights.

---

##  Features

<!-- Edit this list to match what your app actually does -->
- 📊 Dashboard with a clear overview of your finances
- 💸 Income & expense tracking
- 🗂️ Category-wise transaction management
- 🎯 Budgeting and savings goals
- 🤖 AI-powered insights and suggestions
- 📈 Charts and analytics
- 🔐 Secure user authentication
- 📱 Fully responsive design

---

## 🛠️ Tech Stack

<!-- Replace with your actual stack -->

| Layer      | Technology                         |
|------------|------------------------------------|
| Frontend   | React / Next.js, Tailwind CSS      |
| Backend    | Node.js, Express                   |
| Database   | MongoDB                            |
| AI         | _(e.g. Gemini / OpenAI / Groq API)_|
| Deployment | Vercel                             |

---

##  Screenshots

<!-- Add your screenshots to a /screenshots folder and link them -->
| Dashboard | Transactions |
|-----------|--------------|
| ![Dashboard](./screenshots/dashboard.png) | ![Transactions](./screenshots/transactions.png) |

---

##  Project Structure

```
smart-finance-PaisaVedh/
├── client/          # Frontend application
├── server/          # Backend API
├── .gitignore
└── README.md
```

<!-- Update to match your real folder structure -->

---

##  Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm or yarn
- A MongoDB database (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aryan-7050/smart-finance-PaisaVedh.git
   cd smart-finance-PaisaVedh
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd client
   npm install

   # Backend
   cd ../server
   npm install
   ```

3. **Set up environment variables** (see below)

4. **Run the app**
   ```bash
   # Start backend
   cd server
   npm run dev

   # Start frontend (new terminal)
   cd client
   npm run dev
   ```

5. Open **http://localhost:3000** in your browser.

---

##  Environment Variables

Create a `.env` file in the `server` folder:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
AI_API_KEY=your_ai_provider_api_key
```

And in the `client` folder (if needed):

```env
VITE_API_URL=http://localhost:5000
```

>  Never commit your `.env` file to GitHub.

---

##  Deployment

The frontend is deployed on **Vercel**: [paisavedh.vercel.app](https://paisavedh.vercel.app)

---

##  Contributing

Contributions are welcome!

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

##  License

This project is licensed under the [MIT License](LICENSE).

---
##  Author

**Aryan**
- GitHub: [@aryan-7050](https://github.com/aryan-7050)

---

⭐ If you found this project useful, please give it a star!

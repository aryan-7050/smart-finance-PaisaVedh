import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from './store/auth.store'

// Pages
import Hero from './components/Hero'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Analytics from './pages/Analytics'
import Savings from './pages/Savings'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Profile from './pages/Profile'

// Components
import Layout from './components/common/Layout'

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, token } = useAuthStore()

  if (!isAuthenticated && !token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, token } = useAuthStore()

  // If authenticated, redirect to dashboard (not hero)
  if (isAuthenticated && token) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

function App() {
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <Router>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Hero Page - Always shows first when not logged in */}
          <Route path="/" element={
            <PublicRoute>
              <motion.div
                key="hero"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Hero />
              </motion.div>
            </PublicRoute>
          } />

          {/* Login Page */}
          <Route path="/login" element={
            <PublicRoute>
              <motion.div
                key="login"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
                transition={{ duration: 0.3 }}
              >
                <Login />
              </motion.div>
            </PublicRoute>
          } />

          {/* Register Page */}
          <Route path="/register" element={
            <PublicRoute>
              <motion.div
                key="register"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
                transition={{ duration: 0.3 }}
              >
                <Register />
              </motion.div>
            </PublicRoute>
          } />

          {/* Profile Page - Protected */}
          <Route path="/profile" element={
            <PrivateRoute>
              <Layout>
                <motion.div
                  key="profile"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={{ duration: 0.3 }}
                >
                  <Profile />
                </motion.div>
              </Layout>
            </PrivateRoute>
          } />

          {/* Settings Page - Protected */}
          <Route path="/settings" element={
            <PrivateRoute>
              <Layout>
                <motion.div
                  key="settings"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={{ duration: 0.3 }}
                >
                  <Settings />
                </motion.div>
              </Layout>
            </PrivateRoute>
          } />

          {/* Dashboard - Protected */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Layout>
                <motion.div
                  key="dashboard"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={{ duration: 0.3 }}
                >
                  <Dashboard />
                </motion.div>
              </Layout>
            </PrivateRoute>
          } />

          {/* Transactions - Protected */}
          <Route path="/transactions" element={
            <PrivateRoute>
              <Layout>
                <motion.div
                  key="transactions"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={{ duration: 0.3 }}
                >
                  <Transactions />
                </motion.div>
              </Layout>
            </PrivateRoute>
          } />

          {/* Budgets - Protected */}
          <Route path="/budgets" element={
            <PrivateRoute>
              <Layout>
                <motion.div
                  key="budgets"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={{ duration: 0.3 }}
                >
                  <Budgets />
                </motion.div>
              </Layout>
            </PrivateRoute>
          } />

          {/* Analytics - Protected */}
          <Route path="/analytics" element={
            <PrivateRoute>
              <Layout>
                <motion.div
                  key="analytics"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={{ duration: 0.3 }}
                >
                  <Analytics />
                </motion.div>
              </Layout>
            </PrivateRoute>
          } />

          {/* Savings - Protected */}
          <Route path="/savings" element={
            <PrivateRoute>
              <Layout>
                <motion.div
                  key="savings"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={{ duration: 0.3 }}
                >
                  <Savings />
                </motion.div>
              </Layout>
            </PrivateRoute>
          } />

          {/* Reports - Protected */}
          <Route path="/reports" element={
            <PrivateRoute>
              <Layout>
                <motion.div
                  key="reports"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={{ duration: 0.3 }}
                >
                  <Reports />
                </motion.div>
              </Layout>
            </PrivateRoute>
          } />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Router>
  )
}

export default App
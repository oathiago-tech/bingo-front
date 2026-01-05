
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Purchase from './Purchase.jsx'
import MobileBingo from './MobileBingo.jsx'
import './index.css'

const Home = () => {
    // Detecta se é mobile (largura < 768px)
    const isMobile = window.innerWidth < 768;
    return isMobile ? <MobileBingo /> : <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/purchase" element={<Purchase />} />
            </Routes>
        </BrowserRouter>
    </React.StrictMode>,
)
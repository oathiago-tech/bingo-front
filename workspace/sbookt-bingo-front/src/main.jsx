import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import MobileBingo from './MobileBingo.jsx';
import Purchase from './Purchase.jsx';
import RaffleAdmin from './RaffleAdmin.jsx';

// Wrapper para redirecionamento mobile
function MobileRedirect({ children }) {
    const [isMobile, setIsMobile] = useState(null);

    useEffect(() => {
        const ua = navigator.userAgent;
        setIsMobile(/Mobi|Android|iPhone|iPad|iPod/i.test(ua));
    }, []);

    if (isMobile === null) return null; // ainda não determinou
    if (isMobile) return <Navigate to="/mobile" replace />;
    return children;
}

const router = createBrowserRouter([
    {
        path: "/",
        element: <MobileRedirect><App /></MobileRedirect>
    },
    {
        path: "/mobile",
        element: <MobileBingo />
    },
    {
        path: "/purchase",
        element: <Purchase />
    },
    {
        path: "/admin",
        element: <RaffleAdmin />
    }
]);

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>
);

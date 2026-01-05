import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import MobileBingo from './MobileBingo.jsx'
import Purchase from './Purchase.jsx'
import RaffleAdmin from './RaffleAdmin.jsx'

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
    },
    {
        path: "/mobile",
        element: <MobileBingo />,
    },
    {
        path: "/purchase",
        element: <Purchase />,
    },
    {
        path: "/admin",
        element: <RaffleAdmin />,
    }
]);

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>,
)
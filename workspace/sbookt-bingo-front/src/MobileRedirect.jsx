import { Navigate } from 'react-router-dom';

const MobileRedirect = ({ children }) => {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);

    if (isMobile) {
        return <Navigate to="/mobile" replace />;
    }

    return children;
};

export default MobileRedirect;

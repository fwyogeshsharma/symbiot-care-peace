import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-gray-600 dark:text-gray-400">{t('notFound.title')}</p>
          <p className="mb-6 text-gray-500 dark:text-gray-500">{t('notFound.message')}</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/')}>
              {t('notFound.goHome')}
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>
              {t('notFound.goBack')}
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;

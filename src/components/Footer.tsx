import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Facebook, Linkedin, Instagram } from 'lucide-react';

// Custom X (Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">{t('common.symbiot')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('footer.tagline')}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4" />
              <a
                href="mailto:symbiot.doc@gmail.com"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                symbiot.doc@gmail.com
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('nav.pricing')}
                </Link>
              </li>
              <li>
                <Link to="/investor-info" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('nav.investorInfo')}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.faq', { defaultValue: 'FAQ' })}
                </Link>
              </li>
              {/*<li>*/}
              {/*  <Link to="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">*/}
              {/*    {t('nav.dashboard')}*/}
              {/*  </Link>*/}
              {/*</li>*/}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('footer.legal')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.termsOfService')}
                </Link>
              </li>
              <li>
                <Link to="/liability-disclaimer" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.liabilityDisclaimer')}
                </Link>
              </li>
              <li>
                <Link to="/cookie-policy" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.cookiePolicy')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('footer.followUs')}</h3>
            <div className="flex gap-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="X (formerly Twitter)"
              >
                <XIcon className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            © {currentYear} {t('common.symbiot')}. {t('footer.allRightsReserved')} {t('footer.version')}
          </p>
        </div>
      </div>
    </footer>
  );
};

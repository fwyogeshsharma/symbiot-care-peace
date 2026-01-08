import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ExternalLink, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface CompanyDeviceType {
  companyId: string;
  companyName: string;
  companyWebsite: string | null;
  deviceTypeName: string;
  deviceTypeCategory: string;
  price: string | null;
}

const SupportedDevices = () => {
  const { t } = useTranslation();

  // Map company names to their logo files in the public folder
  const getCompanyLogo = (companyName: string): string => {
    const logoMap: { [key: string]: string } = {
      'apple': '/apple.png',
      'fitbit': '/fitbit.png',
      'philips': '/philips.webp',
      'purple air': '/purple air.png',
      'purpleair': '/purple air.png',
      'ring': '/ring.png',
      'withings': '/withings_logo.jfif',
    };

    const key = companyName.toLowerCase();
    return logoMap[key] || '';
  };

  // Fetch companies with their device types
  const { data: companyDeviceTypes, isLoading, error } = useQuery({
    queryKey: ['supported-device-companies'],
    queryFn: async () => {
      // Filter to only show specific companies
      const allowedCompanies = ['apple', 'fitbit', 'ring', 'withings', 'philips', 'purple air', 'purpleair'];

      // First, get all active companies
      const { data: companies, error: companiesError } = await supabase
        .from('device_companies')
        .select('id, name, website')
        .eq('is_active', true);

      if (companiesError) throw companiesError;

      // Filter to only allowed companies
      const filteredCompanies = companies?.filter((company) =>
        allowedCompanies.some(allowed =>
          company.name.toLowerCase().includes(allowed)
        )
      ) || [];

      if (filteredCompanies.length === 0) return [];

      const companyIds = filteredCompanies.map(c => c.id);

      // Get device models for these companies with device type information
      const { data: models, error: modelsError } = await supabase
        .from('device_models')
        .select(`
          company_id,
          specifications,
          device_types!inner(name, category)
        `)
        .in('company_id', companyIds)
        .eq('is_active', true);

      if (modelsError) throw modelsError;

      // Build the result array
      const result: CompanyDeviceType[] = [];

      models?.forEach((model: any) => {
        const company = filteredCompanies.find(c => c.id === model.company_id);
        if (company && model.device_types) {
          // Extract price from specifications JSON if it exists
          let price: string | null = null;
          if (model.specifications && typeof model.specifications === 'object') {
            price = model.specifications.price || null;
          }

          // Override for specific companies
          let finalPrice = price;
          let finalWebsite = company.website;

          if (company.name.toLowerCase().includes('withings')) {
            finalPrice = '$100 - $600';
            finalWebsite = 'https://www.withings.com/in/en/';
          } else if (company.name.toLowerCase().includes('apple')) {
            finalPrice = '$249 - $1,399';
            finalWebsite = 'https://www.apple.com/in/watch/';
          } else if (company.name.toLowerCase().includes('fitbit')) {
            finalPrice = '$79 - $299';
            finalWebsite = 'https://store.google.com/category/watches_trackers';
          } else if (company.name.toLowerCase().includes('philips')) {
            finalPrice = '$150 - $350';
            finalWebsite = 'https://dynalite.com/solution/environmental-monitoring/';
          } else if (company.name.toLowerCase().includes('ring')) {
            finalPrice = '$49.99 - $249.99';
            finalWebsite = 'https://ring.com/video-doorbell-cameras';
          } else if (company.name.toLowerCase().includes('purple')) {
            finalPrice = '$139 - $299';
          }

          result.push({
            companyId: company.id,
            companyName: company.name,
            companyWebsite: finalWebsite,
            deviceTypeName: model.device_types.name,
            deviceTypeCategory: model.device_types.category,
            price: finalPrice,
          });
        }
      });

      // Sort by company name, then by device type name
      result.sort((a, b) => {
        const companyCompare = a.companyName.localeCompare(b.companyName);
        if (companyCompare !== 0) return companyCompare;
        return a.deviceTypeName.localeCompare(b.deviceTypeName);
      });

      return result;
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            {t('supportedDevices.title', { defaultValue: 'Supported Devices' })}
          </h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <p className="text-lg text-muted-foreground">
            {t('supportedDevices.subtitle', {
              defaultValue: 'Symbiot supports devices from leading manufacturers to help you monitor and care for your loved ones.'
            })}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive mb-6">
            {t('common.errorLoadingData', { defaultValue: 'Error loading data. Please try again later.' })}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : companyDeviceTypes && companyDeviceTypes.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold w-20">
                    {t('supportedDevices.logo', { defaultValue: 'Logo' })}
                  </TableHead>
                  <TableHead className="font-semibold">
                    {t('supportedDevices.company', { defaultValue: 'Company' })}
                  </TableHead>
                  <TableHead className="font-semibold">
                    {t('supportedDevices.deviceType', { defaultValue: 'Device Type' })}
                  </TableHead>
                  <TableHead className="font-semibold">
                    {t('supportedDevices.price', { defaultValue: 'Price' })}
                  </TableHead>
                  <TableHead className="font-semibold">
                    {t('supportedDevices.link', { defaultValue: 'Link' })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyDeviceTypes.map((item, index) => {
                  const logoPath = getCompanyLogo(item.companyName);
                  return (
                  <TableRow key={index} className="hover:bg-muted/30">
                    <TableCell>
                      {logoPath ? (
                        <img
                          src={logoPath}
                          alt={item.companyName}
                          className="w-12 h-12 object-contain"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.companyName}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.deviceTypeName}</div>
                        <div className="text-sm text-muted-foreground">{item.deviceTypeCategory}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.price ? (
                        <span className="font-medium">{item.price}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {t('supportedDevices.contactForPricing', { defaultValue: 'Contact for pricing' })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.companyWebsite ? (
                        <a
                          href={item.companyWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          {t('common.visitWebsite', { defaultValue: 'Visit Website' })}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">
                          {t('common.notAvailable', { defaultValue: 'N/A' })}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-lg text-muted-foreground">
              {t('supportedDevices.noDevices', { defaultValue: 'No supported devices found.' })}
            </p>
          </div>
        )}

        <div className="mt-12 p-6 bg-primary/5 border border-primary/20 rounded-lg">
          <h3 className="text-xl font-bold mb-2">
            {t('supportedDevices.needHelp', { defaultValue: 'Need Help?' })}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t('supportedDevices.helpMessage', {
              defaultValue: 'If you have questions about device compatibility or need assistance setting up your devices, please contact our support team.'
            })}
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild>
              <a href="mailto:symbiot.doc@gmail.com">
                {t('common.contactSupport', { defaultValue: 'Contact Support' })}
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard">
                {t('common.goToDashboard', { defaultValue: 'Go to Dashboard' })}
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SupportedDevices;

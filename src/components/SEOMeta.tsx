import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from '../lib/apiClient';

interface SEOMetaProps {
  pageKey: string;
  defaultTitle?: string;
  defaultDescription?: string;
}

export default function SEOMeta({ pageKey, defaultTitle = 'CareerForge AI', defaultDescription }: SEOMetaProps) {
  const [seo, setSeo] = useState<any>(null);
  const [globalFavicon, setGlobalFavicon] = useState<string | null>(null);

  useEffect(() => {
    // Fetch page SEO
    apiClient.get(`/api/public/seo/${pageKey}`).then(res => {
      setSeo(res.data);
    }).catch(() => {
      // ignore - SEO data is optional
    });

    // Fetch global settings
    apiClient.get(`/api/public/seo/settings`).then(res => {
      setGlobalFavicon(res.data.globalFavicon);
    }).catch(() => {
      // ignore - global settings are optional
    });
  }, [pageKey]);

  const title = seo?.title || defaultTitle;
  const description = seo?.description || defaultDescription;
  const canonicalUrl = seo?.canonicalUrl;
  const robots = seo?.robots;
  const favicon = seo?.favicon || globalFavicon;
  const ogTitle = seo?.ogTitle || title;
  const ogDescription = seo?.ogDescription || description;
  const ogImage = seo?.ogImage;
  const twitterTitle = seo?.twitterTitle || title;
  const twitterDescription = seo?.twitterDescription || description;
  const twitterImage = seo?.twitterImage;
  const keywords = seo?.keywords;
  const schemaJson = seo?.schemaJson;

  return (
    <Helmet>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {robots && <meta name="robots" content={robots} />}
      {favicon && <link rel="icon" href={favicon} />}

      {/* Open Graph */}
      {ogTitle && <meta property="og:title" content={ogTitle} />}
      {ogDescription && <meta property="og:description" content={ogDescription} />}
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      {twitterTitle && <meta name="twitter:title" content={twitterTitle} />}
      {twitterDescription && <meta name="twitter:description" content={twitterDescription} />}
      {twitterImage && <meta name="twitter:image" content={twitterImage} />}

      {/* Structured Data */}
      {schemaJson && (
        <script type="application/ld+json">
          {schemaJson}
        </script>
      )}
    </Helmet>
  );
}

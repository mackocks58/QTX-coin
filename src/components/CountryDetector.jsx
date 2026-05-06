import React, { useEffect, useState } from 'react';

export const useCountry = () => {
  const [countryData, setCountryData] = useState(() => {
    const cached = localStorage.getItem('eaglefx_country');
    return cached ? JSON.parse(cached) : { country: 'Detecting...', countryCode: '', error: null };
  });

  useEffect(() => {
    if (countryData.country !== 'Detecting...' && countryData.country !== 'Global') return;

    fetch('https://get.geojs.io/v1/ip/geo.json')
      .then((res) => {
        if (!res.ok) throw new Error('API Error');
        return res.json();
      })
      .then((data) => {
        const newData = {
          country: data.country,
          countryCode: data.country_code,
          error: null
        };
        setCountryData(newData);
        localStorage.setItem('eaglefx_country', JSON.stringify(newData));
      })
      .catch((err) => {
        setCountryData({
          country: 'Global',
          countryCode: 'GL',
          error: err.message
        });
      });
  }, []);

  return countryData;
};

import { useAuth } from '../contexts/AuthContext';

export const useCurrency = () => {
  const { userData } = useAuth();
  const isTZ = userData?.country === 'Tanzania';
  
  const rate = isTZ ? 2600 : 1;
  const symbol = isTZ ? 'TZS' : '$';

  const formatCurrency = (amountLocal, fractionDigits = 2) => {
    const num = Number(amountLocal) || 0;
    if (isTZ) {
      return `${symbol} ${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } else {
      return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}`;
    }
  };

  const formatSmallCurrency = (amountLocal, maxDigits = 6) => {
    const num = Number(amountLocal) || 0;
    if (isTZ) {
      return `${symbol} ${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: maxDigits > 2 ? 2 : maxDigits })}`;
    } else {
      return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: maxDigits })}`;
    }
  }

  const convertAndFormatCurrency = (amountUSD, fractionDigits = 2) => {
    const converted = (Number(amountUSD) || 0) * rate;
    return formatCurrency(converted, fractionDigits);
  };

  const convertAndFormatSmallCurrency = (amountUSD, maxDigits = 6) => {
    const converted = (Number(amountUSD) || 0) * rate;
    return formatSmallCurrency(converted, maxDigits);
  };

  return { 
    formatCurrency, 
    formatSmallCurrency, 
    convertAndFormatCurrency,
    convertAndFormatSmallCurrency,
    isTZ, 
    rate, 
    symbol 
  };
};

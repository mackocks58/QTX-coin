const fs = require('fs');

const contextPath = 'src/contexts/LanguageContext.jsx';
let contextStr = fs.readFileSync(contextPath, 'utf8');

const enInsert = `
    wealthTitle: 'Wealth',
    cryptoInvestmentsTitle: 'Crypto Investments',
    cryptoInvestmentsDesc: 'Invest in top-performing cryptocurrencies to earn daily income. Your active investments also multiply your Watch-to-Earn movie rewards! Contracts last for 365 days.',
    activeBadge: 'Active',
    contractPeriod: 'Contract Period',
    currentlyActive: 'Currently Active',
    notEligible: 'Not Eligible',
    upgradePay: '⬆ Upgrade — Pay',
    investNow: 'Invest Now',
    upgradeInvestment: '⬆ Upgrade Investment',
    confirmInvestment: 'Confirm Investment',
    miningContract: 'Mining Contract',
    currentPlan: 'Current Plan',
    upgradeCost: 'Upgrade Cost',
    priceLabel: 'Price',
    differenceOnly: '(difference only)',
    contractDuration: 'Contract Duration',
    errDowngrade: 'You cannot downgrade your investment.',
    errAlreadyActive: 'You already have an active ',
    msgInvestingIn: 'Investing in ',
    msgInvestSuccess: 'Successfully invested in ',
    errInvestFailed: 'Failed to invest.',
  },

  pt: {`;

const ptInsert = `
    wealthTitle: 'Patrimônio',
    cryptoInvestmentsTitle: 'Investimentos Crypto',
    cryptoInvestmentsDesc: 'Invista nas criptomoedas de melhor desempenho para lucros diários. Seus planos multiplicam as recompensas de Assistir & Ganhar! Contratos de 365 dias estritos.',
    activeBadge: 'Ativo',
    contractPeriod: 'Período do Contrato',
    currentlyActive: 'Atualmente Ativo',
    notEligible: 'Não Elegível',
    upgradePay: '⬆ Upgrade — Pagar',
    investNow: 'Investir Agora',
    upgradeInvestment: '⬆ Upgrade de Investimento',
    confirmInvestment: 'Confirmar Investimento',
    miningContract: 'Contrato de Mineração',
    currentPlan: 'Plano Atual',
    upgradeCost: 'Custo de Upgrade',
    priceLabel: 'Preço',
    differenceOnly: '(apenas a diferença)',
    contractDuration: 'Duração do Contrato',
    errDowngrade: 'Você não pode fazer downgrade do seu investimento.',
    errAlreadyActive: 'Você já possui um plano ativo de ',
    msgInvestingIn: 'Investindo em ',
    msgInvestSuccess: 'Investimento realizado com sucesso em ',
    errInvestFailed: 'Falha ao investir.',
  },
};`;

contextStr = contextStr.replace(/  \},[\s\n]*pt: \{/, enInsert);
contextStr = contextStr.replace(/  \},[\s\n]*\};[\s\n]*const LanguageContext/, ptInsert + '\n\nconst LanguageContext');
fs.writeFileSync(contextPath, contextStr);

const wealthPath = 'src/pages/Wealth.jsx';
let wStr = fs.readFileSync(wealthPath, 'utf8');

// Replace strings
wStr = wStr.replace("<h2>Wealth</h2>", "<h2>{t('wealthTitle')}</h2>");
wStr = wStr.replace("<h3>Crypto Investments</h3>", "<h3>{t('cryptoInvestmentsTitle')}</h3>");
wStr = wStr.replace("Invest in top-performing cryptocurrencies to earn daily income. Your active investments also multiply your Watch-to-Earn movie rewards! Contracts last for 365 days.", "{t('cryptoInvestmentsDesc')}");
wStr = wStr.replace("> Active\n", "> {t('activeBadge')}\n");
wStr = wStr.replace("Investment Amount", "{t('investmentAmount')}");
wStr = wStr.replace(">Daily Income<", ">{t('dailyIncome')}<");
wStr = wStr.replace("Contract Period", "{t('contractPeriod')}");
wStr = wStr.replace("365 Days", "{t('days365')}");

wStr = wStr.replace("'Processing...'", "t('processing')");
wStr = wStr.replace("Currently Active", "{t('currentlyActive')}");
wStr = wStr.replace("Not Eligible", "{t('notEligible')}");
wStr = wStr.replace("`⬆ Upgrade — Pay ${formatCurrency(upgradeDifference)}`", "`${t('upgradePay')} ${formatCurrency(upgradeDifference)}`");
wStr = wStr.replace("'Invest Now'", "t('investNow')");

wStr = wStr.replace("'⬆ Upgrade Investment'", "t('upgradeInvestment')");
wStr = wStr.replace("'Confirm Investment'", "t('confirmInvestment')");

wStr = wStr.replace("Mining Contract", "{t('miningContract')}");
wStr = wStr.replace("Current Plan", "{t('currentPlan')}");
wStr = wStr.replace("Upgrade Cost", "{t('upgradeCost')}");
wStr = wStr.replace("'Price'", "t('priceLabel')");
wStr = wStr.replace("(difference only)", "{t('differenceOnly')}");
wStr = wStr.replace("Daily Profit", "{t('dailyProfit')}");
wStr = wStr.replace("Contract Duration", "{t('contractDuration')}");

wStr = wStr.replace("Cancel", "{t('cancelBtn')}");
wStr = wStr.replace("{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>\n                    Confirm\n                  </button>", "{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>\n                    {t('confirm')}\n                  </button>");

// Toasts
wStr = wStr.replace("`You already have an active ${plan.name} investment.`", "`{t('errAlreadyActive')} ${plan.name}`");
wStr = wStr.replace("`You cannot downgrade your investment.`", "t('errDowngrade')");
wStr = wStr.replace("toast.loading(`Investing in ${plan.name}...`)", "toast.loading(`${t('msgInvestingIn')} ${plan.name}...`)");
wStr = wStr.replace("toast.success(`Successfully invested in ${plan.name}!`, { id: loadingToast })", "toast.success(`${t('msgInvestSuccess')} ${plan.name}!`, { id: loadingToast })");
wStr = wStr.replace('toast.error(error.message || "Failed to invest.")', 'toast.error(error.message || t("errInvestFailed"))');

fs.writeFileSync(wealthPath, wStr);

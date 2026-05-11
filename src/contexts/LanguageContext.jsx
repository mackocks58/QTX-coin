// @refresh reset
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const translations = {
  en: {
    // ── Language Picker ───────────────────────────────────────────────────────
    selectLanguage: 'Select Language',
    langEnglish: 'English',
    langPortuguese: 'Português',

    // ── Dashboard ─────────────────────────────────────────────────────────────
    totalAssets: 'QTX Coin AI Total Assets',
    miningWallet: 'AI Mining Wallet',
    investmentWallet: 'Investment Wallet',
    profitWallet: 'Profit Wallet',
    recharge: 'Recharge',
    withdraw: 'Withdraw',
    vipBots: 'VIP Bots',
    luckySpin: 'Lucky Spin',
    security: 'Security',
    invite: 'Invite',
    about: 'About',
    myBots: 'My Bots',
    investmentProducts: 'Investment Products',
    earnIncome: 'Earn income immediately',
    certified: 'QTX Coin helps you earn long-term AI mining rewards. Certified',
    footer: '© {year} QTX Coin. All rights reserved.',

    // ── Wallet ────────────────────────────────────────────────────────────────
    walletTitle: 'Wallet',
    depositUsdt: 'Deposit USDT',
    verifyDeposit: 'Verify Deposit',
    expiresIn: 'Expires in:',
    amountPlaceholder: 'Amount (USDT)',
    txidPlaceholder: 'Transaction Hash (TXID)',
    pendingVerification: 'Pending verification...',
    submitting: 'Submitting...',
    verificationInProgress: 'Verification in Progress',
    submitTxid: 'Submit TXID',
    howToDeposit: 'How to Deposit',
    iUnderstand: 'I Understand',
    sendOnlyUsdt: 'Send only USDT ({network}) to this address.',
    depositStep1: 'Open your crypto app (e.g., Binance, Trust Wallet).',
    depositStep2: 'Go to Withdraw and select USDT.',
    depositStep3TRC20: 'Select Network: Tron (TRC20). Wrong network = lost funds!',
    depositStep3BSC: 'Select Network: BNB Smart Chain (BEP20). Wrong network = lost funds!',
    depositStep4: 'Copy our deposit address and paste it into your withdrawal address field.',
    depositStep5: 'Enter the amount and confirm the transfer.',
    depositStep6: 'Once "Completed", locate the Transaction Hash (TXID) in the details.',
    depositStep7: 'Paste Amount and TXID into Verify Deposit and Submit.',

    // ── Withdraw ──────────────────────────────────────────────────────────────
    withdrawTitle: 'Withdraw Funds',
    availableBalance: 'Available Balance',
    noWithdrawAccount: 'No Withdrawal Account',
    noWithdrawAccountDesc: 'You need to bind a withdrawal method before you can request a withdrawal.',
    bindAccountNow: 'Bind Account Now',
    selectWithdrawMethod: 'Select Withdrawal Method',
    amountUsd: 'Amount (USD)',
    minimumAmount: 'Minimum: $10.00',
    fee: 'Fee: 0%',
    submitWithdrawal: 'Submit Withdrawal',
    processing: 'Processing...',
    confirmWithdrawal: 'Confirm Withdrawal',
    withdrawalAmount: 'Withdrawal Amount',
    noFeesApplied: 'No fees applied (0%)',
    transferDetails: 'Transfer Details',
    cancel: 'Cancel',
    confirm: 'Confirm',
    successfullySubmitted: 'Successfully Submitted!',
    withdrawalQueued: 'Your withdrawal has been queued for processing. You can track the status in your transactions history.',
    viewTransactions: 'View Transactions',

    // ── Account ───────────────────────────────────────────────────────────────
    myAccount: 'My Account',
    region: 'Region:',
    joined: 'Joined:',
    deviceSettings: 'Device Settings',
    biometricLogin: 'Biometric Login',
    pushNotifications: 'Push Notifications',
    securityCenter: 'Security Center',
    notifications: 'Notifications',
    eventCenter: 'Event Center',
    faqSupport: 'FAQ & Support',
    bindAccount: 'Bind Account',
    deposit: 'Deposit',
    signOut: 'Sign Out',
    enableBiometrics: 'Enable Biometrics',
    biometricDesc: 'To enable Biometric Login, we need to securely store your password on this device. Please enter your password below.',
    password: 'Password',
    enable: 'Enable',

    // ── Affiliate ─────────────────────────────────────────────────────────────
    affiliateTitle: 'Affiliate Program',
    inviteEarn: 'Invite & Earn Up To 10%',
    affiliateDesc: 'Earn commissions across 3 levels of your network. The more people you invite, the deeper your earnings go!',
    totalEarned: 'Total Earned',
    commissions: 'Commissions',
    commissionStructure: 'Commission Structure',
    perDepositApproved: 'Per deposit approved',
    earned: 'earned',
    howItWorks: 'How It Works',
    affiliateStep1: 'Share your unique referral link with friends.',
    affiliateStep2: 'Your friend registers and deposits any amount.',
    affiliateStep3: 'You instantly earn 10% of their deposit.',
    affiliateStep4: 'When your friend invites others, you earn 3% of their deposits.',
    affiliateStep5: 'Go deeper — earn 1% from Level 3 deposits too!',
    generatingLink: 'Generating link...',

    // ── Notifications ─────────────────────────────────────────────────────────
    notificationsTitle: 'Notifications',
    noNotificationsYet: 'No notifications yet',

    // ── Transactions ──────────────────────────────────────────────────────────
    transactionsTitle: 'Transactions',
    noTransactionsFound: 'No transactions found.',
    back: '← Back',
    downloadPdf: 'Download PDF Receipt',
    generatingPdf: 'Generating PDF...',
    from: 'From',
    to: 'To',
    networkFee: 'Network Fee',
    txHash: 'TX Hash',
    trackingId: 'Tracking ID',
    status: 'Status',
    time: 'Time',
    verified: 'Verified',
    pending: 'Pending',
    failed: 'Failed',
    confirmed: 'Confirmed',
    expiresLabel: 'Expires:',
    receivedSuccessfully: 'Received Successfully',
    depositPending: 'Deposit Pending',
    depositFailed: 'Deposit Failed',
    withdrawalPending: 'Withdrawal Pending',
    withdrawalFailed: 'Withdrawal Failed',

    // ── Security ──────────────────────────────────────────────────────────────
    securityTitle: 'Security Center',
    securitySettings: 'Security Settings',
    changePassword: 'Change Password',
    loginHistory: 'Login History',
    recentLoginActivity: 'Recent Login Activity',
    noRecentLogin: 'No recent login activity found.',
    twoFactor: 'Two-Factor Auth',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm New Password',
    saveChanges: 'Save Changes',
    updatePassword: 'Update Password',
    updating: 'Updating...',

    // ── VIP / MyBots / Spin ───────────────────────────────────────────────────
    vipTitle: 'VIP Trading Bots',
    myBotsTitle: 'My Bots',
    activatedBots: 'Activated Bots',
    availableBots: 'Available Bots',
    activate: 'Activate',
    running: 'Running',
    dailyIncome: 'Daily Income',
    totalProfit: 'Total Profit',
    spinTitle: 'Lucky Spin',
    botMarketplace: '🤖 Bot Marketplace',
    myActiveBots: '⚡ My Active Bots',
    noBotsYet: 'No bots activated yet',
    browseBots: 'Browse Bots →',
    investmentRange: 'Investment Range',
    contract: 'Contract',
    payouts: 'Payouts',
    every24h: 'Every 24h',
    days365: '365 Days',
    botLifecycle: 'Bot Lifecycle (365 Days)',
    daysLeft: 'Days Left',
    activated: 'Activated:',
    tradingAutomatically: 'Trading Automatically…',
    profitsCredited: 'Profits credited to your wallet',
    botExpired: 'Bot Contract Expired',
    botExpiredDesc: 'This bot has completed its 365-day cycle.',
    investmentAmount: 'Investment Amount (USD)',
    totalDeducted: 'Total Deducted',
    dailyReturnRate: 'Daily Return Rate',
    estDailyProfit: 'Est. Daily Profit',
    contractLifecycle: 'Contract Lifecycle',
    payoutCycle: 'Payout Cycle',
    confirmAndPay: 'Confirm & Pay',
    activating: 'Activating…',
    howVipBotsWork: 'How VIP Bots Work',
    botActivation: 'Bot Activation',
    botActivationDesc: 'You can activate a bot by investing an amount within its specified tier range. The invested amount is deducted securely from your primary wallet balance.',
    payouts24h: '24-Hour Payouts',
    payouts24hDesc: 'Once activated, the bot begins trading automatically. Profits are generated and credited directly to your profit wallet every 24 hours based on the bot\'s guaranteed daily percentage.',
    lifecycle365: '365-Day Lifecycle',
    lifecycle365Desc: 'Every bot contract lasts for exactly 365 days. After 365 days, the bot expires and stops generating daily returns.',
    understood: 'Understood',
    howItWorksBtn: 'How it works',
    chooseBot: 'Choose a VIP bot, enter your investment amount, and start earning guaranteed daily income automatically.',
    activateBot: 'Activate',
    cancelBtn: 'Cancel',

    // ── About / FAQ ───────────────────────────────────────────────────────────
    aboutTitle: 'About QTX Coin',
    aboutHero: 'Pioneering the Future of Automated Trading',
    aboutHeroSub: 'Empowering Investors Worldwide',
    faqTitle: 'FAQ & Support',
    faqSearch: 'Search for answers...',
    faqNoResults: 'No answers found for "{term}". Please try a different keyword.',
    comprehensiveFaq: 'Comprehensive FAQ',

    // ── Login ─────────────────────────────────────────────────────────────────
    loginTitle: 'Welcome Back',
    loginSubtitle: 'Sign in to your QTX Coin account',
    email: 'Email Address',
    loginBtn: 'Sign In',
    noAccount: "Don't have an account?",
    registerBtn: 'Register',
    loggingIn: 'Signing In...',
    registerTitle: 'Create Account',
    registerSubtitle: 'Join QTX Coin and start earning',
    alreadyHaveAccount: 'Already have an account?',
    signIn: 'Sign In',
    signInBtn: 'Sign In',
    registerLabel: 'Register',
    registering: 'Creating Account...',
    processing: 'Processing...',
    loginWithBiometrics: 'Login with Biometrics',
    country: 'Country',
    selectCountry: 'Select your country',
    dontHaveAccount: "Don't have an account?",
    signUpLink: 'Sign up',
    alreadyHaveAccountLink: 'Already have an account?',
    signInLink: 'Sign in',

    // ── Common ────────────────────────────────────────────────────────────────
    loading: 'Loading...',
    home: 'Home',
    mining: 'Mining',
    history: 'History',
    team: 'Team',
    me: 'Me',
    liveBalance: 'Live Balance',
    invested: 'Invested',
    operationTime: 'Operation Time',
    hours24: '24 Hours',
    day: 'Day',
    yearFooter: '© {year} QTX Coin. All rights reserved.',
    uidCopied: 'UID copied to clipboard',
    cancelBtn: 'Cancel',
    botActivated: 'activated!',
    activationFailed: 'Activation failed',

    // ── About Section Headings ────────────────────────────────────────────────
    aboutSec1: 'Our Mission & Vision',
    aboutSec2: 'The Technology Behind QTX Coin',
    aboutSec3: 'Global Presence & Compliance',
    aboutSec4: 'Uncompromising Security',
    aboutSec5: 'The VIP Bot Ecosystem',
    aboutSec6: '3-Tier Affiliate Commission System',
    aboutSec7: 'Gamified Rewards: The Lucky Spin',
    aboutSec8: 'Our Community & The Road Ahead',
    aboutFooterTitle: 'QTX Coin AI Global Headquarters',
    aboutFooterSub: 'Established 2020 • All Rights Reserved',
    aboutLevel1: 'Level 1 – Direct Referral',
    aboutLevel2: 'Level 2 – Friend\'s Network',
    aboutLevel3: 'Level 3 – Extended Network',
    aboutL1Example: 'Your friend deposits $500 → You earn $50 instantly.',
    aboutL2Example: 'Your friend\'s contact deposits $1,000 → You earn $30.',
    aboutL3Example: 'Level 2 recruit\'s contact deposits $2,000 → You earn $20.',
    aboutTiersExplained: 'The 3 Tiers Explained:',
    aboutAffiliateInfo: 'All commissions are processed automatically the moment a deposit is approved. There are no caps, no limits, and no delays. Build your network and watch your passive income multiply across all 3 levels.',

    // ── Toast Messages ────────────────────────────────────────────────────────
    // Security
    errFillAllPasswords: 'Please fill in all password fields',
    errPasswordsMismatch: 'New passwords do not match',
    errPasswordTooShort: 'New password must be at least 6 characters',
    errIncorrectPassword: 'Incorrect current password.',
    successPasswordUpdated: 'Password updated successfully!',
    // Login / Auth
    errFillAllFields: 'Please fill in all fields',
    errBiometricFailed: 'Biometric authentication failed',
    successBiometricEnabled: 'Biometric login enabled!',
    successLoggedIn: 'Logged in successfully',
    successAccountCreated: 'Account created successfully',
    errEmailInUse: 'An account with this email already exists.',
    errInvalidCredential: 'Invalid email or password. Please try again.',
    errWeakPassword: 'Your password is too weak. Please use at least 6 characters.',
    errNetworkFailed: 'Network error. Please check your internet connection.',
    errTooManyRequests: 'Too many failed attempts. Please try again later.',
    errInvalidEmail: 'Please enter a valid email address.',
    errAuthFailed: 'Authentication failed. Please try again.',
    successBiometricLogin: 'Logged in successfully',
    // Wallet
    successAddressCopied: 'Address copied to clipboard!',
    successTxSubmitted: 'Transaction submitted! It will be verified automatically within 5 minutes.',
    // Affiliate
    successLinkCopied: 'Referral link copied!',
    // Account
    successPushEnabled: 'Push notifications enabled!',
    errPermissionDenied: 'Permission denied',
    errCouldNotChangePush: 'Could not change push settings',
    successBiometricDisabled: 'Biometric login disabled',
    errFailedDisableBiometrics: 'Failed to disable biometrics',
    errEnterPassword: 'Please enter your password',
    errFailedEnableBiometrics: 'Failed to enable biometrics',
    errSelectImageFile: 'Please select an image file',
    errImageTooLarge: 'Image size must be less than 5MB',
    successProfileUpdated: 'Profile picture updated successfully!',
    errFailedLogout: 'Failed to log out',
    errPhotoCooldown: 'You can change your photo again in {n} days.',
    // VIP
    errInvalidAmount: 'Enter an amount between ${min} and ${max}',
    errInsufficientBalance: 'Insufficient balance. You have ${bal}',
    // Bind Account
    errInvalidBinanceId: 'Please enter a valid Binance ID',
    errInvalidWalletAddress: 'Please enter a valid wallet address',
    errFillMobileDetails: 'Please fill in all mobile account details',
    errEnterPasswordToSave: 'Please enter your login password to securely save changes.',
    errFailedSaveAccount: 'Failed to save account details.',
    successAccountSaved: 'Withdrawal method saved successfully!',
    // Spin
    errSpinFailed: 'An error occurred. Please try again.',
    successSpinWon: 'Congratulations! You won ${amount}',
    // Spin UI
    availableSpins: 'Available Spins',
    spinning: 'Spinning...',
    spinNow: 'SPIN NOW',
    youWon: 'You Won!',
    bonusCredited: 'The bonus has been credited to your total balance immediately.',
    awesome: 'Awesome!',
    noSpinsLeft: 'Oops! No Spins Left',
    noSpinsDesc: 'Deposit $1000 or invite a friend! When your friend deposits $1000, you will both get a chance to spin the wheel.',
    depositNow: 'Deposit Now',
    inviteFriends: 'Invite Friends',
  },

  pt: {
    // ── Language Picker ───────────────────────────────────────────────────────
    selectLanguage: 'Selecionar Idioma',
    langEnglish: 'English',
    langPortuguese: 'Português',

    // ── Dashboard ─────────────────────────────────────────────────────────────
    totalAssets: 'QTX Coin IA Total de Ativos',
    miningWallet: 'Carteira de Mineração IA',
    investmentWallet: 'Carteira de Investimento',
    profitWallet: 'Carteira de Lucros',
    recharge: 'Recarregar',
    withdraw: 'Retirar',
    vipBots: 'Bots VIP',
    luckySpin: 'Sorte Girar',
    security: 'Segurança',
    invite: 'Convidar',
    about: 'Sobre',
    myBots: 'Meus Bots',
    investmentProducts: 'Produtos de Investimento',
    earnIncome: 'Ganhe renda imediatamente',
    certified: 'QTX Coin ajuda você a ganhar recompensas de mineração IA a longo prazo. Certificado',
    footer: '© {year} QTX Coin. Todos os direitos reservados.',

    // ── Wallet ────────────────────────────────────────────────────────────────
    walletTitle: 'Carteira',
    depositUsdt: 'Depositar USDT',
    verifyDeposit: 'Verificar Depósito',
    expiresIn: 'Expira em:',
    amountPlaceholder: 'Valor (USDT)',
    txidPlaceholder: 'Hash da Transação (TXID)',
    pendingVerification: 'Verificação pendente...',
    submitting: 'Enviando...',
    verificationInProgress: 'Verificação em Andamento',
    submitTxid: 'Enviar TXID',
    howToDeposit: 'Como Depositar',
    iUnderstand: 'Entendi',
    sendOnlyUsdt: 'Envie apenas USDT ({network}) para este endereço.',
    depositStep1: 'Abra seu aplicativo de criptomoedas (ex: Binance, Trust Wallet).',
    depositStep2: 'Vá para Sacar e selecione USDT.',
    depositStep3TRC20: 'Selecione a Rede: Tron (TRC20). Rede errada = fundos perdidos!',
    depositStep3BSC: 'Selecione a Rede: BNB Smart Chain (BEP20). Rede errada = fundos perdidos!',
    depositStep4: 'Copie nosso endereço de depósito e cole no campo de endereço de retirada.',
    depositStep5: 'Digite o valor e confirme a transferência.',
    depositStep6: 'Após "Concluído", localize o Hash da Transação (TXID) nos detalhes.',
    depositStep7: 'Cole o Valor e o TXID em Verificar Depósito e envie.',

    // ── Withdraw ──────────────────────────────────────────────────────────────
    withdrawTitle: 'Retirar Fundos',
    availableBalance: 'Saldo Disponível',
    noWithdrawAccount: 'Nenhuma Conta de Saque',
    noWithdrawAccountDesc: 'Você precisa vincular um método de saque antes de solicitar uma retirada.',
    bindAccountNow: 'Vincular Conta Agora',
    selectWithdrawMethod: 'Selecionar Método de Saque',
    amountUsd: 'Valor (USD)',
    minimumAmount: 'Mínimo: $10.00',
    fee: 'Taxa: 0%',
    submitWithdrawal: 'Enviar Solicitação de Saque',
    processing: 'Processando...',
    confirmWithdrawal: 'Confirmar Saque',
    withdrawalAmount: 'Valor do Saque',
    noFeesApplied: 'Sem taxas aplicadas (0%)',
    transferDetails: 'Detalhes da Transferência',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    successfullySubmitted: 'Enviado com Sucesso!',
    withdrawalQueued: 'Seu saque foi enfileirado para processamento. Você pode acompanhar o status no histórico de transações.',
    viewTransactions: 'Ver Transações',

    // ── Account ───────────────────────────────────────────────────────────────
    myAccount: 'Minha Conta',
    region: 'Região:',
    joined: 'Inscrito em:',
    deviceSettings: 'Configurações do Dispositivo',
    biometricLogin: 'Login Biométrico',
    pushNotifications: 'Notificações Push',
    securityCenter: 'Central de Segurança',
    notifications: 'Notificações',
    eventCenter: 'Centro de Eventos',
    faqSupport: 'FAQ e Suporte',
    bindAccount: 'Vincular Conta',
    deposit: 'Depositar',
    signOut: 'Sair',
    enableBiometrics: 'Ativar Biometria',
    biometricDesc: 'Para ativar o Login Biométrico, precisamos armazenar sua senha de forma segura neste dispositivo. Por favor, insira sua senha abaixo.',
    password: 'Senha',
    enable: 'Ativar',

    // ── Affiliate ─────────────────────────────────────────────────────────────
    affiliateTitle: 'Programa de Afiliados',
    inviteEarn: 'Convide e Ganhe Até 10%',
    affiliateDesc: 'Ganhe comissões em 3 níveis da sua rede. Quanto mais pessoas você convidar, mais profundo vai o seu ganho!',
    totalEarned: 'Total Ganho',
    commissions: 'Comissões',
    commissionStructure: 'Estrutura de Comissão',
    perDepositApproved: 'Por depósito aprovado',
    earned: 'ganho',
    howItWorks: 'Como Funciona',
    affiliateStep1: 'Compartilhe seu link de referência único com amigos.',
    affiliateStep2: 'Seu amigo se cadastra e deposita qualquer valor.',
    affiliateStep3: 'Você ganha instantaneamente 10% do depósito dele.',
    affiliateStep4: 'Quando seu amigo convidar outros, você ganha 3% dos depósitos deles.',
    affiliateStep5: 'Vá mais fundo — ganhe 1% dos depósitos do Nível 3 também!',
    generatingLink: 'Gerando link...',

    // ── Notifications ─────────────────────────────────────────────────────────
    notificationsTitle: 'Notificações',
    noNotificationsYet: 'Sem notificações ainda',

    // ── Transactions ──────────────────────────────────────────────────────────
    transactionsTitle: 'Transações',
    noTransactionsFound: 'Nenhuma transação encontrada.',
    back: '← Voltar',
    downloadPdf: 'Baixar Recibo PDF',
    generatingPdf: 'Gerando PDF...',
    from: 'De',
    to: 'Para',
    networkFee: 'Taxa de Rede',
    txHash: 'Hash TX',
    trackingId: 'ID de Rastreamento',
    status: 'Status',
    time: 'Hora',
    verified: 'Verificado',
    pending: 'Pendente',
    failed: 'Falhou',
    confirmed: 'Confirmado',
    expiresLabel: 'Expira:',
    receivedSuccessfully: 'Recebido com Sucesso',
    depositPending: 'Depósito Pendente',
    depositFailed: 'Depósito Falhou',
    withdrawalPending: 'Saque Pendente',
    withdrawalFailed: 'Saque Falhou',

    // ── Security ──────────────────────────────────────────────────────────────
    securityTitle: 'Central de Segurança',
    securitySettings: 'Configurações de Segurança',
    changePassword: 'Alterar Senha',
    loginHistory: 'Histórico de Login',
    recentLoginActivity: 'Atividade de Login Recente',
    noRecentLogin: 'Nenhuma atividade de login recente encontrada.',
    twoFactor: 'Autenticação de Dois Fatores',
    currentPassword: 'Senha Atual',
    newPassword: 'Nova Senha',
    confirmPassword: 'Confirmar Nova Senha',
    saveChanges: 'Salvar Alterações',
    updatePassword: 'Atualizar Senha',
    updating: 'Atualizando...',

    // ── VIP / MyBots / Spin ───────────────────────────────────────────────────
    vipTitle: 'Bots de Negociação VIP',
    myBotsTitle: 'Meus Bots',
    activatedBots: 'Bots Ativados',
    availableBots: 'Bots Disponíveis',
    activate: 'Ativar',
    running: 'Executando',
    dailyIncome: 'Renda Diária',
    totalProfit: 'Lucro Total',
    spinTitle: 'Sorte Girar',
    botMarketplace: '🤖 Mercado de Bots',
    myActiveBots: '⚡ Meus Bots Ativos',
    noBotsYet: 'Nenhum bot ativado ainda',
    browseBots: 'Ver Bots →',
    investmentRange: 'Faixa de Investimento',
    contract: 'Contrato',
    payouts: 'Pagamentos',
    every24h: 'A cada 24h',
    days365: '365 Dias',
    botLifecycle: 'Ciclo do Bot (365 Dias)',
    daysLeft: 'Dias Restantes',
    activated: 'Ativado em:',
    tradingAutomatically: 'Negociando Automaticamente…',
    profitsCredited: 'Lucros creditados na sua carteira',
    botExpired: 'Contrato do Bot Expirado',
    botExpiredDesc: 'Este bot completou seu ciclo de 365 dias.',
    investmentAmount: 'Valor do Investimento (USD)',
    totalDeducted: 'Total Debitado',
    dailyReturnRate: 'Taxa de Retorno Diário',
    estDailyProfit: 'Lucro Diário Est.',
    contractLifecycle: 'Ciclo do Contrato',
    payoutCycle: 'Ciclo de Pagamento',
    confirmAndPay: 'Confirmar e Pagar',
    activating: 'Ativando…',
    howVipBotsWork: 'Como Funcionam os Bots VIP',
    botActivation: 'Ativação do Bot',
    botActivationDesc: 'Você pode ativar um bot investindo um valor dentro do intervalo do nível especificado. O valor investido é debitado com segurança do seu saldo da carteira principal.',
    payouts24h: 'Pagamentos a cada 24 Horas',
    payouts24hDesc: 'Uma vez ativado, o bot começa a negociar automaticamente. Os lucros são gerados e creditados diretamente na sua carteira de lucros a cada 24 horas com base na porcentagem diária garantida do bot.',
    lifecycle365: 'Ciclo de Vida de 365 Dias',
    lifecycle365Desc: 'Cada contrato de bot dura exatamente 365 dias. Após 365 dias, o bot expira e para de gerar retornos diários.',
    understood: 'Entendido',
    howItWorksBtn: 'Como funciona',
    chooseBot: 'Escolha um bot VIP, insira seu valor de investimento e comece a ganhar renda diária garantida automaticamente.',
    activateBot: 'Ativar',
    cancelBtn: 'Cancelar',

    // ── About / FAQ ───────────────────────────────────────────────────────────
    aboutTitle: 'Sobre QTX Coin',
    aboutHero: 'Pioneirismo no Futuro do Trading Automatizado',
    aboutHeroSub: 'Capacitando Investidores em Todo o Mundo',
    faqTitle: 'FAQ e Suporte',
    faqSearch: 'Buscar respostas...',
    faqNoResults: 'Nenhuma resposta encontrada para "{term}". Tente uma palavra diferente.',
    comprehensiveFaq: 'FAQ Completo',

    // ── Login ─────────────────────────────────────────────────────────────────
    loginTitle: 'Bem-vindo de Volta',
    loginSubtitle: 'Entre na sua conta QTX Coin',
    email: 'Endereço de E-mail',
    loginBtn: 'Entrar',
    noAccount: 'Não tem uma conta?',
    registerBtn: 'Cadastrar',
    loggingIn: 'Entrando...',
    registerTitle: 'Criar Conta',
    registerSubtitle: 'Junte-se à QTX Coin e comece a ganhar',
    alreadyHaveAccount: 'Já tem uma conta?',
    signIn: 'Entrar',
    signInBtn: 'Entrar',
    registerLabel: 'Cadastrar',
    registering: 'Criando Conta...',
    processing: 'Processando...',
    loginWithBiometrics: 'Login com Biometria',
    country: 'País',
    selectCountry: 'Selecione seu país',
    dontHaveAccount: 'Não tem uma conta?',
    signUpLink: 'Cadastre-se',
    alreadyHaveAccountLink: 'Já tem uma conta?',
    signInLink: 'Entrar',

    // ── Common ────────────────────────────────────────────────────────────────
    loading: 'Carregando...',
    home: 'Início',
    mining: 'Mineração',
    history: 'Histórico',
    team: 'Equipe',
    me: 'Eu',
    liveBalance: 'Saldo ao Vivo',
    invested: 'Investido',
    operationTime: 'Tempo de Operação',
    hours24: '24 Horas',
    day: 'Dia',
    yearFooter: '© {year} QTX Coin. Todos os direitos reservados.',
    uidCopied: 'UID copiado para a área de transferência',
    cancelBtn: 'Cancelar',
    botActivated: 'ativado!',
    activationFailed: 'Falha na ativação',

    // ── About Section Headings ────────────────────────────────────────────────
    aboutSec1: 'Nossa Missão & Visão',
    aboutSec2: 'A Tecnologia por Trás da QTX Coin',
    aboutSec3: 'Presença Global & Conformidade',
    aboutSec4: 'Segurança Inabalável',
    aboutSec5: 'O Ecossistema de Bots VIP',
    aboutSec6: 'Sistema de Comissão Afiliada de 3 Níveis',
    aboutSec7: 'Recompensas Gamificadas: A Sorte Girar',
    aboutSec8: 'Nossa Comunidade & O Caminho à Frente',
    aboutFooterTitle: 'Sede Global QTX Coin AI',
    aboutFooterSub: 'Fundada em 2020 • Todos os direitos reservados',
    aboutLevel1: 'Nível 1 – Indicação Direta',
    aboutLevel2: 'Nível 2 – Rede do Amigo',
    aboutLevel3: 'Nível 3 – Rede Estendida',
    aboutL1Example: 'Seu amigo deposita $500 → Você ganha $50 instantaneamente.',
    aboutL2Example: 'O contato do seu amigo deposita $1.000 → Você ganha $30.',
    aboutL3Example: 'O contato do recrutado nível 2 deposita $2.000 → Você ganha $20.',
    aboutTiersExplained: 'Os 3 Níveis Explicados:',
    aboutAffiliateInfo: 'Todas as comissões são processadas automaticamente no momento em que um depósito é aprovado. Sem limites, sem atrasos. Construa sua rede e veja sua renda passiva multiplicar em todos os 3 níveis.',

    // ── Toast Messages ────────────────────────────────────────────────────────
    // Security
    errFillAllPasswords: 'Por favor, preencha todos os campos de senha',
    errPasswordsMismatch: 'As novas senhas não coincidem',
    errPasswordTooShort: 'A nova senha deve ter pelo menos 6 caracteres',
    errIncorrectPassword: 'Senha atual incorreta.',
    successPasswordUpdated: 'Senha atualizada com sucesso!',
    // Login / Auth
    errFillAllFields: 'Por favor, preencha todos os campos',
    errBiometricFailed: 'Falha na autenticação biométrica',
    successBiometricEnabled: 'Login biométrico ativado!',
    successLoggedIn: 'Login efetuado com sucesso',
    successAccountCreated: 'Conta criada com sucesso',
    errEmailInUse: 'Já existe uma conta com este e-mail.',
    errInvalidCredential: 'E-mail ou senha inválidos. Tente novamente.',
    errWeakPassword: 'Sua senha é muito fraca. Use pelo menos 6 caracteres.',
    errNetworkFailed: 'Erro de rede. Verifique sua conexão com a internet.',
    errTooManyRequests: 'Muitas tentativas falhas. Tente novamente mais tarde.',
    errInvalidEmail: 'Por favor, insira um endereço de e-mail válido.',
    errAuthFailed: 'Falha na autenticação. Tente novamente.',
    successBiometricLogin: 'Login efetuado com sucesso',
    // Wallet
    successAddressCopied: 'Endereço copiado para a área de transferência!',
    successTxSubmitted: 'Transação enviada! Será verificada automaticamente em até 5 minutos.',
    // Affiliate
    successLinkCopied: 'Link de indicação copiado!',
    // Account
    successPushEnabled: 'Notificações push ativadas!',
    errPermissionDenied: 'Permissão negada',
    errCouldNotChangePush: 'Não foi possível alterar as configurações de push',
    successBiometricDisabled: 'Login biométrico desativado',
    errFailedDisableBiometrics: 'Falha ao desativar a biometria',
    errEnterPassword: 'Por favor, insira sua senha',
    errFailedEnableBiometrics: 'Falha ao ativar a biometria',
    errSelectImageFile: 'Por favor, selecione um arquivo de imagem',
    errImageTooLarge: 'O tamanho da imagem deve ser inferior a 5MB',
    successProfileUpdated: 'Foto de perfil atualizada com sucesso!',
    errFailedLogout: 'Falha ao sair',
    errPhotoCooldown: 'Você pode alterar sua foto novamente em {n} dias.',
    // VIP
    errInvalidAmount: 'Insira um valor entre ${min} e ${max}',
    errInsufficientBalance: 'Saldo insuficiente. Você tem ${bal}',
    // Bind Account
    errInvalidBinanceId: 'Por favor, insira um ID Binance válido',
    errInvalidWalletAddress: 'Por favor, insira um endereço de carteira válido',
    errFillMobileDetails: 'Por favor, preencha todos os detalhes da conta mobile',
    errEnterPasswordToSave: 'Por favor, insira sua senha de login para salvar as alterações.',
    errFailedSaveAccount: 'Falha ao salvar detalhes da conta.',
    successAccountSaved: 'Método de saque salvo com sucesso!',
    // Spin
    errSpinFailed: 'Ocorreu um erro. Por favor, tente novamente.',
    successSpinWon: 'Parabéns! Você ganhou ${amount}',
    // Spin UI
    availableSpins: 'Giros Disponíveis',
    spinning: 'Girando...',
    spinNow: 'GIRAR AGORA',
    youWon: 'Você Ganhou!',
    bonusCredited: 'O bônus foi creditado imediatamente ao seu saldo total.',
    awesome: 'Ótimo!',
    noSpinsLeft: 'Ops! Sem Giros Disponíveis',
    noSpinsDesc: 'Deposite $1000 ou convide um amigo! Quando seu amigo depositar $1000, vocês dois ganharão uma chance de girar a roda.',
    depositNow: 'Depositar Agora',
    inviteFriends: 'Convidar Amigos',
  },
};

const LanguageContext = createContext();

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }) {
  // 1. Read from localStorage immediately (fast, no flicker)
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('qtx coin_lang') || 'en';
  });

  // 2. On mount: if user is logged in and their Firestore doc has a language,
  //    sync it to localStorage (handles login on a new device / cleared cache).
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const dbLang = snap.data().language;
          const localLang = localStorage.getItem('qtx coin_lang');
          if (dbLang && dbLang !== localLang) {
            // DB has a different preference (e.g. user logged in on new device)
            localStorage.setItem('qtx coin_lang', dbLang);
            window.location.reload();
          }
        }
      } catch (e) {
        console.warn('Could not sync language from DB:', e);
      }
    });
    return () => unsubscribe();
  }, []);

  const t = (key) => {
    return translations[language]?.[key] ?? translations['en'][key] ?? key;
  };

  // 3. changeLanguage: save to localStorage + Firestore + reload
  const changeLanguage = async (lang) => {
    if (lang === language) return;

    // Immediately persist to localStorage so the reload reads the new value
    localStorage.setItem('qtx coin_lang', lang);

    // Save to Firestore in the background (non-blocking)
    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { language: lang });
      } catch (e) {
        console.warn('Could not save language to DB:', e);
      }
    }

    // Reload the app — all components will re-render with the new language
    window.location.reload();
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

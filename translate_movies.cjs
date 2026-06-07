const fs = require('fs');

const contextPath = 'src/contexts/LanguageContext.jsx';
let contextStr = fs.readFileSync(contextPath, 'utf8');

const enInsert = `
    msgClaimingReward: 'Claiming reward...',
    msgCredited: ' credited!',
    errClaimFailed: 'Claim failed. Try again.',
    errComeBack24h: 'Come back in 24 hours to watch this again!',
    activeInvestmentRequired: 'Active Investment Required',
    activateCryptoDesc: 'Activate a Crypto Investment in the Wealth section to unlock video rewards.',
    goToWealth: 'Go to Wealth',
    videoRewardsActive: 'Video Rewards Active — watch ',
    videoRewardsActiveSuffix: 's to earn',
    investedPrefix: 'Invested: ',
    perVideo: '/video',
    percentDaily: '% daily',
    investToEarn: 'Invest to Earn',
    closeBtn: 'Close',
    watchComplete: '✓ Watch complete!',
    watchMoreToEarnPrefix: 'Watch ',
    watchMoreToEarnSuffix: 's more to earn',
    rewardClaimed24h: 'Reward claimed! Come back in 24h.',
    processingReward: '⏳ Processing reward...',
    errClaimInvestMissing: 'Failed to claim. You may not have an active investment.',
  },

  pt: {`;

const ptInsert = `
    msgClaimingReward: 'Resgatando prêmio...',
    msgCredited: ' creditado!',
    errClaimFailed: 'Falha no resgate. Tente novamente.',
    errComeBack24h: 'Volte em 24 horas para assistir novamente!',
    activeInvestmentRequired: 'Investimento Ativo Obrigatório',
    activateCryptoDesc: 'Ative um Investimento em Cripto na seção Patrimônio para desbloquear pagamentos por vídeo.',
    goToWealth: 'Ir para Patrimônio',
    videoRewardsActive: 'Prêmios Ativos — assista ',
    videoRewardsActiveSuffix: 's para ganhar',
    investedPrefix: 'Investido: ',
    perVideo: '/vídeo',
    percentDaily: '% ao dia',
    investToEarn: 'Invista p/ Ganhar',
    closeBtn: 'Fechar',
    watchComplete: '✓ Exibição concluída!',
    watchMoreToEarnPrefix: 'Assista mais ',
    watchMoreToEarnSuffix: 's para receber',
    rewardClaimed24h: 'Prêmio resgatado! Volte em 24h.',
    processingReward: '⏳ Processando prêmio...',
    errClaimInvestMissing: 'Falha no resgate. Você talvez não tenha um investimento ativo.',
  },
};`;

contextStr = contextStr.replace(/  \},[\s\n]*pt: \{/, enInsert);
contextStr = contextStr.replace(/  \},[\s\n]*\};[\s\n]*const LanguageContext/, ptInsert + '\n\nconst LanguageContext');
fs.writeFileSync(contextPath, contextStr);

const moviesPath = 'src/pages/Movies.jsx';
let mStr = fs.readFileSync(moviesPath, 'utf8');

// Replace strings
mStr = mStr.replace("toast.loading('Claiming reward...')", "toast.loading(t('msgClaimingReward'))");
mStr = mStr.replace("credited!'", "credited!'").replace("`+${convertAndFormatCurrency(res.data.rewardAmount)} credited!`", "`+${convertAndFormatCurrency(res.data.rewardAmount)}${t('msgCredited')}`");
mStr = mStr.replace("'Claim failed. Try again.'", "t('errClaimFailed')");
mStr = mStr.replace("'Come back in 24 hours to watch this again!'", "t('errComeBack24h')");

mStr = mStr.replace(">Watch &amp; Earn<", ">{t('watchEarn')}<");
mStr = mStr.replace("Active Investment Required", "{t('activeInvestmentRequired')}");
mStr = mStr.replace("Activate a Crypto Investment in the Wealth section to unlock video rewards.", "{t('activateCryptoDesc')}");
mStr = mStr.replace(">Go to Wealth<", ">{t('goToWealth')}<");
mStr = mStr.replace("Video Rewards Active — watch {REQUIRED_WATCH_TIME}s to earn", "{t('videoRewardsActive')}{REQUIRED_WATCH_TIME}{t('videoRewardsActiveSuffix')}");
mStr = mStr.replace("Invested: ", "{t('investedPrefix')}");
mStr = mStr.replace("/video", "{t('perVideo')}");
mStr = mStr.replace("% daily", "{t('percentDaily')}");
mStr = mStr.replace("'Invest to Earn'", "t('investToEarn')");
mStr = mStr.replace(">Close<", ">{t('closeBtn')}<");

mStr = mStr.replace("'✓ Watch complete!'", "t('watchComplete')");
mStr = mStr.replace("`Watch ${REQUIRED_WATCH_TIME - progress}s more to earn`", "`${t('watchMoreToEarnPrefix')}${REQUIRED_WATCH_TIME - progress}${t('watchMoreToEarnSuffix')}`");

mStr = mStr.replace("Reward claimed! Come back in 24h.", "{t('rewardClaimed24h')}");
mStr = mStr.replace(">⏳ Processing reward...<", ">{t('processingReward')}<");
mStr = mStr.replace("Failed to claim. You may not have an active investment.", "{t('errClaimInvestMissing')}");

fs.writeFileSync(moviesPath, mStr);

const fs = require('fs');

let content = fs.readFileSync('public/documentation.html', 'utf-8');

const ptBrDict = {
  "QTX Coin AI - Official Documentation": "QTX Coin AI - Documentação Oficial",
  "Download as PDF": "Descarregar como PDF",
  "Official Platform Documentation & Guide": "Documentação e Guia Oficial da Plataforma",
  "1. Welcome to QTX Coin AI": "1. Bem-vindo à QTX Coin AI",
  "Welcome to QTX Coin AI, the world's most advanced and comprehensive automated algorithmic trading platform. Founded on the principle that institutional-grade financial technology should be accessible to everyone, our platform democratizes access to high-frequency trading (HFT) environments, quantitative analysis, and artificial intelligence-driven asset management.": "Bem-vindo à QTX Coin AI, a plataforma algoritmo automatizada mais avançada do mundo. Fundada no princípio de que a tecnologia de ponta deve ser acessível a todos, democratizamos o acesso a negociações de alta frequência, análise quantitativa e gestão de ativos por IA.",
  "Our vision is to entirely bridge the gap between retail investors and Wall Street. For decades, the most lucrative investment opportunities and sophisticated trading algorithms have been locked behind the closed doors of massive hedge funds. QTX Coin AI changes this paradigm.": "A nossa visão é preencher a lacuna entre si e Wall Street. Durante décadas, os algoritmos mais lucrativos estiveram trancados a sete chaves pelos grandes fundos. A QTX Coin AI quebrou esse paradigma.",
  "2. Crypto Video Mining (Watch & Earn)": "2. Mineração em Vídeo (Assistir e Ganhar)",
  "QTX Coin features 10 distinct Crypto Mining Portfolios. <strong>These crypto investments function differently than our fully autonomous VIP bots.</strong> By activating a crypto portfolio, you bind your capital into a <strong>365-day smart contract</strong> that enables you to earn daily percentage returns exclusively by watching movie trailers.": "A QTX Coin dispõe de 10 carteiras de Criptomoedas. <strong>Estes investimentos funcionam de forma diferente dos VIP bots.</strong> Ao ativá-lo num <strong>contrato de 365 dias</strong>, você tem o direito garantido aos ganhos diários percentuais pagos única e exclusivamente por assistir a curtos vídeos de filmes.",
  "Daily": "Diário",
  "Range:": "Intervalo:",
  "How to claim your daily income": "Como resgatar os lucros",
  "The <strong>Watch & Earn (Movies)</strong> tab is where your Crypto Portfolio actively generates profit. <br/><br/>": "A aba <strong>Assistir e Ganhar (Filmes)</strong> é onde gera o seu lucro diário. <br/><br/>",
  "<strong>How it works:</strong> The platform features 6 Hollywood action trailers daily. To claim the daily return associated with your active crypto investment, you must watch all 6 trailers for exactly <strong>30 seconds each</strong>. For instance, if you hold the Bitcoin portfolio (10% daily), actively watching all 6 trailers will instantly deposit your $1,000 daily payout directly into your withdrawable wallet in real-time.": "<strong>Como funciona:</strong> Diariamente o sistema mostra 6 vídeos de Hollywood. Para recolher o retorno correspondente, terá de assistir a todos religiosamente, onde cada conta com <strong>30 segundos exatos</strong>. Logo após, os lucros do seu investimento (Ex: Bitcoin) irão voar imediatamente no mesmo segundo em prol do seu saldo total de levantamento livre.",
  "3. The Technology & VIP Bot Engine": "3. O Motor Computacional VIP Bot",
  "At the core of our platform lies the QTX Coin Quantum Engine, a proprietary AI architecture utilizing deep reinforcement learning. This engine directly powers our exclusive <strong>VIP Bot Marketplace</strong>.": "No centro da nossa plataforma atua o Motor Quântico AI. Esta rede neuronal computacional robusta está alocada para dominar as suas apostas exclusivas através do nosso <strong>Mercado de Bots VIP</strong>.",
  "<strong>The VIP AI Bot Ecosystem:</strong>": "<strong>O Ecossistema de Bots Autônomos:</strong>",
  "<strong>12-Tier Architecture:</strong> The platform offers 12 distinct AI trading bots (VIP 1 through VIP 12), each engineered for different capital ranges.": "<strong>12 Escalões Arquitetónicos:</strong> Oferecemos com dedicação 12 opções distintas de Robôs (VIP 1 ao 12), concebidos minuciosamente com parâmetros financeiros singulares.",
  "<strong>Customizable Investment:</strong> Unlike fixed-tier plans, users can fund a VIP bot with <em>any</em> exact amount within the bot's designated minimum and maximum investment range.": "<strong>Depósitos Customizáveis:</strong> Deixe longe os pacotes rígidos! Tem liberdade exímia de fundear um Bot introduzindo <em>qualquer</em> capital estritamente dentro da sua janela mínima e máxima exata imposta.",
  "<strong>365-Day Lifecycle Contract:</strong> Upon activation, the bot automatically secures the funds into a strict 365-day autonomous trading cycle.": "<strong>Ciclos Resguardados (365 Dias):</strong> Assine sem receio a estabilidade. Os depósitos são travados para exploração diária autónoma impulsionada ativamente ao longo do ano unânime garantindo conforto inabalável.",
  "<strong>24-Hour Payout Cycle:</strong> The AI trades seamlessly in the background. Exactly every 24 hours (down to the second) from the moment of activation, the bot's guaranteed daily percentage profit is minted and automatically deposited into your withdrawable wallet.": "<strong>Ciclo de Payout 24h:</strong> Precisamente ao atingir 24 horas sobrepostas sobre a marca ativacional do motor, será abençoado automaticamente na integridade pela remessas exatas correspondentes percentualmente ao patamar adquirido, ficando à inteira e soberana disponibilidade na sua alçada digital fiduciária.",
  "<span class=\"highlight\">High-Frequency Execution:</span> Speed is the ultimate currency. Our servers are co-located in prime data centers in New York, London, Tokyo, and Frankfurt, reducing latency to micro-seconds ensuring unparalleled accuracy for all active VIP Bots.": "<span class=\"highlight\">Alta Frequência Operacional:</span> Mantemos os super-computadores acoplados sob as linhas estratégicas em Nova Iorque, Londres, e Tóquio para reduzir a latência de microsegundos garantindo a estabilidade global VIP sem vacilações perigosas.",
  "4. Global Reach & Unwavering Security": "4. Estrutura Global e Segurança Ímpar",
  "QTX Coin AI operates on a truly global scale across 150+ countries. We maintain strict compliance with AML and KYC regulations.": "O motor computacional serve ininterruptamente em mais de 150 países adotando compliance rígido às normatizações centrais estatais.",
  "<strong>Military-Grade Encryption:</strong> All user data is encrypted using AES-256 protocols. Communication occurs over secure TLS 1.3 channels.": "<strong>Criptografia Elevada:</strong> Encriptação a grau AES-256 invulnerável garante total serenidade nas navegações internas, salvaguardadas ainda mais por túneis de camuflagens herméticos (TLS 1.3).",
  "<strong>Cold Storage:</strong> The vast majority of user funds are held in multi-signature, geographically distributed offline cold wallets, immune to online hacking.": "<strong>Proteção Bancária Exilada:</strong> Cerca dos esmagadores 95% do erário é exilado do acesso humano online sob cofres frios em coordenadas intercontinentais e imunes a hackers.",
  "5. Three-Tier Affiliate Commission": "5. Sistema Comissional (Afiliados)",
  "The Affiliate Program is one of the most lucrative network-building systems in DeFi. You earn from up to 3 levels deep.": "Enaltecemos quem nutre empenho em publicitar os nossos algoritmos através deste escalão robusto.",
  "Level 1 (Direct Referral):": "Nível 1 (Cúpula Direta):",
  "Level 2 (Network Extension):": "Nível 2 (Árvore Secundária):",
  "Level 3 (Deep Network):": "Nível 3 (Árvore Terciária):",
  "6. Gamified Rewards - Lucky Spin": "6. Recompensas - Roda da Fortuna",
  "Earn a chance to spin the wheel whenever you make a qualifying deposit of $1,000 or more, or whenever a direct referral does. Every spin guarantees an instant cash prize ranging from $10 to $100.": "Adquire o direito a manusear o mecanismo giratório da sorte em momentos imperdíveis ao depósitar capitais acima da bitola de 1.000$ (ou mediante os sucessos provenientes do esforço direto em afliados), contendo de bônus, prémios líquidos monetários variáveis (10$ a 100$).",
  "Frequently Asked Questions": "Perguntas e Questões Habituais",
  "Comprehensive answers to common technical and operational inquiries.": "Respostas devidamente elaboradas a todas dúvidas correntes.",
  "General Information": "Guia Genérico",
  "Q: What exactly is the QTX Coin Platform and how does it revolutionize digital finance?": "P: Do que trata o ecosistema da plataforma?",
  "QTX Coin is a globally recognized, state-of-the-art decentralized platform designed specifically to democratize high-frequency AI-driven cryptocurrency trading and advanced digital asset management. By utilizing cloud-based decentralized computing, we allow everyday users to lease \"VIP Trading Bots\" that do the heavy lifting on their behalf.": "Somos uma base universal, erguida puramente nas novas diretrizes financeiras automatizadas onde permitimos que cada singelo subscritor extraia proveitos contundentes acionando, arrendando e deixando interceder por si todo o músculo de Inteligência Artificial do motor computacional QTX.",
  "Q: How does the AI Mining Technology work behind the scenes?": "P: Como atua a mecânica subjacente nos bastidores de forma orgulhosamente imbatível?",
  "Our AI operates entirely in the cloud, utilizing advanced machine learning models for predictive market analysis. It continuously ingests petabytes of data from over 40 global cryptocurrency exchanges to track price discrepancies and executes spatial arbitrage simultaneously, locking in risk-free profit.": "O Cérebro da Inteligência Artificial vive livre na Nuvem extraíndo, destilando e correlacionando o trilho preditivo de mais de 40 sub-bases de câmbios paralelos globais numa velocidade fulcral enclausurando o arbítrio rentável e selando riscos a zeros em tempo ultra micro-segmentar.",
  "VIP Trading Bots & Daily Profits": "Motor VIP e Prestações",
  "Q: What are VIP Trading Bots and how do I activate one?": "P: Em que se baseiam os afamados Motores VIP e o que devo adotar para ligar um a meu próprio encargo?",
  "VIP Trading Bots represent varying tiers of access to our AI trading algorithms. You can select an appropriate bot from the marketplace based on your capital. Once activated, the bot will automatically reserve your investment and begin its 365-day autonomous trading cycle.": "Dispensável complexidade, é meramente ceder em termos simples as credenciais diretivas de autorização capital onde de forma hierárquica ser-lhe-á concedido aluguer diário ininterruptamente mediante cada patamar subscrito do mercado perfeitamente moldáveis e alinhados às suas possibilidades ou disponibilidades em capital com subida imediata à alínea rentável para resgaste constante por exatos 365 longos e plenos de dias redondos.",
  "Q: How and when are the daily profits distributed?": "P: Sobre que balanço e prazos assentarão as promessas diárias de deposições fiduciárias para salvaguarda digital e individual do assinante ativo em bolsa?",
  "Exactly 24 hours from the precise moment of activation, the bot completes its daily trading cycle. The calculated profit is automatically minted and transferred directly into your Profit Wallet simultaneously.": "Pautado rigorosamente pelo ritmo dos relógios em fuso e ciclos cadentes fixados a cada hora contundente e sem derrape mediante a data alfanumérica de selo e assinatura efetuada na ativação singular correspondente a essa alínea. Nisto, exatamente a bater às 24 horas puras o crivo é feito e os lucros canalizados incondicionalmente para proveito livre via caixa.",
  "Deposits & Withdrawals": "Depósitos e Levantamentos",
  "Q: How do I withdraw my profits, and what are the rules?": "P: Como posso manietar e exigir liquidez (fazer saque) sem burocracias?",
  "Before withdrawing, you must strictly bind your receiving wallet or bank account. Once bound, you can initiate a withdrawal from the dashboard. Minimum withdrawal limit applies depending on regions. Crypto transfers take 5-30 minutes, while bank/mobile money may take slightly longer.": "Urge providenciar primeiramente a devida e irrecusável confirmação fidedigna da posse ou domínio oficial das vias carteirizantes externas (vulgo Vincular o meio - m-Pesa ou Criptoativos). Só desse limiar, a ordem de levantamento far-se-á com aprovação máxima sem atrevessar condicionalismos operacionais de risco e o capital emitir-se-á logo dentro de prazos relâmpago, exceto transferências mais sensíveis que dependem do país, redes regionais, congestionamento na nuvem inter-bancária entre outros...",
  "Q: What is 'Account Binding' and why is it absolutely mandatory?": "P: É efetivamente e inegavelmente soberano associar ou embutir sub-endereços nas preferências de Recebimentos sem tolerar saltos processuais perigosos? Explique o preceito.",
  "Account Binding restricts all outgoing withdrawals exclusively to the specific wallet address or account number that you previously verified. This stringent requirement is a strict anti-theft and anti-fraud mechanism designed to protect your funds.": "Decerto! Resguardar a riqueza angariada sob suor de invasões cibernéticas pauta pelos mecanismos mais blindados para afugentar a fraude sistemática onde por esse critério a alínea transacional bloqueia irrevogavelmente o dinheiro alheio em vias sem atamento e selos de confirmação oficial pré-impeças nas bases da salvaguarda originária submetida pessoalmente por si.",
  "Affiliate Program": "Sub-Redes Partilhadas",
  "Q: What are the best strategies for growing my QTX Coin affiliate network?": "P: Quais os artifícios para maximizar os rendimentos colaterais pela afluência do esforço direto sob indicação de amigos em hierarquias e escalar de posição no Círculo Máximo em escalão 3?",
  "Leverage social proof by posting screenshots of active bots and withdrawal receipts. Create concise educational content. Host zoom calls to guide prospects, and support your downline using group chats. Our most successful affiliates treat their network like a dedicated business.": "Esgrime sem restrições em todas frentes os comprovativos visuais das vitórias que atinge e atiça curiosões genuinas nas publicações diárias via perfis nas malhas digitais como Facebook ou WhatsApp partilhando vivamente e acompanhando sem receio. Lembre-se, nutrir os subscritores e elucidar na sua própria árvore e cúpula de angariamentos eleva a rentabilidade de ambos como uma equipa forte baseada num ecossistema vitalício.",
  "All rights reserved.": "Todos os Direitos Estritamente Protegidos à Alçada Jurídica e Reservados.",
  "Highly Confidential Internal & Promotional Documentation.": "Documentação Sigilosa, Interna, Instrucional e Fechada - Proibida Edições sob Pena Capital de Falsificações em Venda Indevida."
};

// Using replacement across keys
for (const [en, pt] of Object.entries(ptBrDict)) {
  // Use simple replace for large sentences, replaceAll for repeated words like Daily, Range
  if (en === "Daily" || en === "Range:") {
    content = content.replaceAll(en, pt);
  } else {
    // Escaping regex slightly isn't necessary with simple replace if it's exact match.
    // Try simple replace first
    let result = content.replace(en, pt);
    // if not found, we might need a backup replace if formatting differs slightly, 
    // but the source HTML uses exact string lines in most places
    if (result !== content) {
      content = result;
    } else {
       // Check if split exists due to newlines
       // just replace anyway using string manipulation if spaces differ
       const cleanEn = en.replace(/\s+/g, ' ').trim();
       const rgx = new RegExp(cleanEn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'g');
       content = content.replace(rgx, pt);
    }
  }
}

fs.writeFileSync('public/documentation.html', content);

export const GLOSSARY = [
  {
    word: { en: 'Liquidity', es: 'Liquidez', de: 'Liquidität' },
    definition: {
      en: 'Zones where many traders place stops or pending orders. Price often moves toward these zones as large participants collect orders before moving the market.',
      es: 'Zonas donde muchos traders colocan sus stops o pendientes. El precio suele ir hacia esas zonas porque los grandes participantes buscan "recoger" esas órdenes antes de mover el mercado.',
      de: 'Zonen, in denen viele Trader ihre Stops platzieren. Der Preis bewegt sich oft dorthin, da große Marktteilnehmer Aufträge einsammeln, bevor sie den Markt bewegen.',
    },
    emoji: '💧',
    example: {
      en: 'Stops above last week\'s high are a pool of buy-side liquidity.',
      es: 'Los stops encima del máximo de la semana pasada son un pool de liquidez compradora.',
      de: 'Stops über dem letzten Wochenhoch sind ein Pool an kaufseitiger Liquidität.',
    },
    extra: {
      en: 'Institutional traders need liquidity to fill large positions. Understanding where liquidity pools exist helps predict price moves.',
      es: 'Los institucionales necesitan liquidez para llenar sus grandes posiciones. Saber dónde hay pools ayuda a predecir el precio.',
      de: 'Institutionelle Trader brauchen Liquidität, um große Positionen zu füllen.',
    },
  },
  {
    chartId: 'fvg',
    word: { en: 'Fair Value Gap', es: 'Desequilibrio (FVG)', de: 'Preislücke (FVG)' },
    definition: {
      en: 'A price gap caused by a very fast move. The market often returns to that zone to fill it before continuing.',
      es: 'Un hueco en el precio causado por un movimiento muy rápido. El mercado muchas veces vuelve a esa zona para rellenarla antes de continuar.',
      de: 'Eine Preislücke durch eine sehr schnelle Bewegung. Der Markt kehrt oft zurück, um sie zu füllen.',
    },
    emoji: '⚖️',
    example: {
      en: 'After the rally, price retraced into the FVG before pushing higher.',
      es: 'Tras el rally, el precio retrocedió al FVG antes de continuar subiendo.',
      de: 'Nach dem Anstieg kehrte der Preis zum FVG zurück, bevor er weiterstieg.',
    },
    extra: {
      en: 'FVGs form when a three-candle pattern leaves a gap between the first and third candle wicks. ICT traders use these as high-probability entry zones.',
      es: 'Los FVG se forman con un patrón de tres velas que deja hueco entre la primera y tercera. Los traders ICT los usan como zonas de entrada de alta probabilidad.',
      de: 'FVGs entstehen, wenn ein Drei-Kerzen-Muster eine Lücke hinterlässt. ICT-Trader nutzen sie als hochwahrscheinliche Eintrittszonen.',
    },
  },
  {
    chartId: 'displacement',
    word: { en: 'Displacement', es: 'Desplazamiento', de: 'Displacement' },
    definition: {
      en: 'A strong aggressive price move with large candles. Indicates important money entered the market and usually leaves clues about future direction.',
      es: 'Un movimiento fuerte y agresivo del precio con velas grandes. Indica que entró dinero importante al mercado y deja pistas de la dirección futura.',
      de: 'Eine starke, aggressive Preisbewegung mit großen Kerzen. Zeigt an, dass wichtiges Geld in den Markt eingetreten ist.',
    },
    emoji: '🚀',
    example: {
      en: 'The 3% candle at market open was a clear displacement signal.',
      es: 'La vela del 3% en la apertura del mercado fue una señal de desplazamiento clara.',
      de: 'Die 3%-Kerze bei Marktöffnung war ein klares Displacement-Signal.',
    },
    extra: {
      en: 'After displacement, look for the FVG left behind — it will often act as future support or resistance.',
      es: 'Tras el desplazamiento, busca el FVG que deja: actuará como soporte o resistencia futura.',
      de: 'Nach einem Displacement suche die hinterlassene FVG als zukünftige Unterstützung/Widerstand.',
    },
  },
  {
    chartId: 'mss',
    word: { en: 'Market Structure Shift', es: 'Cambio de Estructura (MSS)', de: 'Marktstrukturwechsel (MSS)' },
    definition: {
      en: 'The initial change in market trend. Happens when price breaks an important high or low, signaling a possible reversal.',
      es: 'El cambio inicial de tendencia del mercado. Sucede cuando el precio rompe un máximo o mínimo importante, señalando posible reversión.',
      de: 'Der anfängliche Trendwechsel. Tritt auf, wenn der Preis ein wichtiges Hoch oder Tief bricht.',
    },
    emoji: '🔄',
    example: {
      en: 'The MSS on the 1H chart confirmed the uptrend was losing momentum.',
      es: 'El MSS en el gráfico de 1H confirmó que el alza estaba perdiendo impulso.',
      de: 'Das MSS im 1H-Chart bestätigte, dass der Aufwärtstrend an Schwung verlor.',
    },
    extra: {
      en: 'A MSS is often the first sign of a new trend. Combine with premium/discount zones for higher probability.',
      es: 'El MSS suele ser la primera señal de nueva tendencia. Combínalo con zonas premium/descuento.',
      de: 'Ein MSS ist oft das erste Zeichen eines neuen Trends. Kombiniere es mit Premium/Discount-Zonen.',
    },
  },
  {
    word: { en: 'Order Block', es: 'Bloque de Órdenes', de: 'Order Block' },
    definition: {
      en: 'The last candle before a strong institutional move. Traders use that zone because price tends to react there when it returns.',
      es: 'La última vela antes de un movimiento fuerte institucional. Los traders usan esa zona porque el precio suele reaccionar ahí cuando vuelve.',
      de: 'Die letzte Kerze vor einer starken institutionellen Bewegung. Der Preis reagiert oft dort, wenn er zurückkehrt.',
    },
    emoji: '🧱',
    example: {
      en: 'Price returned to the 4H order block before rallying 5%.',
      es: 'El precio volvió al bloque de órdenes de 4H antes de subir un 5%.',
      de: 'Der Preis kehrte zum 4H-Order-Block zurück, bevor er 5% stieg.',
    },
    extra: {
      en: 'Order blocks represent where institutions placed their orders. Residual orders remain there, drawing price back.',
      es: 'Los bloques de órdenes representan donde los institucionales colocaron sus órdenes. Quedan órdenes residuales que atraen al precio.',
      de: 'Order Blocks zeigen, wo Institutionen ihre Orders platzierten. Restaufträge ziehen den Preis zurück.',
    },
    chartId: 'order_block',
  },
  {
    word: { en: 'Daily Bias', es: 'Sesgo Diario', de: 'Tagesbias' },
    definition: {
      en: 'The probable direction of the market for the day: bullish or bearish. Helps trade only in the direction of the main daily trend.',
      es: 'La dirección probable del mercado para el día: alcista o bajista. Sirve para operar solo a favor de la tendencia principal diaria.',
      de: 'Die wahrscheinliche Marktrichtung für den Tag: bullisch oder bärisch. Hilft, nur in Trendrichtung zu handeln.',
    },
    emoji: '🧭',
    example: {
      en: 'With a bullish daily bias, only long setups are considered.',
      es: 'Con sesgo diario alcista, solo se consideran operaciones largas.',
      de: 'Bei einem bullischen Tagesbias werden nur Long-Setups berücksichtigt.',
    },
    extra: {
      en: 'Establish daily bias by analyzing previous day price action, key levels, and relevant economic events.',
      es: 'Establece el sesgo diario analizando la acción del precio del día anterior, niveles clave y eventos económicos.',
      de: 'Lege den Tagesbias fest durch Analyse der Vortages-Preisentwicklung, Schlüsselniveaus und Wirtschaftsereignisse.',
    },
    chartId: 'daily_bias',
  },
  {
    word: { en: 'Premium & Discount', es: 'Premium y Descuento', de: 'Premium & Discount' },
    definition: {
      en: 'ICT divides price into expensive and cheap zones using Fibonacci. The idea is to buy in discount and sell in premium.',
      es: 'ICT divide el precio en zonas "caras" y "baratas" usando Fibonacci. La idea es comprar en descuento y vender en premium.',
      de: 'ICT teilt den Preis in "teure" und "günstige" Zonen mit Fibonacci ein. Günstig kaufen und teuer verkaufen.',
    },
    emoji: '💹',
    chartId: 'premium_discount',
    example: {
      en: 'Waiting for price to return to the discount zone before entering long.',
      es: 'Esperar que el precio vuelva a la zona de descuento antes de entrar largo.',
      de: 'Warten, bis der Preis in die Discount-Zone zurückkehrt, bevor man long geht.',
    },
    extra: {
      en: 'Premium is above the 50% Fibonacci midpoint of a range; Discount is below it. Institutional traders prefer buying cheap and selling expensive.',
      es: 'Premium está por encima del 50% de Fibonacci del rango; Descuento está por debajo. Los institucionales prefieren comprar barato y vender caro.',
      de: 'Premium liegt über dem 50%-Fibonacci-Mittelpunkt; Discount darunter.',
    },
  },
  {
    word: { en: 'Buy-Side Liquidity', es: 'Liquidez Compradora (BSL)', de: 'Kaufseitige Liquidität (BSL)' },
    definition: {
      en: 'Stops placed above important highs. Price often rises first to take that liquidity before falling.',
      es: 'Los stops colocados encima de máximos importantes. El precio muchas veces sube primero para tomar esa liquidez antes de caer.',
      de: 'Stops über wichtigen Hochs. Der Preis steigt oft zuerst, um diese Liquidität zu nehmen, bevor er fällt.',
    },
    emoji: '⬆️',
    chartId: 'buyside_liquidity',
    example: {
      en: 'Price swept BSL above last week\'s high before reversing 3%.',
      es: 'El precio barrió la BSL sobre el máximo semanal antes de revertirse un 3%.',
      de: 'Der Preis sweepte BSL über das Wochenhoch, bevor er 3% fiel.',
    },
    extra: {
      en: 'BSL is created by short sellers\' stops above swing highs and buy stop orders from breakout traders. Smart money hunts this liquidity to fill sell orders.',
      es: 'La BSL la crean los stops de vendedores cortos y las órdenes de compra de traders de ruptura. El dinero inteligente caza esa liquidez.',
      de: 'BSL entsteht durch Stops von Short-Sellern und Buy-Stop-Orders von Breakout-Tradern.',
    },
  },
  {
    word: { en: 'Sell-Side Liquidity', es: 'Liquidez Vendedora (SSL)', de: 'Verkaufsseitige Liquidität (SSL)' },
    definition: {
      en: 'Stops situated below important lows. The market tends to go down to find them before bouncing upward.',
      es: 'Los stops situados debajo de mínimos importantes. El mercado suele bajar a buscarlos antes de rebotar hacia arriba.',
      de: 'Stops unter wichtigen Tiefs. Der Markt tendiert dazu, diese zu suchen, bevor er nach oben abprallt.',
    },
    emoji: '⬇️',
    chartId: 'sellside_liquidity',
    example: {
      en: 'After sweeping SSL below the daily low, price reversed and gained 2%.',
      es: 'Tras barrer la SSL bajo el mínimo diario, el precio revirtió y ganó un 2%.',
      de: 'Nach dem Sweep der SSL unter das Tagestief gewann der Preis 2%.',
    },
    extra: {
      en: 'SSL pools below key lows include stops from long traders and trailing stops. These act as magnets during bearish liquidity hunts.',
      es: 'Los pools de SSL incluyen stops de traders largos y stops trailing. Son imanes para el precio en cacerías bajistas.',
      de: 'SSL-Pools umfassen Stops von Long-Tradern und Trailing-Stops.',
    },
  },
  {
    word: { en: 'Break of Structure', es: 'Ruptura de Estructura (BOS)', de: 'Strukturbruch (BOS)' },
    definition: {
      en: 'Occurs when price breaks the previous structure following the trend. Used to confirm that the trend continues.',
      es: 'Ocurre cuando el precio rompe la estructura previa siguiendo la tendencia. Se usa para confirmar que la tendencia continúa.',
      de: 'Tritt auf, wenn der Preis die vorherige Struktur trendkonform bricht. Bestätigt die Trendfortsetzung.',
    },
    emoji: '💥',
    example: {
      en: 'Each BOS confirmed the bullish trend was still intact.',
      es: 'Cada BOS confirmó que la tendencia alcista estaba intacta.',
      de: 'Jedes BOS bestätigte, dass der Aufwärtstrend intakt war.',
    },
    extra: {
      en: 'BOS follows the trend (continuation); CHoCH goes against it (reversal). In an uptrend, BOS = price breaks above a prior swing high.',
      es: 'BOS sigue la tendencia (continuación); CHoCH va en contra (reversión). En alcista, BOS = precio rompe un máximo anterior.',
      de: 'BOS folgt dem Trend (Fortsetzung); CHoCH geht dagegen (Umkehr).',
    },
    chartId: 'bos',
  },
  {
    word: { en: 'Liquidity Sweep', es: 'Barrido de Liquidez', de: 'Liquiditäts-Sweep' },
    definition: {
      en: 'When price breaks a high or low only to activate stops and then reverse. ICT considers this typical market manipulation.',
      es: 'Cuando el precio rompe un máximo o mínimo solo para activar stops y luego girarse. ICT considera esto manipulación típica del mercado.',
      de: 'Wenn der Preis ein Hoch oder Tief bricht, nur um Stops zu aktivieren und dann umzukehren.',
    },
    emoji: '🎣',
    example: {
      en: 'The false breakout above $100 was a classic liquidity sweep before the real move down.',
      es: 'El falso breakout sobre $100 fue un clásico barrido de liquidez antes del movimiento bajista.',
      de: 'Der Fakeout über $100 war ein klassischer Sweep vor der echten Abwärtsbewegung.',
    },
    extra: {
      en: 'After a sweep, wait for confirmation of the reversal before entering in the opposite direction. The sweep creates the conditions for the real trade.',
      es: 'Tras un barrido, espera confirmación de la reversión antes de entrar en dirección contraria. El barrido crea las condiciones para el trade real.',
      de: 'Nach einem Sweep warte auf Bestätigung der Umkehr vor dem Einstieg in die entgegengesetzte Richtung.',
    },
    chartId: 'liquidity_sweep',
  },
  {
    word: { en: 'Change of Character', es: 'Cambio de Carácter (CHoCH)', de: 'Charakterwechsel (CHoCH)' },
    definition: {
      en: 'An early signal that the market could change direction. Usually appears before a bigger reversal.',
      es: 'Una señal temprana de que el mercado podría cambiar de dirección. Normalmente aparece antes de una reversión más grande.',
      de: 'Ein frühes Signal, dass sich der Markt ändern könnte. Tritt normalerweise vor einer größeren Umkehr auf.',
    },
    emoji: '↩️',
    example: {
      en: 'The CHoCH at the key level warned of the upcoming trend reversal.',
      es: 'El CHoCH en el nivel clave advirtió de la próxima reversión de tendencia.',
      de: 'Das CHoCH am Schlüsselniveau warnte vor der bevorstehenden Trendumkehr.',
    },
    extra: {
      en: 'A CHoCH on a lower timeframe within a premium/discount area is a strong entry signal. It\'s the counter-trend version of BOS.',
      es: 'Un CHoCH en temporalidad menor dentro de una zona premium/descuento es señal de entrada fuerte. Es la versión contraria al BOS.',
      de: 'Ein CHoCH in einem niedrigeren Zeitrahmen in einer Premium/Discount-Zone ist ein starkes Einstiegssignal.',
    },
    chartId: 'choch',
  },
  {
    word: { en: 'OTE (Optimal Trade Entry)', es: 'OTE (Entrada Óptima)', de: 'OTE (Optimaler Einstieg)' },
    definition: {
      en: 'An entry zone based on Fibonacci retracements. ICT looks to enter when price corrects to that zone before continuing the trend.',
      es: 'Una zona de entrada basada en retrocesos Fibonacci. ICT busca entrar cuando el precio corrige a esa zona antes de continuar la tendencia.',
      de: 'Eine Einstiegszone basierend auf Fibonacci-Retracements. ICT sucht den Einstieg, wenn der Preis zu dieser Zone korrigiert.',
    },
    emoji: '🎯',
    example: {
      en: 'Entered long at the 0.705 OTE level after the displacement.',
      es: 'Entré largo en el nivel OTE 0.705 tras el desplazamiento.',
      de: 'Bin long beim OTE-Level 0,705 nach dem Displacement eingestiegen.',
    },
    extra: {
      en: 'ICT\'s OTE zone is typically the 0.62–0.79 Fibonacci retracement of a swing. In an uptrend it\'s a discount; in a downtrend it\'s premium.',
      es: 'La zona OTE de ICT es el retroceso Fibonacci 0.62–0.79 de un swing. En alcista es descuento; en bajista es premium.',
      de: 'ICTs OTE-Zone ist das 0,62–0,79 Fibonacci-Retracement eines Swings.',
    },
    chartId: 'ote',
  },
  {
    word: { en: 'Smart Money Concept', es: 'Concepto de Dinero Inteligente', de: 'Smart Money Konzept' },
    definition: {
      en: 'The main idea of ICT: follow the trail of institutional money. Tries to understand what banks and large funds do to trade alongside them.',
      es: 'La idea principal de ICT: seguir el rastro del dinero institucional. Se intenta entender qué hacen bancos y grandes fondos para operar junto a ellos.',
      de: 'Die Hauptidee von ICT: der Spur des institutionellen Geldes folgen, um gemeinsam mit Banken und Fonds zu handeln.',
    },
    emoji: '🏦',
    example: {
      en: 'SMC analysis pointed to a bullish setup at the institutional order block.',
      es: 'El análisis SMC apuntaba a un setup alcista en el bloque de órdenes institucional.',
      de: 'Die SMC-Analyse deutete auf ein bullisches Setup am institutionellen Order-Block hin.',
    },
    extra: {
      en: 'Smart money includes central banks, hedge funds, and market makers. Order blocks, FVGs, and liquidity sweeps are their footprints in price action.',
      es: 'El dinero inteligente incluye bancos centrales, fondos de cobertura y creadores de mercado. Los bloques de órdenes, FVGs y barridos son sus huellas.',
      de: 'Smart Money umfasst Zentralbanken, Hedge-Fonds und Market Maker. Order Blocks, FVGs und Sweeps sind ihre Fußabdrücke.',
    },
    chartId: 'smart_money',
  },
  {
    word: { en: 'Kill Zones', es: 'Zonas de Caza (Kill Zones)', de: 'Kill Zones' },
    definition: {
      en: 'Specific market hours where more volume enters. The best opportunities usually appear at London or New York open.',
      es: 'ICT presta atención a ciertas horas donde entra más volumen. Las mejores oportunidades suelen aparecer en apertura de Londres o Nueva York.',
      de: 'Bestimmte Marktzeiten mit mehr Volumen. Die besten Gelegenheiten erscheinen bei der London- oder New York-Eröffnung.',
    },
    emoji: '⏰',
    example: {
      en: 'The best setups formed during the London kill zone (2–5 AM EST).',
      es: 'Los mejores setups se formaron durante la kill zone de Londres (2–5 AM EST).',
      de: 'Die besten Setups bildeten sich während der London Kill Zone (2–5 Uhr EST).',
    },
    extra: {
      en: 'Main kill zones: London Open (2:00–5:00 AM EST), New York Open (7:00–10:00 AM EST), NY PM (1:30–4:00 PM EST). These overlap sessions produce the most significant moves.',
      es: 'Kill zones principales: Apertura Londres (2-5h EST), Apertura NY (7-10h EST), NY PM (13:30-16h EST). Estos solapamientos producen los movimientos más significativos.',
      de: 'Haupt-Kill-Zones: London Open (2–5 Uhr EST), NY Open (7–10 Uhr EST), NY PM (13:30–16 Uhr EST).',
    },
    chartId: 'kill_zones',
  },
  {
    word: { en: 'Support', es: 'Soporte', de: 'Unterstützung' },
    definition: {
      en: 'A price level where buying pressure is strong enough to stop a downtrend. Price tends to bounce from support zones.',
      es: 'Nivel de precio donde la presión compradora es suficiente para detener una bajada. El precio tiende a rebotar desde zonas de soporte.',
      de: 'Ein Preisniveau, bei dem Kaufdruck einen Abwärtstrend stoppt. Der Preis tendiert dazu, von dort abzuprallen.',
    },
    emoji: '🛡️',
    example: {
      en: 'BTC found support at $80,000 and bounced 8%.',
      es: 'BTC encontró soporte en $80.000 y rebotó un 8%.',
      de: 'BTC fand Unterstützung bei $80.000 und prallte 8% ab.',
    },
    extra: {
      en: 'Support levels are often former resistance that was broken. The more times a level is tested without breaking, the stronger it becomes — until it finally does.',
      es: 'Los niveles de soporte suelen ser resistencias anteriores que fueron rotas. Cuantas más veces se prueba sin romper, más fuerte se vuelve.',
      de: 'Unterstützungsniveaus sind oft frühere Widerstände. Je öfter getestet ohne zu brechen, desto stärker.',
    },
    chartId: 'support',
  },
  {
    word: { en: 'Resistance', es: 'Resistencia', de: 'Widerstand' },
    definition: {
      en: 'A price level where selling pressure prevents further advances. Price often struggles to break through resistance.',
      es: 'Nivel de precio donde la presión vendedora impide subidas mayores. El precio suele tener dificultades para atravesarlo.',
      de: 'Ein Preisniveau, bei dem Verkaufsdruck weitere Anstiege verhindert.',
    },
    emoji: '🚧',
    example: {
      en: 'EUR/USD stalled at the 1.1000 resistance for three consecutive days.',
      es: 'EUR/USD se estancó en la resistencia de 1.1000 durante tres días consecutivos.',
      de: 'EUR/USD stagnierte drei Tage lang am Widerstand von 1,1000.',
    },
    extra: {
      en: 'Resistance becomes support once broken — known as "role reversal." This is one of the most reliable phenomena in technical analysis.',
      es: 'La resistencia se convierte en soporte una vez rota — "cambio de rol". Uno de los fenómenos más fiables del análisis técnico.',
      de: 'Widerstand wird zur Unterstützung, wenn er gebrochen wird — bekannt als "Rollentausch."',
    },
    chartId: 'resistance',
  },
  {
    chartId: 'trend',
    word: { en: 'Trend', es: 'Tendencia', de: 'Trend' },
    definition: {
      en: 'The general direction in which price is moving over time. Trends can be upward (bullish), downward (bearish), or sideways.',
      es: 'La dirección general en la que se mueve el precio con el tiempo. Las tendencias pueden ser alcistas, bajistas o laterales.',
      de: 'Die allgemeine Richtung der Preisbewegung im Laufe der Zeit: aufwärts, abwärts oder seitwärts.',
    },
    emoji: '📈',
    example: {
      en: 'The stock has been in an uptrend for 6 months, making higher highs and higher lows.',
      es: 'La acción lleva 6 meses en tendencia alcista, haciendo máximos y mínimos crecientes.',
      de: 'Die Aktie ist seit 6 Monaten im Aufwärtstrend mit höheren Hochs und Tiefs.',
    },
    extra: {
      en: '"The trend is your friend — until it ends." Trading in the direction of the trend dramatically increases the probability of success.',
      es: '"La tendencia es tu amiga — hasta que termina." Operar en su dirección aumenta drásticamente la probabilidad de éxito.',
      de: '"Der Trend ist dein Freund — bis er endet." In Trendrichtung zu handeln erhöht die Erfolgswahrscheinlichkeit drastisch.',
    },
  },
  {
    word: { en: 'Doji Candle', es: 'Vela Doji', de: 'Doji-Kerze' },
    definition: {
      en: 'A candle where open and close prices are almost equal, showing market indecision. Often signals a potential reversal.',
      es: 'Una vela donde apertura y cierre son casi iguales, mostrando indecisión. Suele señalar una posible reversión.',
      de: 'Eine Kerze, bei der Eröffnungs- und Schlusskurs fast gleich sind — zeigt Marktunentschlossenheit.',
    },
    emoji: '🕯️',
    example: {
      en: 'A doji appeared at the top of a rally, warning of exhaustion.',
      es: 'Un doji apareció en la cima del rally, advirtiendo de agotamiento.',
      de: 'Ein Doji erschien an der Spitze einer Rally und warnte vor Erschöpfung.',
    },
    extra: {
      en: 'Types: standard (equal wicks), dragonfly (long lower wick = bullish), gravestone (long upper wick = bearish), long-legged (very long wicks = extreme indecision).',
      es: 'Tipos: estándar, dragonfly (mecha inferior larga = alcista), gravestone (mecha superior larga = bajista), piernas largas (indecisión extrema).',
      de: 'Typen: Standard, Libelle (langer unterer Docht = bullisch), Grabstein (langer oberer Docht = bärisch), langbeinig (extreme Unentschlossenheit).',
    },
    chartId: 'doji',
  },
  {
    chartId: 'rsi',
    word: { en: 'RSI', es: 'RSI', de: 'RSI' },
    definition: {
      en: 'Relative Strength Index: a momentum indicator measuring speed and magnitude of price changes. Above 70 = overbought; below 30 = oversold.',
      es: 'Índice de Fuerza Relativa: indicador de momentum que mide la velocidad de los cambios de precio. Sobre 70 = sobrecompra; bajo 30 = sobreventa.',
      de: 'Relative Strength Index: misst Geschwindigkeit und Ausmaß von Preisänderungen. Über 70 = überkauft; unter 30 = überverkauft.',
    },
    emoji: '📊',
    example: {
      en: 'RSI reached 78 as the stock made new highs — bearish divergence warning.',
      es: 'El RSI llegó a 78 mientras la acción marcaba nuevos máximos — advertencia de divergencia bajista.',
      de: 'RSI erreichte 78 bei neuen Hochs der Aktie — bärische Divergenzwarnung.',
    },
    extra: {
      en: 'RSI divergence: price makes new highs but RSI makes lower highs (bearish), or price makes new lows but RSI makes higher lows (bullish). Often precedes major reversals.',
      es: 'Divergencia RSI: precio hace nuevos máximos pero RSI hace máximos menores (bajista), o precio hace nuevos mínimos pero RSI hace mínimos mayores (alcista).',
      de: 'RSI-Divergenz: Preis macht neue Hochs aber RSI macht niedrigere Hochs (bärisch), oder umgekehrt (bullisch).',
    },
  },
  {
    chartId: 'macd',
    word: { en: 'MACD', es: 'MACD', de: 'MACD' },
    definition: {
      en: 'Moving Average Convergence Divergence: shows trend direction and momentum by comparing two moving averages.',
      es: 'Convergencia/Divergencia de Medias Móviles: muestra la dirección de la tendencia y momentum comparando dos medias móviles.',
      de: 'Moving Average Convergence Divergence: zeigt Trendrichtung und Momentum durch Vergleich zweier gleitender Durchschnitte.',
    },
    emoji: '〰️',
    example: {
      en: 'The MACD crossover above zero confirmed the start of a new uptrend.',
      es: 'El cruce del MACD por encima de cero confirmó el inicio de la nueva tendencia alcista.',
      de: 'Die MACD-Kreuzung über Null bestätigte den Beginn eines neuen Aufwärtstrends.',
    },
    extra: {
      en: 'MACD = 12-EMA minus 26-EMA. Signal line = 9-EMA of MACD. Histogram = difference between them. Crossover above signal = bullish; below = bearish.',
      es: 'MACD = 12-EMA menos 26-EMA. Señal = 9-EMA del MACD. Histograma = diferencia. Cruce por encima = alcista; por debajo = bajista.',
      de: 'MACD = 12-EMA minus 26-EMA. Signallinie = 9-EMA. Histogramm = Differenz. Kreuzung über Signal = bullisch; darunter = bärisch.',
    },
  },
  {
    chartId: 'volume',
    word: { en: 'Volume', es: 'Volumen', de: 'Volumen' },
    definition: {
      en: 'The number of shares or contracts traded in a given period. High volume confirms price moves; low volume suggests weak conviction.',
      es: 'El número de acciones o contratos negociados en un período. Alto volumen confirma movimientos; bajo volumen sugiere poca convicción.',
      de: 'Die Anzahl gehandelter Aktien oder Kontrakte. Hohes Volumen bestätigt Preisbewegungen; niedriges deutet auf geringe Überzeugung hin.',
    },
    emoji: '📦',
    example: {
      en: 'The breakout above $50 was accompanied by 3× average volume — a strong signal.',
      es: 'El breakout sobre $50 fue acompañado de 3× el volumen medio — una señal fuerte.',
      de: 'Der Ausbruch über $50 wurde von 3-fachem Durchschnittsvolumen begleitet.',
    },
    extra: {
      en: 'Volume precedes price. Rising price on decreasing volume signals weakness. Falling price on decreasing volume signals the downmove is losing steam.',
      es: 'El volumen precede al precio. Precio subiendo con volumen decreciente señala debilidad. Precio cayendo con volumen decreciente indica que la bajada pierde fuerza.',
      de: 'Volumen geht dem Preis voraus. Steigender Preis bei sinkendem Volumen signalisiert Schwäche.',
    },
  },
  {
    chartId: 'spread',
    word: { en: 'Spread', es: 'Spread', de: 'Spread' },
    definition: {
      en: 'The difference between the bid (sell) and ask (buy) price. It represents the broker\'s fee and varies with market liquidity.',
      es: 'La diferencia entre el precio bid (venta) y ask (compra). Representa la comisión del bróker y varía con la liquidez del mercado.',
      de: 'Die Differenz zwischen Geld- (Verkauf) und Briefkurs (Kauf). Repräsentiert die Brokergebühr und variiert mit der Liquidität.',
    },
    emoji: '↔️',
    example: {
      en: 'EUR/USD had a 1 pip spread during London session, widening to 5 pips at news.',
      es: 'EUR/USD tenía un spread de 1 pip en sesión de Londres y se amplió a 5 pips en noticias.',
      de: 'EUR/USD hatte 1 Pip Spread in der London Session, weitete sich auf 5 Pips bei News aus.',
    },
    extra: {
      en: 'A wide spread means your trade starts in a larger loss. Avoid trading during news events or low-liquidity periods like the Asian session or weekend opens.',
      es: 'Un spread amplio significa que tu trade empieza con mayor pérdida. Evita operar durante noticias o baja liquidez (sesión asiática, apertura de semana).',
      de: 'Ein breiter Spread bedeutet, dass dein Trade mit einem größeren Verlust beginnt.',
    },
  },
  {
    word: { en: 'Volatility', es: 'Volatilidad', de: 'Volatilität' },
    definition: {
      en: 'How much price fluctuates over a period. High volatility = large price swings; low volatility = small, steady moves.',
      es: 'Cuánto fluctúa el precio en un período. Alta volatilidad = grandes oscilaciones; baja volatilidad = movimientos pequeños y estables.',
      de: 'Wie stark der Preis in einem Zeitraum schwankt. Hohe Volatilität = große Schwankungen; niedrige = kleine, stetige Bewegungen.',
    },
    emoji: '⚡',
    example: {
      en: 'BTC\'s daily volatility of 5% makes position sizing critical.',
      es: 'La volatilidad diaria del 5% del BTC hace que el sizing de posición sea crítico.',
      de: 'BTCs tägliche Volatilität von 5% macht Position Sizing kritisch.',
    },
    extra: {
      en: 'VIX measures S&P 500 expected volatility. ATR (Average True Range) measures an asset\'s average daily range. Both help set appropriate stop losses.',
      es: 'El VIX mide la volatilidad esperada del S&P 500. El ATR mide el rango diario promedio. Ambos ayudan a establecer stops adecuados.',
      de: 'VIX misst die erwartete Volatilität des S&P 500. ATR misst den durchschnittlichen Tagesbereich.',
    },
  },
  {
    word: { en: 'Drawdown', es: 'Drawdown', de: 'Drawdown' },
    definition: {
      en: 'The decline from a peak to a trough in account value. Measures how much a strategy loses before recovering.',
      es: 'La caída desde un máximo hasta un mínimo en el valor de la cuenta. Mide cuánto pierde una estrategia antes de recuperarse.',
      de: 'Der Rückgang vom Höchst- zum Tiefststand eines Kontowerts. Misst, wie viel eine Strategie verliert, bevor sie sich erholt.',
    },
    emoji: '📉',
    example: {
      en: 'The strategy had a maximum drawdown of 15% over 3 years.',
      es: 'La estrategia tuvo un drawdown máximo del 15% durante 3 años.',
      de: 'Die Strategie hatte einen maximalen Drawdown von 15% über 3 Jahre.',
    },
    extra: {
      en: 'A 50% drawdown requires a 100% gain just to break even. Always know your strategy\'s historical max drawdown before trading it live.',
      es: 'Un drawdown del 50% requiere un 100% de ganancia para recuperar. Siempre conoce el drawdown máximo histórico de tu estrategia antes de operar en vivo.',
      de: 'Ein 50%-Drawdown erfordert 100% Gewinn um breakeven zu werden. Kenne immer den historischen Max-Drawdown deiner Strategie.',
    },
  },
  {
    word: { en: 'Rally', es: 'Rally', de: 'Rally' },
    definition: {
      en: 'A sustained period of rising prices. Usually follows a period of decline or consolidation.',
      es: 'Un período sostenido de subida de precios. Normalmente sigue a un período de caída o consolidación.',
      de: 'Ein anhaltender Zeitraum steigender Preise. Folgt normalerweise einer Rückgangs- oder Konsolidierungsphase.',
    },
    emoji: '🎉',
    example: {
      en: 'Gold staged a 12% rally after the Fed announced rate cuts.',
      es: 'El oro protagonizó un rally del 12% tras el anuncio de bajada de tipos por la Fed.',
      de: 'Gold startete ein 12%-Rally nachdem die Fed Zinssenkungen ankündigte.',
    },
    extra: {
      en: 'Bear market rallies ("dead cat bounces") can be sharp and fast, trapping short sellers. Volume and momentum indicators help distinguish genuine rallies from temporary bounces.',
      es: 'Los rallies en mercado bajista ("rebote del gato muerto") pueden ser bruscos y rápidos, atrapando a vendedores cortos. Los indicadores de volumen ayudan a distinguirlos.',
      de: 'Bären-Markt-Rallys ("Toter-Katze-Abpraller") können scharf sein und Short-Seller in die Falle locken.',
    },
  },
  {
    word: { en: 'Correction', es: 'Corrección', de: 'Korrektur' },
    definition: {
      en: 'A short-term decline of 10% or more from recent highs. Normal and healthy part of any uptrend before continuation.',
      es: 'Una caída a corto plazo del 10% o más desde máximos recientes. Parte normal y saludable de cualquier tendencia alcista.',
      de: 'Ein kurzfristiger Rückgang von 10% oder mehr von letzten Hochs. Normaler und gesunder Teil jedes Aufwärtstrends.',
    },
    emoji: '🔻',
    example: {
      en: 'The stock corrected 12% before resuming its uptrend.',
      es: 'La acción corrigió un 12% antes de retomar su tendencia alcista.',
      de: 'Die Aktie korrigierte 12%, bevor sie ihren Aufwärtstrend fortsetzte.',
    },
    extra: {
      en: 'Below 10% = pullback; 10–20% = correction; above 20% = bear market. Corrections in healthy uptrends are buying opportunities for trend followers.',
      es: 'Menos del 10% = pullback; 10–20% = corrección; más del 20% = mercado bajista. Las correcciones en alcistas saludables son oportunidades de compra.',
      de: 'Unter 10% = Pullback; 10–20% = Korrektur; über 20% = Bärenmarkt.',
    },
  },
  {
    word: { en: 'Bull Market', es: 'Mercado Alcista', de: 'Bullenmarkt' },
    definition: {
      en: 'A prolonged period of rising prices, typically 20%+ from recent lows. Characterized by investor confidence and economic optimism.',
      es: 'Un período prolongado de subida de precios, típicamente 20%+ desde mínimos recientes. Caracterizado por confianza de inversores y optimismo económico.',
      de: 'Ein längerer Zeitraum steigender Preise, typischerweise 20%+ von letzten Tiefs. Gekennzeichnet durch Anlegervertrauen und wirtschaftlichen Optimismus.',
    },
    emoji: '🐂',
    example: {
      en: 'The 2009–2020 bull market was the longest in US history.',
      es: 'El mercado alcista de 2009–2020 fue el más largo de la historia de EE.UU.',
      de: 'Der Bullenmarkt von 2009–2020 war der längste in der US-Geschichte.',
    },
    extra: {
      en: '"Bull" comes from how a bull attacks — thrusting horns upward. Bull markets are fueled by strong earnings, low unemployment, low interest rates, and risk appetite.',
      es: '"Bull" viene de cómo ataca un toro — empujando sus cuernos hacia arriba. Se alimenta de ganancias sólidas, bajo desempleo y apetito por el riesgo.',
      de: '"Bulle" kommt vom Angriff eines Bullen — Hörner nach oben stoßend.',
    },
  },
  {
    word: { en: 'Bear Market', es: 'Mercado Bajista', de: 'Bärenmarkt' },
    definition: {
      en: 'A prolonged decline of 20%+ from recent highs. Marked by pessimism, fear, and declining economic activity.',
      es: 'Una caída prolongada del 20%+ desde máximos recientes. Marcado por pesimismo, miedo y actividad económica en descenso.',
      de: 'Ein anhaltender Rückgang von 20%+ von letzten Hochs. Geprägt von Pessimismus, Angst und sinkender Wirtschaftsaktivität.',
    },
    emoji: '🐻',
    example: {
      en: 'Crypto entered a bear market after BTC dropped 75% from its ATH.',
      es: 'Crypto entró en mercado bajista tras la caída del 75% de BTC desde su ATH.',
      de: 'Crypto betrat einen Bärenmarkt, nachdem BTC 75% von seinem ATH gefallen war.',
    },
    extra: {
      en: 'Bear markets average 9–18 months; bull markets average 4–5 years. Dollar-cost averaging during bear markets can be highly profitable long-term.',
      es: 'Los mercados bajistas duran 9–18 meses de media; los alcistas, 4–5 años. El DCA durante bajistas puede ser muy rentable a largo plazo.',
      de: 'Bärenmärkte dauern durchschnittlich 9–18 Monate; Bullenmärkte 4–5 Jahre.',
    },
  },
  {
    word: { en: 'Fibonacci', es: 'Fibonacci', de: 'Fibonacci' },
    definition: {
      en: 'A sequence where each number is the sum of the two before it. Key trading levels (38.2%, 50%, 61.8%) predict where price might reverse.',
      es: 'Una secuencia donde cada número es la suma de los dos anteriores. Niveles clave (38.2%, 50%, 61.8%) predicen dónde podría revertirse el precio.',
      de: 'Eine Zahlenfolge, bei der jede Zahl die Summe der beiden vorherigen ist. Schlüsselniveaus sagen Preisumkehrungen voraus.',
    },
    emoji: '🌀',
    example: {
      en: 'Price pulled back to the 61.8% Fibonacci level before continuing the uptrend.',
      es: 'El precio retrocedió al nivel Fibonacci del 61.8% antes de continuar la tendencia alcista.',
      de: 'Der Preis zog auf das 61,8%-Fibonacci-Level zurück, bevor er den Aufwärtstrend fortsetzte.',
    },
    extra: {
      en: 'The golden ratio (1.618) appears throughout nature and markets. The 61.8% retracement is considered the most significant Fibonacci level in trading.',
      es: 'La proporción áurea (1,618) aparece en la naturaleza y los mercados. El retroceso del 61.8% es el nivel Fibonacci más significativo en trading.',
      de: 'Das Goldene Verhältnis (1,618) erscheint in der Natur und in Märkten. Das 61,8%-Retracement gilt als das bedeutendste Fibonacci-Level.',
    },
  },
  {
    word: { en: 'Moving Average', es: 'Media Móvil', de: 'Gleitender Durchschnitt' },
    definition: {
      en: 'Smooths price action by calculating the average price over a set period. Helps identify trend direction and dynamic support/resistance.',
      es: 'Suaviza la acción del precio calculando el promedio en un período. Ayuda a identificar la dirección de la tendencia y soporte/resistencia dinámicos.',
      de: 'Glättet die Preisentwicklung durch Berechnung des Durchschnittspreises. Hilft, Trendrichtung und dynamische Support/Resistance zu identifizieren.',
    },
    emoji: '〰️',
    example: {
      en: 'The 200 MA acted as dynamic support throughout the uptrend.',
      es: 'La MM200 actuó como soporte dinámico durante toda la tendencia alcista.',
      de: 'Der 200 MA wirkte während des gesamten Aufwärtstrends als dynamische Unterstützung.',
    },
    extra: {
      en: 'SMA (Simple) vs EMA (Exponential): EMAs react faster because they weight recent prices more. The 50/200 MA crossover is called "golden cross" (bullish) or "death cross" (bearish).',
      es: 'SMA (Simple) vs EMA (Exponencial): las EMA reaccionan más rápido. El cruce 50/200 se llama "cruz dorada" (alcista) o "cruz de la muerte" (bajista).',
      de: 'SMA (Einfach) vs EMA (Exponentiell): EMAs reagieren schneller. 50/200 MA-Crossover = "Goldenes Kreuz" (bullisch) oder "Todeskreuz" (bärisch).',
    },
  },
  {
    word: { en: 'Divergence', es: 'Divergencia', de: 'Divergenz' },
    definition: {
      en: 'When price and an indicator move in opposite directions. Signals a potential weakening of the current trend.',
      es: 'Cuando el precio y un indicador se mueven en direcciones opuestas. Señala un posible debilitamiento de la tendencia actual.',
      de: 'Wenn Preis und ein Indikator sich in entgegengesetzte Richtungen bewegen. Signalisiert Trendabschwächung.',
    },
    emoji: '📐',
    example: {
      en: 'Hidden bullish divergence on MACD while price consolidated — a strong entry signal.',
      es: 'Divergencia alcista oculta en el MACD mientras el precio consolidaba — señal de entrada fuerte.',
      de: 'Versteckte bullische Divergenz auf MACD während der Konsolidierung — starkes Einstiegssignal.',
    },
    extra: {
      en: 'Regular divergence signals reversals; hidden divergence signals continuations. Higher timeframe divergence is more powerful. Never trade divergence alone — wait for price confirmation.',
      es: 'La divergencia regular señala reversiones; la oculta señala continuaciones. En temporalidades mayores es más poderosa. Espera siempre confirmación del precio.',
      de: 'Reguläre Divergenz signalisiert Umkehrungen; versteckte Divergenz Fortsetzungen.',
    },
  },
  {
    word: { en: 'Breakout', es: 'Ruptura', de: 'Ausbruch' },
    definition: {
      en: 'When price moves beyond a defined support or resistance level, often with increased volume. Can signal the start of a new trend.',
      es: 'Cuando el precio se mueve más allá de un nivel de soporte o resistencia, a menudo con volumen aumentado. Puede señalar el inicio de una nueva tendencia.',
      de: 'Wenn der Preis über ein Support- oder Resistance-Niveau hinaus bewegt, oft mit erhöhtem Volumen.',
    },
    emoji: '💨',
    example: {
      en: 'Apple broke out of a 3-month consolidation with 2× average volume.',
      es: 'Apple rompió una consolidación de 3 meses con 2× el volumen medio.',
      de: 'Apple brach aus einer 3-monatigen Konsolidierung mit 2-fachem Durchschnittsvolumen aus.',
    },
    extra: {
      en: 'False breakouts (fakeouts) are common. Wait for a candle close beyond the level. A retest of the broken level as new support is a safer, higher-probability entry than chasing the initial move.',
      es: 'Las falsas rupturas son comunes. Espera el cierre de vela más allá del nivel. Un retest como nuevo soporte es una entrada más segura que perseguir la ruptura inicial.',
      de: 'Falsche Ausbrüche (Fakeouts) sind häufig. Warte auf den Kerzenschluss. Ein Retest des gebrochenen Niveaus ist ein sichererer Einstiegspunkt.',
    },
  },
  {
    word: { en: 'Consolidation', es: 'Consolidación', de: 'Konsolidierung' },
    definition: {
      en: 'A period of sideways price movement where buyers and sellers are balanced. Often precedes a significant move in either direction.',
      es: 'Un período de movimiento lateral donde compradores y vendedores están equilibrados. A menudo precede a un movimiento significativo en cualquier dirección.',
      de: 'Eine Periode seitlicher Preisbewegung, in der Käufer und Verkäufer im Gleichgewicht sind.',
    },
    emoji: '⏸️',
    example: {
      en: 'After a 30% rally, BTC consolidated for 6 weeks before breaking higher.',
      es: 'Tras un rally del 30%, BTC consolidó durante 6 semanas antes de romper al alza.',
      de: 'Nach einem 30%-Rally konsolidierte BTC 6 Wochen, bevor es nach oben ausbrach.',
    },
    extra: {
      en: 'Consolidation patterns include flags, pennants, rectangles, and triangles. Measure the flagpole and project it from the breakout point to estimate price targets.',
      es: 'Los patrones de consolidación incluyen banderas, banderines, rectángulos y triángulos. Mide el mástil y proyéctalo desde el breakout para estimar objetivos.',
      de: 'Konsolidierungsmuster: Flaggen, Wimpel, Rechtecke, Dreiecke. Masthöhe messen und vom Ausbruch projizieren.',
    },
  },
];

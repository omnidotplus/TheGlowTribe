if (location.search.includes('dev')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = '/vendor/dialkit/styles.css';
  document.head.appendChild(link);
  const js = document.createElement('script');
  js.src = '/vendor/dialkit/browser.global.js';
  js.onload = () => {
    const H = window.__hero, T = H.T;
    DialKit.createDialRoot({ position: 'bottom-right', theme: 'dark' });

    /* the beat boundaries ARE the "slow vs a tad fast" control: a beat given
       more scroll distance reads slower at the same wheel speed */
    const seq = DialKit.createDialKit('Hero \u00b7 sequence', {
      scrub: [T.scrub, 0, 1.6, 0.01],
      pinVh: [400, 200, 700, 10],
      beats: {
        room:[T.b.room,0,1,0.01], tunnel:[T.b.tunnel,0,1,0.01], oMat:[T.b.oMat,0,1,0.01],
        build:[T.b.build,0,1,0.01], clear:[T.b.clear,0,1,0.01],
        emit:[T.b.emit,0,1,0.01], card:[T.b.card,0,1,0.01]
      }
    }, { id: 'tgt-hero-seq', persist: true });
    let lastScrub = T.scrub, lastPin = 400;
    seq.subscribe(v => {
      Object.assign(T.b, v.beats);
      if (v.scrub !== lastScrub) { lastScrub = T.scrub = v.scrub; H.setScrub(); }
      if (v.pinVh !== lastPin)   { lastPin = v.pinVh; H.setPin(v.pinVh); }
    });

    DialKit.createDialKit('Hero \u00b7 light', {
      bloomBase:[T.bloomBase,0,1,0.01], bloomCharge:[T.bloomCharge,0,1,0.01],
      bloomRest:[T.bloomRest,0,1,0.01], bloomScale:[T.bloomScale,0.4,2,0.01],
      shineBand:[22,4,60,1]
    }, { id: 'tgt-hero-light', persist: true }).subscribe(v => {
      T.bloomBase=v.bloomBase; T.bloomCharge=v.bloomCharge;
      T.bloomRest=v.bloomRest; T.bloomScale=v.bloomScale;
      H.shine.style.setProperty('--sband', v.shineBand + '%');
    });

    DialKit.createDialKit('Hero \u00b7 motion', {
      push:[T.push,0,12,0.1], spin:[T.spin,0,60,0.5], oFar:[T.oFar,0.05,1,0.01],
      reveal: { feather:[T.rfeather,0,260,2], frontFlare:[T.frontFlare,0,1,0.01] },
      emitter: { periodMs:[T.emitPeriod,800,6000,50], dist:[T.emitDist,10,140,1],
                 scale:[T.emitScale,0.2,3,0.05], curve:[T.emitCurve,0.6,3,0.05] },
      cardRise:[T.cardRise,0,80,1]
    }, { id: 'tgt-hero-motion', persist: true }).subscribe(v => {
      T.push=v.push; T.spin=v.spin; T.cardRise=v.cardRise; T.oFar=v.oFar;
      T.rfeather=v.reveal.feather; T.frontFlare=v.reveal.frontFlare;
      T.emitPeriod=v.emitter.periodMs; T.emitDist=v.emitter.dist;
      T.emitScale=v.emitter.scale;     T.emitCurve=v.emitter.curve;
    });
  };
  document.head.appendChild(js);
}

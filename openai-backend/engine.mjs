// Pure decision gate. A model supplies observations; code owns candle identity/timing.
export function gate(ai, capturedAt, now, prior) {
  const seconds=ai.secondsToCandleClose;
  const validTime=typeof seconds==='number' && Number.isFinite(seconds) && seconds>0 && seconds<=60;
  const inferred=validTime ? capturedAt+seconds*1000 : 0;
  const identity=`${ai.asset}|${ai.marketType}|${ai.timeframe}`;
  const same=prior && prior.identity===identity && Math.abs(prior.close-inferred)<=1800;
  const close=prior?.close || inferred;
  const mismatch=!!prior && !same;
  const remaining=(close-now)/1000;
  const source=(close-capturedAt)/1000;
  const quality=ai.isQuotexChart===true && ['good','usable'].includes(ai.chartQuality)
    && ai.timeframe==='M1' && ['OTC','REAL'].includes(ai.marketType)
    && typeof ai.asset==='string' && ai.asset.trim() && ai.asset!=='UNKNOWN'
    && ai.targetCandle==='NEXT_CANDLE' && ai.payout>=85;
  const direction=ai.upConfirmation>ai.downConfirmation?'UP':'DOWN';
  const scoresValid=['payout','upConfirmation','downConfirmation','setupScore','endInstabilityScore'].every(k=>typeof ai[k]==='number'&&Number.isFinite(ai[k])&&ai[k]>=0&&ai[k]<=100);
  const strong=scoresValid && quality && Math.max(ai.upConfirmation,ai.downConfirmation)>=70
    && Math.abs(ai.upConfirmation+ai.downConfirmation-100)<=1
    && ai.setupScore>=80 && ai.endInstabilityScore<=45 && ai.confirmations.length>=3;
  const inWindow=validTime && source>=10 && source<=20;
  const count=inWindow && strong && !mismatch
    ? (prior?.direction===direction ? (prior.count||0)+1 : 1) : 0;
  const candidateReady=count>=2 && remaining>=2 && !mismatch;
  return {
    state:{identity,close,direction,count,capturedAt},
    scan:{...ai,secondsToCandleClose:source,effectiveSecondsToCandleClose:remaining,
      candidateReady,candidateDirection:candidateReady?direction:'SKIP',
      targetCandle:'NEXT_CANDLE',sourceCandleKey:`${identity}|${close-60000}`,
      targetCandleKey:`${identity}|${close}`,estimatedCandleCloseAt:close?new Date(close).toISOString():null,
      entryAt:close?new Date(close).toISOString():null,expiresAt:close?new Date(close+60000).toISOString():null,
      capturedAt:new Date(capturedAt).toISOString(),shouldSignalNow:candidateReady&&remaining<=5&&remaining>=2,
      biasState:mismatch?'NO_TRADE':candidateReady?'VERIFIED':'SCANNING',
      fatal:mismatch,reason:mismatch?'Chart or candle changed during scan':!validTime?'Unreadable candle timer':''}
  };
}
